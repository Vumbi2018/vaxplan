const EARTH_RADIUS_M = 6378137;
const WORLDPOP_WMS_URL = "https://ogc.worldpop.org/geoserver/wpGlobal/ows";
const WORLDPOP_LAYER = "wpGlobal:ppp_2020_1km_Aggregated";

function project3857(lat: number, lng: number): { x: number; y: number } {
  const x = (lng * Math.PI) / 180 * EARTH_RADIUS_M;
  const clampedLat = Math.max(Math.min(lat, 85.05112878), -85.05112878);
  const y =
    Math.log(Math.tan(Math.PI / 4 + (clampedLat * Math.PI) / 180 / 2)) *
    EARTH_RADIUS_M;
  return { x, y };
}

async function fetchCellValue(
  lat: number,
  lng: number,
  signal: AbortSignal,
): Promise<number | null> {
  const center = project3857(lat, lng);
  const half = 50;
  const params = new URLSearchParams({
    service: "WMS",
    version: "1.3.0",
    request: "GetFeatureInfo",
    layers: WORLDPOP_LAYER,
    query_layers: WORLDPOP_LAYER,
    crs: "EPSG:3857",
    bbox: `${center.x - half},${center.y - half},${center.x + half},${
      center.y + half
    }`,
    width: "1",
    height: "1",
    i: "0",
    j: "0",
    info_format: "application/json",
    feature_count: "1",
  });
  const res = await fetch(`${WORLDPOP_WMS_URL}?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const props = json?.features?.[0]?.properties ?? {};
  const raw =
    props.GRAY_INDEX ??
    props.gray_index ??
    props.PALETTE_INDEX ??
    props.value ??
    null;
  if (raw == null) return null;
  const num = Number(raw);
  if (!isFinite(num) || num < 0) return null;
  return num;
}

export type CatchmentEstimateResult =
  | {
      status: "ok";
      total: number;
      sampledCells: number;
      nodataCells: number;
      errorCells: number;
    }
  | { status: "nodata" }
  | { status: "error"; message: string };

export async function estimateCatchmentPopulation(opts: {
  lat: number;
  lng: number;
  radiusKm: number;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}): Promise<CatchmentEstimateResult> {
  const { lat, lng, radiusKm } = opts;
  if (!isFinite(lat) || !isFinite(lng) || !isFinite(radiusKm) || radiusKm <= 0) {
    return { status: "error", message: "Invalid catchment parameters." };
  }

  // Sample on a 1 km grid that matches the WorldPop pixel size so each
  // sample stands in for one ~1 km² cell of "people per pixel".
  const stepKm = 1;
  const latStepDeg = stepKm / 111;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const lngStepDeg = stepKm / (111 * Math.max(cosLat, 1e-6));
  const n = Math.max(1, Math.ceil(radiusKm / stepKm));

  const points: Array<{ lat: number; lng: number }> = [];
  for (let dy = -n; dy <= n; dy++) {
    for (let dx = -n; dx <= n; dx++) {
      const distKm = Math.hypot(dx * stepKm, dy * stepKm);
      if (distKm > radiusKm) continue;
      points.push({
        lat: lat + dy * latStepDeg,
        lng: lng + dx * lngStepDeg,
      });
    }
  }
  if (points.length === 0) points.push({ lat, lng });

  const signal = opts.signal ?? new AbortController().signal;
  const queue = [...points];
  let done = 0;
  let nodata = 0;
  let errors = 0;
  let total = 0;
  const concurrency = Math.min(6, points.length);

  async function worker() {
    while (queue.length > 0) {
      if (signal.aborted) return;
      const p = queue.shift()!;
      try {
        const v = await fetchCellValue(p.lat, p.lng, signal);
        if (v == null) nodata++;
        else total += v;
      } catch {
        errors++;
      }
      done++;
      opts.onProgress?.(done, points.length);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  if (signal.aborted) {
    return { status: "error", message: "Estimate cancelled." };
  }
  if (errors === points.length) {
    return { status: "error", message: "Couldn't reach WorldPop." };
  }
  const sampledCells = points.length - nodata - errors;
  if (sampledCells === 0) {
    return { status: "nodata" };
  }
  return {
    status: "ok",
    total: Math.round(total),
    sampledCells,
    nodataCells: nodata,
    errorCells: errors,
  };
}
