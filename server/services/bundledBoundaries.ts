import { readFileSync } from "fs";
import { join } from "path";

/**
 * Admin levels that GeoBoundaries (and GADM) do NOT serve for a country but
 * which we ship as a pre-simplified GeoJSON in the repo. These are loaded with
 * source="custom".
 *
 * Zambia's Constituency layer (COD-AB ADM3, ~156 features) is one such case:
 * neither GeoBoundaries nor GADM expose a Zambia ADM3, so we bundle a simplified
 * copy sourced from the OCHA Common Operational Dataset (data.humdata.org
 * cod-ab-zmb). Both the seed script and the in-app POST /api/boundaries/fetch
 * endpoint consult this list so production can be restored from the UI without
 * running a script.
 *
 * Keyed by ISO-3 country code → admin levels available on disk.
 */
export interface BundledLevel {
  level: number;
  levelName: string;
  file: string; // path relative to the repo root
}

export const BUNDLED_CUSTOM_LEVELS: Record<string, BundledLevel[]> = {
  ZMB: [
    { level: 3, levelName: "Constituency", file: "data/zambia/zmb_constituencies.geojson" },
  ],
};

/** Returns the bundled-level descriptor for a country/level, if one exists. */
export function getBundledLevel(
  countryCode: string,
  adminLevel: number,
): BundledLevel | undefined {
  return (BUNDLED_CUSTOM_LEVELS[(countryCode || "").toUpperCase()] ?? []).find(
    (l) => l.level === adminLevel,
  );
}

/**
 * Loads a bundled boundary GeoJSON from disk. Returns null when no bundled file
 * is configured for the country/level. Throws if the configured file is missing
 * or empty.
 */
export function loadBundledBoundary(
  countryCode: string,
  adminLevel: number,
): { geojson: any; featureCount: number; levelName: string } | null {
  const lvl = getBundledLevel(countryCode, adminLevel);
  if (!lvl) return null;
  const abs = join(process.cwd(), lvl.file);
  const geojson = JSON.parse(readFileSync(abs, "utf8"));
  const featureCount = Array.isArray(geojson?.features) ? geojson.features.length : 0;
  if (featureCount === 0) {
    throw new Error(`Bundled boundary ${lvl.file} contains no features`);
  }
  return { geojson, featureCount, levelName: lvl.levelName };
}
