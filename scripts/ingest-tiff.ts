/**
 * ingest-tiff.ts  — Admin CLI to ingest (or re-ingest) a GeoTIFF population raster
 *
 * The TIFF files are already on disk in Resources/. This script streams the chosen
 * raster into the population_grids table for the given tenant.
 *
 * Usage:
 *   npx tsx scripts/ingest-tiff.ts ZMB                         # use default path
 *   npx tsx scripts/ingest-tiff.ts ZMB Resources/zmb_pop_2026_CN_100m_R2025A_v1.tif
 *   npx tsx scripts/ingest-tiff.ts ZMB Resources/zmb_pop_2026_CN_100m_R2025A_v1.tif 25
 *
 * Arguments:
 *   1. tenantCode  — e.g. ZMB, PNG, SSD
 *   2. rasterPath  — path to the .tif file (defaults to Resources/<iso>_pop_2026_CN_100m_R2025A_v1.tif)
 *   3. minPop      — minimum population to include per cell (default: 25)
 *
 * Tip: Set the tenant's custom raster path in the DB so the scheduler picks up your
 *      new file automatically:
 *
 *   UPDATE tenants
 *   SET settings = settings || '{"populationRasterPath":"Resources/zmb_custom_2025.tif"}'::jsonb
 *   WHERE code = 'ZMB';
 *
 * After running this, the WorldPop proxy (/api/population/worldpop-point) will
 * serve population estimates from the local DB instead of calling the remote API.
 */

import { existsSync, statSync } from "fs";
import { ingestWorldPopRaster } from "./ingestWorldPopRaster";
import { pool } from "../server/db";
import { db } from "../server/db";
import { tenants } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  const [, , tenantCodeArg, rasterArg, minPopArg] = process.argv;

  if (!tenantCodeArg) {
    console.error(
      "Usage: npx tsx scripts/ingest-tiff.ts <TENANT_CODE> [rasterPath] [minPop]"
    );
    console.error("\nAvailable tenants:");
    const rows = await db.select({ code: tenants.code, name: tenants.name }).from(tenants);
    for (const r of rows) console.error(`  ${r.code}  —  ${r.name}`);
    process.exit(1);
  }

  const code = tenantCodeArg.toUpperCase();
  const tenantRows = await db
    .select()
    .from(tenants)
    .where(eq(tenants.code, code))
    .limit(1);

  if (tenantRows.length === 0) {
    console.error(`❌  No tenant with code '${code}' found.`);
    process.exit(1);
  }
  const tenant = tenantRows[0];

  // Resolve raster path: CLI arg → tenant settings override → convention
  const settings = (tenant.settings ?? {}) as Record<string, unknown>;
  const defaultPath = `Resources/${code.toLowerCase()}_pop_2026_CN_100m_R2025A_v1.tif`;
  const rasterPath: string =
    rasterArg ??
    (typeof settings.populationRasterPath === "string" && settings.populationRasterPath.length > 0
      ? settings.populationRasterPath
      : defaultPath);

  const minPopulation = minPopArg ? parseInt(minPopArg, 10) : 25;

  if (!existsSync(rasterPath)) {
    console.error(`❌  Raster file not found: ${rasterPath}`);
    console.error(
      `   Available TIFFs in Resources/:`,
    );
    const { readdirSync } = await import("fs");
    const files = readdirSync("Resources").filter((f) => f.endsWith(".tif"));
    for (const f of files) {
      const mb = (statSync(`Resources/${f}`).size / 1024 / 1024).toFixed(1);
      console.error(`     Resources/${f}  (${mb} MB)`);
    }
    process.exit(1);
  }

  const mb = (statSync(rasterPath).size / 1024 / 1024).toFixed(1);
  console.log(`\n🗺️   Ingesting TIFF for ${tenant.name} (${tenant.code})`);
  console.log(`   File      : ${rasterPath}  (${mb} MB)`);
  console.log(`   Min pop   : ${minPopulation} persons / cell`);
  console.log(`   Tenant ID : ${tenant.id}`);
  console.log(`\n   ⏳  Streaming raster tiles into population_grids …\n`);

  const startMs = Date.now();
  const result = await ingestWorldPopRaster({
    tenantId: tenant.id,
    rasterPath,
    cellPrefix: code.toLowerCase(),
    minPopulation,
    truncateExisting: true,
    onProgress({ tilesDone, tilesTotal, rowsInserted }) {
      const pct = ((tilesDone / tilesTotal) * 100).toFixed(1);
      process.stdout.write(
        `\r   Tiles: ${tilesDone}/${tilesTotal} (${pct}%)   Rows inserted: ${rowsInserted}   `
      );
    },
    progressEvery: 10,
  });

  const sec = ((Date.now() - startMs) / 1000).toFixed(1);
  console.log(`\n\n✅  Done in ${sec}s`);
  console.log(`   Cells scanned      : ${result.cellsScanned.toLocaleString()}`);
  console.log(`   Above threshold    : ${result.cellsAboveThreshold.toLocaleString()}`);
  console.log(`   Rows inserted      : ${result.rowsInserted.toLocaleString()}`);
  console.log(
    `\n   The WorldPop proxy (/api/population/worldpop-point) will now serve`
  );
  console.log(`   population data from this local TIFF for tenant ${code}.\n`);

  await pool.end();
}

main().catch((err) => {
  console.error("❌  Fatal:", err);
  process.exit(1);
});
