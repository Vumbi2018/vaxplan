/**
 * South Sudan Settlement Intelligence seed. Mirrors the PNG / ZMB seeds:
 *   - Streams the real WorldPop 100m raster
 *     (Resources/ssd_pop_2026_CN_100m_R2025A_v1.tif) into population_grids
 *     for the SSD tenant via the shared ingestWorldPopRaster ETL.
 *   - Clears prior pending candidates for the tenant.
 *   - Runs runMissingSettlementDetection() and reports the resulting
 *     zero-dose candidate clusters.
 *
 * Run with:  tsx scripts/seed-settlement-intelligence-ssd.ts
 */
import { db, pool } from '../server/db';
import { candidateUnmappedSettlements, tenants } from '../shared/schema';
import { runMissingSettlementDetection } from '../server/pipeline/settlementEngine';
import { ingestWorldPopRaster } from './ingestWorldPopRaster';
import { eq } from 'drizzle-orm';
import { existsSync, statSync } from 'fs';
import { join } from 'path';

async function seed() {
  console.log('Starting SSD Settlement Intelligence seeding...');
  const client = await pool.connect();
  try {
    const rasterPath = join(process.cwd(), 'Resources', 'ssd_pop_2026_CN_100m_R2025A_v1.tif');
    if (!existsSync(rasterPath)) {
      console.error(`SSD WorldPop raster missing at ${rasterPath}.`);
      process.exit(1);
    }
    const sizeMb = (statSync(rasterPath).size / (1024 * 1024)).toFixed(2);
    console.log(`Found SSD WorldPop raster: ${rasterPath} (${sizeMb} MB)`);

    const tenantRes = await db
      .select()
      .from(tenants)
      .where(eq(tenants.code, 'SSD'))
      .limit(1);
    if (tenantRes.length === 0) {
      console.error("Tenant with code 'SSD' not found. Run 004-seed-south-sudan.ts first.");
      process.exit(1);
    }
    const SSD_TENANT_ID = tenantRes[0].id;
    console.log(`Verified tenant: ${tenantRes[0].name} (${SSD_TENANT_ID})`);

    await db
      .delete(candidateUnmappedSettlements)
      .where(eq(candidateUnmappedSettlements.tenantId, SSD_TENANT_ID));

    const ingest = await ingestWorldPopRaster({
      tenantId: SSD_TENANT_ID,
      rasterPath,
      cellPrefix: 'ssd',
      minPopulation: 25,
      under5Fraction: 0.17,
      onProgress: ({ tilesDone, tilesTotal, rowsInserted }) =>
        console.log(`[worldpop:ssd] tile ${tilesDone}/${tilesTotal}, rows=${rowsInserted}`),
    });
    console.log(
      `Ingested ${ingest.rowsInserted} 100m cells from WorldPop SSD (above-threshold=${ingest.cellsAboveThreshold}).`,
    );

    console.log('\n--- TRIGGERING SPATIAL DETECTION ENGINE (SSD) ---');
    const result = await runMissingSettlementDetection(SSD_TENANT_ID, {
      populationThreshold: 50,
      buildingThreshold: 5,
      radiusKm: 1.5,
    });
    console.log('Engine Result:', JSON.stringify(result, null, 2));

    const candidatesRes = await db
      .select()
      .from(candidateUnmappedSettlements)
      .where(eq(candidateUnmappedSettlements.tenantId, SSD_TENANT_ID));
    console.log(`\nVerified database candidates: found ${candidatesRes.length} items.`);

    console.log('\nSSD settlement intelligence seeding and detection completed.');
  } catch (err: any) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
