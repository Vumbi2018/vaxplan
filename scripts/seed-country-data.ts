import pg from 'pg';
import { db, pool } from '../server/db';
import { villages, customLayers, tenants, facilities } from '../shared/schema';
import { eq, and, like } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

interface RawCommunity {
  name: string;
  lat: number;
  lng: number;
  source: string;
}

// Bounding box of Zambia to filter out invalid/out-of-bound coords
const ZAMBIA_BBOX = {
  minLat: -18.5,
  maxLat: -8.0,
  minLng: 21.5,
  maxLng: 34.5
};

function isInCountryBounds(lat: number, lng: number, tenantCode: string) {
  if (isNaN(lat) || isNaN(lng)) return false;
  if (tenantCode === 'ZMB') {
    return lat >= ZAMBIA_BBOX.minLat && lat <= ZAMBIA_BBOX.maxLat &&
           lng >= ZAMBIA_BBOX.minLng && lng <= ZAMBIA_BBOX.maxLng;
  }
  // Default to true for other countries unless bounds are defined
  return true;
}

async function seed() {
  const args = process.argv.slice(2);
  const tenantArg = args.find(a => a.startsWith('--tenant='));
  const tenantCode = tenantArg ? tenantArg.split('=')[1] : 'ZMB';

  console.log(`Starting National Data Seeding for Tenant: ${tenantCode}...`);
  const client = await pool.connect();

  try {
    // 1. Resolve tenant by code
    const tenantRes = await db
      .select()
      .from(tenants)
      .where(eq(tenants.code, tenantCode))
      .limit(1);

    if (tenantRes.length === 0) {
      console.error(`Tenant with code '${tenantCode}' not found in DB!`);
      process.exit(1);
    }
    const TENANT_ID = tenantRes[0].id;
    const countryName = tenantCode === 'ZMB' ? 'Zambia' : tenantRes[0].name;
    console.log(`Resolved Tenant: ${tenantRes[0].name} (ID: ${TENANT_ID})`);

    // 2. Clear old seeded villages to prevent duplicates on re-run
    console.log('Clearing old national seeded villages...');
    await db
      .delete(villages)
      .where(and(eq(villages.tenantId, TENANT_ID), like(villages.code, 'NAT-SEED-%')));
    console.log(`Deleted existing seeded villages for tenant ${tenantCode}.`);

    // 3. Get all facilities for this tenant
    console.log('Fetching facilities...');
    const allFacilities = await db
      .select()
      .from(facilities)
      .where(eq(facilities.tenantId, TENANT_ID));
    
    const validFacilities = allFacilities.filter(f => {
      const lat = parseFloat(f.latitude as any);
      const lng = parseFloat(f.longitude as any);
      return !isNaN(lat) && !isNaN(lng);
    });
    console.log(`Found ${allFacilities.length} facilities, ${validFacilities.length} have valid coordinates.`);

    if (validFacilities.length === 0) {
      console.error(`No facilities with valid coordinates found for tenant ${tenantCode}!`);
      process.exit(1);
    }

    // 4. Ingest raw communities from CSV files
    const rawCommunities: RawCommunity[] = [];
    const resourcesDir = path.join(process.cwd(), 'Resources');

    if (tenantCode === 'ZMB') {
      const csvFiles = [
        'solwezi_local_communities.csv',
        'Zambia_More_Communities.csv',
        'zambia_deep_communities.csv',
        'zambia_communities.csv',
        'zambia_communities_clean.csv'
      ];

      for (const csvFile of csvFiles) {
        const filePath = path.join(resourcesDir, csvFile);
        if (fs.existsSync(filePath)) {
          console.log(`Loading ${csvFile}...`);
          const content = fs.readFileSync(filePath, 'utf-8');
          const records = parse(content, { columns: true, skip_empty_lines: true });
          for (const r of records) {
            const latKey = Object.keys(r).find(k => k.toLowerCase().includes('lat'));
            const lngKey = Object.keys(r).find(k => k.toLowerCase().includes('lon') || k.toLowerCase().includes('lng'));
            const nameKey = Object.keys(r).find(k => k.toLowerCase().includes('name'));
            
            if (latKey && lngKey && nameKey) {
              const lat = parseFloat(r[latKey]);
              const lng = parseFloat(r[lngKey]);
              const name = (r[nameKey] || '').trim();
              
              if (name && isInCountryBounds(lat, lng, tenantCode)) {
                // Exclude generic placeholder names
                const lowerName = name.toLowerCase();
                if (lowerName === 'zambia' || lowerName === 'north-western' || lowerName === 'central' || lowerName === 'copperbelt' || lowerName === 'lusaka' || lowerName === 'southern' || lowerName === 'eastern' || lowerName === 'western') {
                  continue;
                }
                rawCommunities.push({ name, lat, lng, source: csvFile });
              }
            }
          }
        }
      }
    } else {
      // General fallback for other countries: search for CSVs containing country code in filename
      const files = fs.readdirSync(resourcesDir);
      const targetPrefix = tenantCode.toLowerCase();
      const countryCsvs = files.filter(f => f.endsWith('.csv') && f.toLowerCase().includes(targetPrefix));
      
      for (const csvFile of countryCsvs) {
        const filePath = path.join(resourcesDir, csvFile);
        console.log(`Loading fallback CSV ${csvFile}...`);
        const content = fs.readFileSync(filePath, 'utf-8');
        const records = parse(content, { columns: true, skip_empty_lines: true });
        for (const r of records) {
          const latKey = Object.keys(r).find(k => k.toLowerCase().includes('lat'));
          const lngKey = Object.keys(r).find(k => k.toLowerCase().includes('lon') || k.toLowerCase().includes('lng'));
          const nameKey = Object.keys(r).find(k => k.toLowerCase().includes('name'));
          if (latKey && lngKey && nameKey) {
            const lat = parseFloat(r[latKey]);
            const lng = parseFloat(r[lngKey]);
            const name = (r[nameKey] || '').trim();
            if (name && !isNaN(lat) && !isNaN(lng)) {
              rawCommunities.push({ name, lat, lng, source: csvFile });
            }
          }
        }
      }
    }

    console.log(`Parsed total of ${rawCommunities.length} matching communities for ${countryName}.`);

    // 5. Deduplicate communities spatially (within 150m) to clean up raw data
    console.log('Deduplicating communities (spatial threshold 150m)...');
    const uniqueCommunities: RawCommunity[] = [];

    // Group spatially using a grid bucket system for fast O(N) deduplication
    const gridSize = 0.0015; // roughly 150m in degrees
    const buckets = new Map<string, RawCommunity[]>();

    for (const r of rawCommunities) {
      const latBin = Math.floor(r.lat / gridSize);
      const lngBin = Math.floor(r.lng / gridSize);
      
      let isDuplicate = false;
      
      // Check surrounding 9 cells
      for (let dLat = -1; dLat <= 1 && !isDuplicate; dLat++) {
        for (let dLng = -1; dLng <= 1 && !isDuplicate; dLng++) {
          const key = `${latBin + dLat},${lngBin + dLng}`;
          const bucket = buckets.get(key);
          if (bucket) {
            for (const existing of bucket) {
              const dist = calculateHaversineDistance(existing.lat, existing.lng, r.lat, r.lng);
              if (dist < 0.150) { // 150 meters
                isDuplicate = true;
                break;
              }
            }
          }
        }
      }

      if (!isDuplicate) {
        uniqueCommunities.push(r);
        const key = `${latBin},${lngBin}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key)!.push(r);
      }
    }

    console.log(`Deduplicated to ${uniqueCommunities.length} unique communities.`);

    // 6. Associate each community with its closest health facility
    console.log('Associating communities with closest health facilities and assigning districts...');
    const insertedVillages = [];
    let seedIdx = 1;

    for (const c of uniqueCommunities) {
      let closestFac = validFacilities[0];
      let minDistance = Infinity;

      for (const f of validFacilities) {
        const facLat = parseFloat(f.latitude as any);
        const facLng = parseFloat(f.longitude as any);
        const dist = calculateHaversineDistance(c.lat, c.lng, facLat, facLng);
        if (dist < minDistance) {
          minDistance = dist;
          closestFac = f;
        }
      }

      // Ignore communities that are extremely isolated (e.g., > 100km from any facility)
      if (minDistance > 100.0) {
        continue;
      }

      const isHtr = minDistance > 10.0;
      const minutesPerKm = isHtr ? 15 : 2;
      const terrainFactor = isHtr ? 1.25 : 1.15;
      const travelTime = Math.max(5, Math.round(minDistance * minutesPerKm * terrainFactor));

      insertedVillages.push({
        tenantId: TENANT_ID,
        name: c.name,
        code: `NAT-SEED-${seedIdx++}`,
        districtId: closestFac.districtId, // Authoritative district ID from closest facility
        assignedFacilityId: closestFac.id,
        latitude: c.lat.toString(),
        longitude: c.lng.toString(),
        distanceToFacility: minDistance.toFixed(2),
        travelTimeMinutes: travelTime,
        isHardToReach: isHtr,
        comments: `Seeded national community from ${c.source}`,
      });
    }

    console.log(`Inserting ${insertedVillages.length} villages into DB in batches of 200...`);
    const batchSize = 200;
    for (let i = 0; i < insertedVillages.length; i += batchSize) {
      const batch = insertedVillages.slice(i, i + batchSize);
      await db.insert(villages).values(batch as any);
      if (i > 0 && i % 1000 === 0) {
        console.log(`  Inserted ${i} villages...`);
      }
    }
    console.log(`Successfully seeded ${insertedVillages.length} national villages across all districts!`);

    // 7. Seed Custom Map Layers (entire country)
    console.log('\n--- Seeding National Custom Map Layers ---');

    // Clean existing national layers for this tenant
    await db.delete(customLayers).where(
      and(
        eq(customLayers.tenantId, TENANT_ID),
        like(customLayers.name, `${countryName} %`)
      )
    );
    console.log(`Cleared existing national custom layers for ${countryName}.`);

    // 7a. Education Facilities
    let eduFile = `extracted_education/education_facilities.geojson`;
    // Fallback search for other countries
    if (tenantCode !== 'ZMB') {
      const eduDirs = fs.readdirSync(resourcesDir).filter(f => f.includes('education') && fs.statSync(path.join(resourcesDir, f)).isDirectory());
      if (eduDirs.length > 0) {
        const files = fs.readdirSync(path.join(resourcesDir, eduDirs[0]));
        const geojson = files.find(f => f.endsWith('.geojson'));
        if (geojson) {
          eduFile = path.join(eduDirs[0], geojson);
        }
      }
    }

    const eduGeojsonPath = path.join(resourcesDir, eduFile);
    if (fs.existsSync(eduGeojsonPath)) {
      console.log(`Processing education facilities from ${eduGeojsonPath}...`);
      const rawGeojson = JSON.parse(fs.readFileSync(eduGeojsonPath, 'utf-8'));
      const features = rawGeojson.features || [];
      
      console.log(`Loaded ${features.length} education features.`);

      if (features.length > 0) {
        await db.insert(customLayers).values({
          tenantId: TENANT_ID,
          name: `${countryName} Education Facilities`,
          description: `Primary and secondary schools, colleges, and educational facilities in ${countryName}`,
          category: 'schools',
          layerType: 'vector',
          format: 'geojson',
          geojson: { type: 'FeatureCollection', features },
          featureCount: features.length,
          style: { color: '#ea580c', pointRadius: 6, weight: 2, fillOpacity: 0.8 },
          usableInPlanning: false,
          isActive: true
        });
        console.log(`Seeded ${countryName} Education Facilities custom layer.`);
      }
    } else {
      console.log(`Warning: Education facilities geojson not found at ${eduGeojsonPath}`);
    }

    // 7b. Points of Interest
    let poiFile = `extracted_poi/points_of_interest.geojson`;
    if (tenantCode !== 'ZMB') {
      const poiDirs = fs.readdirSync(resourcesDir).filter(f => f.includes('poi') && fs.statSync(path.join(resourcesDir, f)).isDirectory());
      if (poiDirs.length > 0) {
        const files = fs.readdirSync(path.join(resourcesDir, poiDirs[0]));
        const geojson = files.find(f => f.endsWith('.geojson'));
        if (geojson) {
          poiFile = path.join(poiDirs[0], geojson);
        }
      }
    }

    const poiGeojsonPath = path.join(resourcesDir, poiFile);
    if (fs.existsSync(poiGeojsonPath)) {
      console.log(`Processing points of interest from ${poiGeojsonPath}...`);
      const rawGeojson = JSON.parse(fs.readFileSync(poiGeojsonPath, 'utf-8'));
      const features = rawGeojson.features || [];
      
      console.log(`Loaded ${features.length} POI features.`);

      if (features.length > 0) {
        await db.insert(customLayers).values({
          tenantId: TENANT_ID,
          name: `${countryName} Points of Interest`,
          description: `Points of interest (shops, tourism, transport, buildings) in ${countryName}`,
          category: 'other',
          layerType: 'vector',
          format: 'geojson',
          geojson: { type: 'FeatureCollection', features },
          featureCount: features.length,
          style: { color: '#2563eb', pointRadius: 5, weight: 2, fillOpacity: 0.8 },
          usableInPlanning: false,
          isActive: true
        });
        console.log(`Seeded ${countryName} Points of Interest custom layer.`);
      }
    } else {
      console.log(`Warning: Points of interest geojson not found at ${poiGeojsonPath}`);
    }

    console.log(`\nNational data ingestion and seeding for ${countryName} completed successfully!`);
  } catch (err: any) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
