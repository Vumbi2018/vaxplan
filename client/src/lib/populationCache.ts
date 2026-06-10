const STORAGE_KEY = "vaxplan.worldpop.cache.v1";
const MAX_ENTRIES = 5000;
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const KEY_PRECISION = 4;

export type CachedPopulation = {
  value: number;
  cachedAt: number;
};

type CacheShape = Record<string, CachedPopulation>;

function roundKey(lat: number, lng: number): string {
  const f = Math.pow(10, KEY_PRECISION);
  const rLat = Math.round(lat * f) / f;
  const rLng = Math.round(lng * f) / f;
  return `${rLat.toFixed(KEY_PRECISION)},${rLng.toFixed(KEY_PRECISION)}`;
}

function readAll(): CacheShape {
  try {
    if (typeof localStorage === "undefined") return {};
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as CacheShape;
    return {};
  } catch {
    return {};
  }
}

function writeAll(data: CacheShape): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // quota / private mode — silently ignore
  }
}

export function getCachedPopulation(lat: number, lng: number): CachedPopulation | null {
  const key = roundKey(lat, lng);
  const all = readAll();
  const hit = all[key];
  if (!hit) return null;
  if (Date.now() - hit.cachedAt > TTL_MS) {
    delete all[key];
    writeAll(all);
    return null;
  }
  return hit;
}

export function setCachedPopulation(lat: number, lng: number, value: number): void {
  if (!isFinite(value) || value < 0) return;
  const key = roundKey(lat, lng);
  const all = readAll();
  all[key] = { value, cachedAt: Date.now() };

  const keys = Object.keys(all);
  if (keys.length > MAX_ENTRIES) {
    const sorted = keys
      .map((k) => [k, all[k].cachedAt] as const)
      .sort((a, b) => a[1] - b[1]);
    const toDrop = sorted.length - MAX_ENTRIES;
    for (let i = 0; i < toDrop; i++) delete all[sorted[i][0]];
  }
  writeAll(all);
}
