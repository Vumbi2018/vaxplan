import pg from 'pg';
import { db, pool } from '../server/db';
import { settlementsMaster, populationGrids, candidateUnmappedSettlements, tenants } from '../shared/schema';
import { runMissingSettlementDetection } from '../server/pipeline/settlementEngine';
import { ingestWorldPopRaster } from './ingestWorldPopRaster';
import { eq, and } from 'drizzle-orm';
import { existsSync } from 'fs';
import { join } from 'path';

async function seed() {
  console.log('Starting Settlement Intelligence seeding...');
  const client = await pool.connect();
  
  try {
    // 1. Resolve ZMB tenant by code (UUIDs are environment-specific)
    const tenantRes = await db
      .select()
      .from(tenants)
      .where(eq(tenants.code, 'ZMB'))
      .limit(1);

    if (tenantRes.length === 0) {
      console.error(`Tenant with code 'ZMB' not found in DB! Run 003-seed-zambia.ts first.`);
      process.exit(1);
    }
    const ZMB_TENANT_ID = tenantRes[0].id;
    console.log(`Verified tenant: ${tenantRes[0].name} (${ZMB_TENANT_ID})`);

    // 2. Clear old settlements and grids to prevent duplicate primary keys on re-runs
    console.log('Clearing old mock settlements and population grids for ZMB...');
    await db
      .delete(settlementsMaster)
      .where(and(eq(settlementsMaster.tenantId, ZMB_TENANT_ID), eq(settlementsMaster.source, 'osm_mock')));
    
    await db
      .delete(populationGrids)
      .where(eq(populationGrids.tenantId, ZMB_TENANT_ID));

    await db
      .delete(candidateUnmappedSettlements)
      .where(eq(candidateUnmappedSettlements.tenantId, ZMB_TENANT_ID));

    // 3. Seed some base Master Settlements for ZMB (Southern province / Choma district / Macha ward area)
    // Coordinates around Macha area in Zambia: Lat: -16.42, Lng: 26.96
    console.log('Seeding official mock OSM master settlements...');
    const mockSettlements = [
      {
        name: 'Macha Mission',
        placeType: 'town',
        lat: -16.4182,
        lng: 26.9589,
        pop: 1850,
      },
      {
        name: 'Choma Central',
        placeType: 'town',
        lat: -16.8083,
        lng: 26.9833,
        pop: 12500,
      },
      {
        name: 'Singani Village',
        placeType: 'village',
        lat: -16.4421,
        lng: 26.9932,
        pop: 320,
      }
    ];

    for (const ms of mockSettlements) {
      await db.insert(settlementsMaster).values({
        tenantId: ZMB_TENANT_ID,
        name: ms.name,
        placeType: ms.placeType,
        latitude: ms.lat.toString(),
        longitude: ms.lng.toString(),
        geojson: {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [ms.lng, ms.lat]
          },
          properties: {
            name: ms.name,
            place_type: ms.placeType,
            population_estimate: ms.pop
          }
        },
        provinceName: 'Southern',
        districtName: 'Choma',
        wardName: 'Macha',
        healthCatchment: 'Macha Hospital',
        populationEstimate: ms.pop,
        under5Population: Math.round(ms.pop * 0.18),
        buildingCount: Math.round(ms.pop / 5.2),
        source: 'osm_mock',
        sourceConfidence: '0.95',
        validationStatus: 'approved'
      });
    }
    console.log('Mock official settlements seeded successfully.');

    // 4. Stream the real ZMB WorldPop raster into population_grids.
    const rasterPath = join(process.cwd(), 'Resources', 'zmb_pop_2026_CN_100m_R2025A_v1.tif');
    if (!existsSync(rasterPath)) {
      console.error(`ZMB WorldPop raster missing at ${rasterPath}.`);
      process.exit(1);
    }
    const ingest = await ingestWorldPopRaster({
      tenantId: ZMB_TENANT_ID,
      rasterPath,
      cellPrefix: 'zmb',
      minPopulation: 25,
      under5Fraction: 0.18,
      onProgress: ({ tilesDone, tilesTotal, rowsInserted }) =>
        console.log(`[worldpop:zmb] tile ${tilesDone}/${tilesTotal}, rows=${rowsInserted}`),
    });
    console.log(
      `Ingested ${ingest.rowsInserted} 100m cells from WorldPop ZMB (above-threshold=${ingest.cellsAboveThreshold}).`,
    );

    // 5. Run the Missing Settlement Detection Engine on the seeded data!
    console.log('\n--- TRIGGERING SPATIAL DETECTION ENGINE ---');
    const result = await runMissingSettlementDetection(ZMB_TENANT_ID, {
      populationThreshold: 300,
      buildingThreshold: 5,
      radiusKm: 1.5
    });

    console.log('Engine Result:', JSON.stringify(result, null, 2));

    // 6. Verify candidates are stored in DB
    const candidatesRes = await db
      .select()
      .from(candidateUnmappedSettlements)
      .where(eq(candidateUnmappedSettlements.tenantId, ZMB_TENANT_ID));

    console.log(`\nVerified database candidates: found ${candidatesRes.length} items.`);
    candidatesRes.forEach((c) => {
      console.log(`- Candidate ID ${c.id}: lat=${c.latitude}, lng=${c.longitude}, estPopulation=${c.estimatedPopulation}, nearestFacility=${c.nearestFacility}, distanceToFacility=${c.distanceToFacility}km`);
    });

    console.log('\nSettlement Intelligence seeding and detection test successfully verified!');
  } catch (err: any) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
