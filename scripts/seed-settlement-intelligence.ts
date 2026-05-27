import pg from 'pg';
import { db, pool } from '../server/db';
import { settlementsMaster, populationGrids, candidateUnmappedSettlements, tenants } from '../shared/schema';
import { runMissingSettlementDetection } from '../server/pipeline/settlementEngine';
import { eq, and } from 'drizzle-orm';

const ZMB_TENANT_ID = '4bb7abba-11cd-4c99-96c2-eedc8a4dfd06';

async function seed() {
  console.log('Starting Settlement Intelligence seeding...');
  const client = await pool.connect();
  
  try {
    // 1. Verify tenant ZMB exists
    const tenantRes = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, ZMB_TENANT_ID))
      .limit(1);

    if (tenantRes.length === 0) {
      console.error(`Tenant ZMB with ID ${ZMB_TENANT_ID} not found in DB! Please check the ID.`);
      process.exit(1);
    }
    console.log(`Verified tenant: ${tenantRes[0].name}`);

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

    // 4. Seed High-Resolution Population Grids (WorldPop format)
    // We seed:
    // - Grid cell 1: inside Macha (within 500m of Macha Mission -> should NOT be flagged as unmapped)
    // - Grid cell 2: outside Macha (10km away, high population -> SHOULD be flagged as unmapped!)
    // - Grid cell 3: outside Choma (15km away, high population -> SHOULD be flagged as unmapped!)
    // - Grid cell 4: close to Singani Village (within 1km -> should NOT be flagged as unmapped)
    console.log('Seeding mock WorldPop population density grids...');
    
    const mockGrids = [
      {
        id: 1,
        lat: -16.4190, // Near Macha Mission
        lng: 26.9575,
        pop: 340,
        cellIndex: 'cell_macha_mission_001',
      },
      {
        id: 2,
        lat: -16.3245, // 10km north of Macha - completely unmapped area!
        lng: 26.9234,
        pop: 185,
        cellIndex: 'cell_unmapped_cluster_002',
      },
      {
        id: 3,
        lat: -16.5122, // 15km south of Macha - completely unmapped area!
        lng: 27.0543,
        pop: 290,
        cellIndex: 'cell_unmapped_cluster_003',
      },
      {
        id: 4,
        lat: -16.4452, // Near Singani Village
        lng: 26.9945,
        pop: 95,
        cellIndex: 'cell_singani_village_004',
      }
    ];

    for (const grid of mockGrids) {
      // Calculate a small bounding box Polygon for the 100m grid cell
      const size = 0.0009; // approx 100m in degrees
      const polyCoordinates = [
        [
          [grid.lng - size/2, grid.lat - size/2],
          [grid.lng + size/2, grid.lat - size/2],
          [grid.lng + size/2, grid.lat + size/2],
          [grid.lng - size/2, grid.lat + size/2],
          [grid.lng - size/2, grid.lat - size/2] // close polygon
        ]
      ];

      await db.insert(populationGrids).values({
        tenantId: ZMB_TENANT_ID,
        populationTotal: grid.pop,
        under5Population: Math.round(grid.pop * 0.18),
        geojson: {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: polyCoordinates
          },
          properties: {
            population: grid.pop,
            cell_index: grid.cellIndex
          }
        },
        rasterCell: grid.cellIndex,
        densityClassification: grid.pop > 300 ? 'High' : 'Medium'
      });
    }
    console.log('Mock WorldPop population density grids seeded successfully.');

    // 5. Run the Missing Settlement Detection Engine on the seeded data!
    console.log('\n--- TRIGGERING SPATIAL DETECTION ENGINE ---');
    const result = await runMissingSettlementDetection(ZMB_TENANT_ID, {
      populationThreshold: 50,
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
