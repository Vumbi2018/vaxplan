/**
 * Seed the `admin_boundaries` table from GeoBoundaries for one or more tenants.
 *
 * The interactive map (and the dashboard layer toggles) render administrative
 * outlines from the `admin_boundaries` table — one row per (tenant, admin level)
 * holding a full GeoJSON FeatureCollection. This is the SAME data path the
 * national-admin "Boundary Manager → Import Boundaries" UI uses
 * (`POST /api/boundaries/fetch`). This script just runs that fetch for every
 * available admin level of a tenant in one shot, which is handy for
 * development / re-seeding.
 *
 * NOTE: this is distinct from scripts/seed-admin-polygons.ts, which fills the
 * separate `provinces.coordinates` / `districts.coordinates` columns. Those do
 * NOT drive the map; admin_boundaries does.
 *
 * Idempotent: upsertAdminBoundary replaces the row for an existing
 * (tenant, adminLevel), so re-running refreshes geometry without duplicating.
 *
 * Levels fetched come from SUPPORTED_COUNTRIES[code].maxLevel (0..maxLevel),
 * with level names from the same table (e.g. ZMB → Country / Province /
 * District / Ward).
 *
 * Usage:
 *   tsx scripts/seed-admin-boundaries.ts ZMB            # one tenant
 *   tsx scripts/seed-admin-boundaries.ts ZMB SSD PNG    # several
 */
import { db } from "../server/db";
import { tenants } from "../shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../server/storage";
import {
  fetchGeoBoundariesGeoJSON,
  calcBBox,
  SUPPORTED_COUNTRIES,
} from "../server/services/geoBoundariesService";
import {
  BUNDLED_CUSTOM_LEVELS,
  loadBundledBoundary,
} from "../server/services/bundledBoundaries";

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
  const countryCode = (tenant.countryCode || "").toUpperCase();
  console.log(`  Tenant: ${tenant.name} (${countryCode})`);

  const country = SUPPORTED_COUNTRIES.find((c) => c.code === countryCode);
  if (!country) {
    console.warn(
      `  Country ${countryCode} not in SUPPORTED_COUNTRIES — cannot resolve admin levels. Skipping.`,
    );
    return;
  }

  const customLevels = BUNDLED_CUSTOM_LEVELS[countryCode] ?? [];
  const customLevelSet = new Set(customLevels.map((c) => c.level));

  for (let level = 0; level <= country.maxLevel; level++) {
    // Levels we ship as a bundled file are loaded below — don't waste a
    // round-trip on GeoBoundaries (which doesn't serve them anyway).
    if (customLevelSet.has(level)) continue;
    const levelName = country.levelNames[level] ?? `Level ${level}`;
    try {
      console.log(`  Fetching ADM${level} (${levelName}) from GeoBoundaries…`);
      const { geojson, featureCount } = await fetchGeoBoundariesGeoJSON(
        countryCode,
        level,
      );
      const bbox = calcBBox(geojson);
      await storage.upsertAdminBoundary({
        tenantId: tenant.id,
        countryCode,
        adminLevel: level,
        levelName,
        source: "geoboundaries",
        geojson: geojson as any,
        featureCount,
        bbox: (bbox ?? undefined) as any,
        isActive: true,
      });
      console.log(`    ✓ ADM${level} stored (${featureCount} features)`);
    } catch (err: any) {
      console.warn(
        `    ✗ ADM${level} (${levelName}) failed: ${err?.message ?? err}`,
      );
    }
  }

  // ── Bundled custom levels (e.g. Zambia Constituency from OCHA COD) ────────
  for (const { level, levelName, file } of customLevels) {
    try {
      console.log(`  Loading ADM${level} (${levelName}) from ${file}…`);
      const loaded = loadBundledBoundary(countryCode, level);
      if (!loaded) throw new Error("no bundled file configured");
      const { geojson, featureCount } = loaded;
      const bbox = calcBBox(geojson);
      await storage.upsertAdminBoundary({
        tenantId: tenant.id,
        countryCode,
        adminLevel: level,
        levelName,
        source: "custom",
        geojson: geojson as any,
        featureCount,
        bbox: (bbox ?? undefined) as any,
        isActive: true,
      });
      console.log(`    ✓ ADM${level} stored (${featureCount} features, custom)`);
    } catch (err: any) {
      console.warn(
        `    ✗ ADM${level} (${levelName}) custom load failed: ${err?.message ?? err}`,
      );
    }
  }
}

async function main() {
  const codes = process.argv.slice(2);
  if (!codes.length) {
    console.error("Usage: tsx scripts/seed-admin-boundaries.ts <TENANT_CODE> [more…]");
    process.exit(1);
  }

  console.log(`Seeding admin_boundaries for tenants: ${codes.join(", ")}`);
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
