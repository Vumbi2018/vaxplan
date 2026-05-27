/**
 * Seed province / district polygons from GeoBoundaries onto the existing
 * `provinces.coordinates` and `districts.coordinates` jsonb columns.
 *
 * Hierarchy rows already exist (created by 006-seed-png.ts and friends) but
 * their geometry columns are empty. This one-shot script fetches ADM1 + ADM2
 * GeoJSON from the existing GeoBoundaries service and joins features onto
 * province / district rows by normalised name.
 *
 * Idempotent: re-running overwrites coordinates with the freshest match and
 * leaves unmatched rows untouched (with a clear warning).
 *
 * Usage:
 *   tsx scripts/seed-admin-polygons.ts                 # default: PNG
 *   tsx scripts/seed-admin-polygons.ts PNG ZMB SSD     # any tenant codes
 */
import { db } from "../server/db";
import { tenants, provinces, districts } from "../shared/schema";
import { eq, and } from "drizzle-orm";
import {
  fetchGeoBoundariesGeoJSON,
  type GeoJSONFeature,
} from "../server/services/geoBoundariesService";

function normalizeName(raw: string | null | undefined): string {
  if (!raw) return "";
  return String(raw)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(province|provincial|district|region|state|county|llg|ward|capital)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function featureName(f: GeoJSONFeature): string {
  const p = f.properties || {};
  return (
    p.shapeName ||
    p.name ||
    p.NAME ||
    p.NAME_1 ||
    p.NAME_2 ||
    p.ADM1_EN ||
    p.ADM2_EN ||
    ""
  );
}

function buildFeatureIndex(features: GeoJSONFeature[]): Map<string, GeoJSONFeature> {
  const idx = new Map<string, GeoJSONFeature>();
  for (const f of features) {
    const norm = normalizeName(featureName(f));
    if (norm && !idx.has(norm)) idx.set(norm, f);
  }
  return idx;
}

async function seedForTenant(tenantCode: string) {
  console.log(`\n── ${tenantCode} ──`);

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.code, tenantCode.toUpperCase()));
  if (!tenant) {
    console.warn(`  Tenant ${tenantCode} not found — skipping.`);
    return;
  }
  const tenantId = tenant.id;
  const countryCode = tenant.countryCode;
  console.log(`  Tenant: ${tenant.name} (${countryCode})`);

  // ── ADM1 → provinces ──────────────────────────────────────────────
  console.log(`  Fetching ADM1 from GeoBoundaries…`);
  const { geojson: adm1, featureCount: adm1Count } = await fetchGeoBoundariesGeoJSON(
    countryCode,
    1,
  );
  console.log(`  ADM1 features: ${adm1Count}`);
  const provIdx = buildFeatureIndex(adm1.features);

  const provRows = await db
    .select()
    .from(provinces)
    .where(eq(provinces.tenantId, tenantId));
  console.log(`  Provinces in DB: ${provRows.length}`);

  let provMatched = 0;
  const unmatchedProv: string[] = [];
  for (const p of provRows) {
    const norm = normalizeName(p.name);
    const f = provIdx.get(norm);
    if (!f) {
      unmatchedProv.push(p.name);
      continue;
    }
    await db
      .update(provinces)
      .set({ coordinates: f.geometry as any })
      .where(and(eq(provinces.id, p.id), eq(provinces.tenantId, tenantId)));
    provMatched++;
  }
  console.log(`  Provinces matched: ${provMatched}/${provRows.length}`);
  if (unmatchedProv.length) {
    console.warn(`  Unmatched provinces (left untouched): ${unmatchedProv.join(", ")}`);
  }

  // ── ADM2 → districts ──────────────────────────────────────────────
  console.log(`  Fetching ADM2 from GeoBoundaries…`);
  const { geojson: adm2, featureCount: adm2Count } = await fetchGeoBoundariesGeoJSON(
    countryCode,
    2,
  );
  console.log(`  ADM2 features: ${adm2Count}`);
  const distIdx = buildFeatureIndex(adm2.features);

  const distRows = await db
    .select()
    .from(districts)
    .where(eq(districts.tenantId, tenantId));
  console.log(`  Districts in DB: ${distRows.length}`);

  let distMatched = 0;
  const unmatchedDist: string[] = [];
  for (const d of distRows) {
    const norm = normalizeName(d.name);
    const f = distIdx.get(norm);
    if (!f) {
      unmatchedDist.push(d.name);
      continue;
    }
    await db
      .update(districts)
      .set({ coordinates: f.geometry as any })
      .where(and(eq(districts.id, d.id), eq(districts.tenantId, tenantId)));
    distMatched++;
  }
  console.log(`  Districts matched: ${distMatched}/${distRows.length}`);
  if (unmatchedDist.length) {
    console.warn(
      `  Unmatched districts (left untouched, ${unmatchedDist.length}): ${unmatchedDist
        .slice(0, 20)
        .join(", ")}${unmatchedDist.length > 20 ? ", …" : ""}`,
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const codes = args.length ? args : ["PNG"];

  console.log(`Seeding admin polygons for tenants: ${codes.join(", ")}`);

  for (const code of codes) {
    try {
      await seedForTenant(code);
    } catch (err: any) {
      console.error(`  Failed for ${code}: ${err?.message ?? err}`);
    }
  }

  console.log("\nDone.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
