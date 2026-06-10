/**
 * PNG Settlement Intelligence seed (mirrors scripts/seed-settlement-intelligence.ts
 * for the ZMB tenant). Seeds:
 *   - Master settlements around three real PNG hotspots (Port Moresby, Goroka,
 *     Mount Hagen) drawn from the NSO MFL footprint already loaded into the
 *     PNG tenant.
 *   - Mock 100m WorldPop-style population grid cells around those settlements
 *     plus a couple of intentionally unmapped clusters to exercise the
 *     missing-settlement detection engine.
 *   - Runs runMissingSettlementDetection() against the PNG tenant and prints
 *     the candidates that fall out.
 *
 * Companion raster: Resources/png_pop_2026_CN_100m_R2025A_v1.tif (WorldPop 2026).
 * The detection engine consumes the seeded population_grids rows; this script
 * verifies the file is present so a future ETL can stream-decode it without
 * extra wiring.
 *
 * Run with:  tsx scripts/seed-settlement-intelligence-png.ts
 */
import { db, pool } from '../server/db';
import {
  settlementsMaster,
  populationGrids,
  candidateUnmappedSettlements,
  tenants,
} from '../shared/schema';
import { runMissingSettlementDetection } from '../server/pipeline/settlementEngine';
import { ingestWorldPopRaster } from './ingestWorldPopRaster';
import { eq, and } from 'drizzle-orm';
import { existsSync, statSync } from 'fs';
import { join } from 'path';

async function seed() {
  console.log('Starting PNG Settlement Intelligence seeding...');
  const client = await pool.connect();

  try {
    // 0. Verify the PNG WorldPop raster is present (large file, kept under Resources/).
    const rasterPath = join(process.cwd(), 'Resources', 'png_pop_2026_CN_100m_R2025A_v1.tif');
    if (existsSync(rasterPath)) {
      const sizeMb = (statSync(rasterPath).size / (1024 * 1024)).toFixed(2);
      console.log(`Found PNG WorldPop raster: ${rasterPath} (${sizeMb} MB)`);
    } else {
      console.warn(`PNG WorldPop raster NOT found at ${rasterPath}. Seeded grids will still`
        + ' work but no GeoTIFF-derived cells will be added.');
    }

    // 1. Resolve PNG tenant.
    const tenantRes = await db
      .select()
      .from(tenants)
      .where(eq(tenants.code, 'PNG'))
      .limit(1);

    if (tenantRes.length === 0) {
      console.error(`Tenant with code 'PNG' not found. Run 001-multitenant-backfill.ts + 006-seed-png.ts first.`);
      process.exit(1);
    }
    const PNG_TENANT_ID = tenantRes[0].id;
    console.log(`Verified tenant: ${tenantRes[0].name} (${PNG_TENANT_ID})`);

    // 2. Clear prior PNG mock settlements / grids / candidates so re-runs converge.
    console.log('Clearing prior PNG mock settlements / grids / candidates...');
    await db
      .delete(settlementsMaster)
      .where(and(eq(settlementsMaster.tenantId, PNG_TENANT_ID), eq(settlementsMaster.source, 'osm_mock')));
    await db
      .delete(populationGrids)
      .where(eq(populationGrids.tenantId, PNG_TENANT_ID));
    await db
      .delete(candidateUnmappedSettlements)
      .where(eq(candidateUnmappedSettlements.tenantId, PNG_TENANT_ID));

    // 3. Master settlements — three real PNG urban anchors.
    console.log('Seeding mock OSM master settlements (Port Moresby / Goroka / Mount Hagen)...');
    const mockSettlements = [
      {
        name: 'Port Moresby (Gerehu)',
        placeType: 'suburb',
        provinceName: 'National Capital District',
        districtName: 'Motu-Koita',
        wardName: 'Gerehu',
        healthCatchment: 'Port Moresby General Hospital',
        lat: -9.4123,
        lng: 147.1581,
        pop: 38500,
      },
      {
        name: 'Goroka Town',
        placeType: 'town',
        provinceName: 'Eastern Highlands',
        districtName: 'Goroka',
        wardName: 'Goroka Urban',
        healthCatchment: 'Goroka Base Hospital',
        lat: -6.0833,
        lng: 145.3833,
        pop: 25100,
      },
      {
        name: 'Mount Hagen Central',
        placeType: 'town',
        provinceName: 'Western Highlands',
        districtName: 'Mount Hagen',
        wardName: 'Hagen Central',
        healthCatchment: 'Mount Hagen Provincial Hospital',
        lat: -5.8597,
        lng: 144.2306,
        pop: 47200,
      },
    ];

    for (const ms of mockSettlements) {
      await db.insert(settlementsMaster).values({
        tenantId: PNG_TENANT_ID,
        name: ms.name,
        placeType: ms.placeType,
        latitude: ms.lat.toString(),
        longitude: ms.lng.toString(),
        geojson: {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [ms.lng, ms.lat] },
          properties: {
            name: ms.name,
            place_type: ms.placeType,
            population_estimate: ms.pop,
          },
        },
        provinceName: ms.provinceName,
        districtName: ms.districtName,
        wardName: ms.wardName,
        healthCatchment: ms.healthCatchment,
        populationEstimate: ms.pop,
        under5Population: Math.round(ms.pop * 0.16),
        buildingCount: Math.round(ms.pop / 5.5),
        source: 'osm_mock',
        sourceConfidence: '0.95',
        validationStatus: 'approved',
      });
    }
    console.log(`Seeded ${mockSettlements.length} master settlements.`);

    // 4. Stream the WorldPop 100m raster into population_grids.
    if (!existsSync(rasterPath)) {
      console.error(`Raster missing at ${rasterPath}; cannot ingest population grid.`);
      process.exit(1);
    }
    const ingest = await ingestWorldPopRaster({
      tenantId: PNG_TENANT_ID,
      rasterPath,
      cellPrefix: 'png',
      minPopulation: 25,
      onProgress: ({ tilesDone, tilesTotal, rowsInserted }) =>
        console.log(`[worldpop:png] tile ${tilesDone}/${tilesTotal}, rows=${rowsInserted}`),
    });
    console.log(
      `Ingested ${ingest.rowsInserted} 100m cells from WorldPop (above threshold of ${ingest.cellsAboveThreshold}).`,
    );

    // 5. Trigger the detection engine. Use a high pop threshold so the engine's
    //    per-candidate spatial queries stay tractable while still surfacing
    //    nationally-meaningful unmapped clusters.
    console.log('\n--- TRIGGERING SPATIAL DETECTION ENGINE (PNG) ---');
    const result = await runMissingSettlementDetection(PNG_TENANT_ID, {
      populationThreshold: 50,
      buildingThreshold: 5,
      radiusKm: 1.5,
    });
    console.log('Engine Result:', JSON.stringify(result, null, 2));

    // 6. Verify candidates.
    const candidatesRes = await db
      .select()
      .from(candidateUnmappedSettlements)
      .where(eq(candidateUnmappedSettlements.tenantId, PNG_TENANT_ID));

    console.log(`\nVerified database candidates: found ${candidatesRes.length} items.`);
    candidatesRes.forEach((c) => {
      console.log(`- Candidate ID ${c.id}: lat=${c.latitude}, lng=${c.longitude}, estPopulation=${c.estimatedPopulation}, nearestFacility=${c.nearestFacility}, distanceToFacility=${c.distanceToFacility}km`);
    });

    console.log('\nPNG settlement intelligence seeding and detection completed.');
  } catch (err: any) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
