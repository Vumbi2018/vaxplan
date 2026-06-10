import { getCachedPopulation, setCachedPopulation } from "./populationCache";

const EARTH_RADIUS_M = 6378137;

// Re-enabled: using server-side proxy that tries WOPR → WorldPop Stats → local DB
const WORLDPOP_LIVE_LOOKUPS_ENABLED = true;

function project3857(lat: number, lng: number): { x: number; y: number } {
  const x = (lng * Math.PI) / 180 * EARTH_RADIUS_M;
  const clampedLat = Math.max(Math.min(lat, 85.05112878), -85.05112878);
  const y =
    Math.log(Math.tan(Math.PI / 4 + (clampedLat * Math.PI) / 180 / 2)) *
    EARTH_RADIUS_M;
  return { x, y };
}

// Fetch a point population estimate via our server-side proxy.
// The proxy tries (in order): local DB → WOPR API → WorldPop Stats API.
// Returns people/km² so the caller can scale to the cell area.
async function fetchCellValue(
  lat: number,
  lng: number,
  signal: AbortSignal,
  radiusKm = 1,
): Promise<number | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radiusKm: String(radiusKm),
    iso3: "ZMB",
  });
  const res = await fetch(`/api/population/worldpop-point?${params}`, { signal, credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json() as any;
  const pop = data?.gridPop ?? 0;
  return pop > 0 ? pop : null;
}

export type CatchmentCell = {
  lat: number;
  lng: number;
  latStepDeg: number;
  lngStepDeg: number;
  status: "ok" | "nodata" | "error";
  value?: number;
  cached?: boolean;
};

export type CatchmentEstimateResult =
  | {
      status: "ok";
      total: number;
      sampledCells: number;
      cachedCells: number;
      liveCells: number;
      nodataCells: number;
      errorCells: number;
      partial: boolean;
      offline: boolean;
      cells: CatchmentCell[];
    }
  | { status: "nodata"; cells: CatchmentCell[] }
  | { status: "error"; message: string; offline?: boolean; cells?: CatchmentCell[] };

// Main export: estimate population for a catchment circle.
// Strategy: for each 1km grid cell in the circle, check local cache first;
// then call the server proxy for live data. All cells are fetched concurrently
// (up to 6 at a time) for speed.
export async function estimateCatchmentPopulation(opts: {
  lat: number;
  lng: number;
  radiusKm: number;
  villageId?: number;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
  onCell?: (cell: CatchmentCell, index: number) => void;
}): Promise<CatchmentEstimateResult> {
  const { lat, lng, radiusKm } = opts;
  if (!isFinite(lat) || !isFinite(lng) || !isFinite(radiusKm) || radiusKm <= 0) {
    return { status: "error", message: "Invalid catchment parameters." };
  }

  // If we have a villageId, try the polygon/radius endpoint first (fast path)
  if (opts.villageId || true) {
    try {
      const res = await fetch("/api/population/estimate-polygon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          villageId: opts.villageId,
          latitude: lat,
          longitude: lng,
          radiusKm,
        }),
        signal: opts.signal,
      });
      if (res.ok) {
        const data = await res.json() as any;
        const cells: CatchmentCell[] = (data.cells || []).map((c: any) => ({
          lat: c.lat,
          lng: c.lng,
          latStepDeg: c.latStepDeg ?? 0.009,
          lngStepDeg: c.lngStepDeg ?? 0.009,
          status: "ok" as const,
          value: c.value,
        }));

        if (opts.onProgress) opts.onProgress(cells.length, cells.length);
        if (opts.onCell) cells.forEach((cell, idx) => opts.onCell?.(cell, idx));

        const totalPop = data.totalPopulation ?? 0;

        // If local DB had data, return it
        if (totalPop > 0) {
          return {
            status: "ok",
            total: totalPop,
            sampledCells: cells.length || 1,
            cachedCells: cells.length,
            liveCells: 0,
            nodataCells: 0,
            errorCells: 0,
            partial: false,
            offline: false,
            cells,
          };
        }
      }
    } catch (e: any) {
      if (e.name === "AbortError") return { status: "error", message: "Estimate cancelled.", cells: [] };
      // fall through to cell-by-cell scan
    }
  }

  // Cell-by-cell scan using proxy (covers areas not in local DB)
  const stepKm = radiusKm <= 2 ? 0.5 : 1;
  const latStepDeg = stepKm / 111;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const lngStepDeg = stepKm / (111 * Math.max(cosLat, 1e-6));
  const n = Math.max(1, Math.ceil(radiusKm / stepKm));

  const cells: CatchmentCell[] = [];
  for (let dy = -n; dy <= n; dy++) {
    for (let dx = -n; dx <= n; dx++) {
      const distKm = Math.hypot(dx * stepKm, dy * stepKm);
      if (distKm > radiusKm) continue;
      cells.push({
        lat: lat + dy * latStepDeg,
        lng: lng + dx * lngStepDeg,
        latStepDeg,
        lngStepDeg,
        status: "nodata",
      });
    }
  }
  if (cells.length === 0) {
    cells.push({ lat, lng, latStepDeg, lngStepDeg, status: "nodata" });
  }

  const offline =
    !WORLDPOP_LIVE_LOOKUPS_ENABLED ||
    (typeof navigator !== "undefined" && navigator.onLine === false);
  const signal = opts.signal ?? new AbortController().signal;
  const queue: number[] = cells.map((_, i) => i);
  let done = 0;
  let nodata = 0;
  let errors = 0;
  let cachedCells = 0;
  let liveCells = 0;
  let total = 0;
  const concurrency = Math.min(4, cells.length);

  async function worker() {
    while (queue.length > 0) {
      if (signal.aborted) return;
      const idx = queue.shift()!;
      const c = cells[idx];
      const cached = getCachedPopulation(c.lat, c.lng);
      if (cached) {
        c.status = "ok";
        c.value = cached.value;
        c.cached = true;
        total += cached.value;
        cachedCells++;
      } else if (offline) {
        c.status = "error";
        errors++;
      } else {
        try {
          // Each cell covers ~stepKm radius — fetch via proxy for that cell center
          const v = await fetchCellValue(c.lat, c.lng, signal, stepKm);
          if (v == null || v === 0) {
            c.status = "nodata";
            nodata++;
          } else {
            c.status = "ok";
            c.value = v;
            total += v;
            liveCells++;
            setCachedPopulation(c.lat, c.lng, v);
          }
        } catch {
          c.status = "error";
          errors++;
        }
      }
      done++;
      opts.onCell?.(c, idx);
      opts.onProgress?.(done, cells.length);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  if (signal.aborted) {
    return { status: "error", message: "Estimate cancelled.", cells };
  }

  // If cell scan also found nothing, do one aggressive whole-catchment lookup
  if (cachedCells + liveCells === 0 && !offline) {
    try {
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radiusKm: String(radiusKm),
        iso3: "ZMB",
      });
      const r = await fetch(`/api/population/worldpop-point?${params}`, { credentials: "include" });
      if (r.ok) {
        const d = await r.json() as any;
        const pop = d?.gridPop ?? 0;
        if (pop > 0) {
          // Synthesise one virtual cell for the whole catchment
          const synth: CatchmentCell = { lat, lng, latStepDeg, lngStepDeg, status: "ok", value: pop };
          return {
            status: "ok",
            total: pop,
            sampledCells: 1,
            cachedCells: 0,
            liveCells: 1,
            nodataCells: 0,
            errorCells: 0,
            partial: false,
            offline: false,
            cells: [synth],
          };
        }
      }
    } catch (_) {
      // swallow
    }
    return { status: "nodata", cells };
  }

  const sampledCells = cachedCells + liveCells;
  return {
    status: sampledCells > 0 ? "ok" : "nodata",
    total: Math.round(total),
    sampledCells,
    cachedCells,
    liveCells,
    nodataCells: nodata,
    errorCells: errors,
    partial: errors > 0,
    offline,
    cells,
  } as CatchmentEstimateResult;
}
