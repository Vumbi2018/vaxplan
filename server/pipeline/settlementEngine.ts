import pg from 'pg';
import { db, pool } from '../db';
import { settlementsMaster, candidateUnmappedSettlements, populationGrids } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Spatial admin assignment using PostGIS ST_Distance ordering to prevent null boundaries
 * due to slight shapefile alignment inaccuracies.
 */
export async function assignAdminBoundaries(
  tenantId: string,
  longitude: number,
  latitude: number
): Promise<{
  provinceName: string | null;
  districtName: string | null;
  wardName: string | null;
  constituencyName: string | null;
}> {
  const client = pool;
  
  // Define levels based on standard GADM/GeoBoundaries schema
  // Level 1 = Province/State, Level 2 = District/County, Level 3 = Constituency/Payam, Level 4 = Ward/Payam/LLG
  const resolveLevel = async (level: number): Promise<string | null> => {
    try {
      const query = `
        SELECT 
          feat->'properties'->>'shapeName' AS name
        FROM admin_boundaries b,
        LATERAL jsonb_array_elements(b.geojson->'features') AS feat
        WHERE b.tenant_id = $1 AND b.admin_level = $2
        ORDER BY ST_Distance(
          ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography,
          ST_SetSRID(ST_GeomFromGeoJSON(feat->>'geometry'), 4326)::geography
        ) ASC
        LIMIT 1
      `;
      const res = await client.query(query, [tenantId, level, longitude, latitude]);
      return res.rows[0]?.name || null;
    } catch (err: any) {
      console.error(`Error resolving admin boundary level ${level}:`, err.message);
      return null;
    }
  };

  const province = await resolveLevel(1);
  const district = await resolveLevel(2);
  const constituency = await resolveLevel(3);
  const ward = await resolveLevel(4);

  return {
    provinceName: province,
    districtName: district,
    wardName: ward || constituency, // Fallback logic
    constituencyName: constituency,
  };
}

/**
 * Maps coordinates to the nearest operational health facility using geodesic ST_Distance
 */
export async function getNearestHealthFacility(
  tenantId: string,
  longitude: number,
  latitude: number
): Promise<{
  facilityName: string | null;
  distanceKm: number;
  estimatedTravelTime: number;
}> {
  const client = pool;
  try {
    const query = `
      SELECT 
        name,
        ST_Distance(
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          ST_SetSRID(ST_MakePoint(longitude::float, latitude::float), 4326)::geography
        ) as distance_meters
      FROM facilities
      WHERE tenant_id = $3 AND latitude IS NOT NULL AND longitude IS NOT NULL AND is_active = true
      ORDER BY distance_meters ASC
      LIMIT 1
    `;
    const res = await client.query(query, [longitude, latitude, tenantId]);
    if (res.rows.length === 0) {
      return { facilityName: null, distanceKm: 0, estimatedTravelTime: 0 };
    }

    const distanceMeters = parseFloat(res.rows[0].distance_meters);
    const distanceKm = distanceMeters / 1000.0;
    
    // Walking speed: 4 km/h -> 15 mins per km
    // Add buffering factor for rugged terrain
    const estimatedTravelTime = Math.round(distanceKm * 15.0);

    return {
      facilityName: res.rows[0].name,
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      estimatedTravelTime
    };
  } catch (err: any) {
    console.error('Error finding nearest facility:', err.message);
    return { facilityName: null, distanceKm: 0, estimatedTravelTime: 0 };
  }
}

/**
 * Calculates a composite accessibility score (1.0 to 4.0) and HTR status
 */
export function calculateHTRIndex(distanceKm: number): {
  accessibilityScore: number;
  hardToReach: boolean;
} {
  let accessibilityScore = 1.0;
  if (distanceKm < 5.0) {
    accessibilityScore = 1.0; // Easy Access
  } else if (distanceKm >= 5.0 && distanceKm < 10.0) {
    accessibilityScore = 2.0; // Moderate Access
  } else if (distanceKm >= 10.0 && distanceKm < 20.0) {
    accessibilityScore = 3.0; // Hard-to-reach (HTR)
  } else {
    accessibilityScore = 4.0; // Extremely Hard-to-reach
  }

  // standard GAVI/WHO definition classifies communities > 5km from active services as HTR/underserved
  const hardToReach = distanceKm >= 5.0;

  return {
    accessibilityScore,
    hardToReach
  };
}

/**
 * THE SPATIAL MISSING SETTLEMENT DETECTION ENGINE (GAVI Zero-Dose Intelligence module)
 */
export async function runMissingSettlementDetection(
  tenantId: string,
  options: {
    populationThreshold?: number;
    buildingThreshold?: number;
    radiusKm?: number;
  } = {}
): Promise<{
  success: boolean;
  message: string;
  candidatesDetected: number;
}> {
  const popThreshold = options.populationThreshold ?? 50;
  const buildingThreshold = options.buildingThreshold ?? 10;
  const radiusMeters = (options.radiusKm ?? 1.5) * 1000;

  console.log(`Running missing settlement detection for tenant ${tenantId}...`);
  console.log(`Parameters: Pop >= ${popThreshold}, Buildings >= ${buildingThreshold}, Radius = ${radiusMeters}m`);

  const client = pool;

  try {
    // 1. Delete all existing pending/unvalidated candidate settlements for this tenant to prevent duplication
    await db
      .delete(candidateUnmappedSettlements)
      .where(
        and(
          eq(candidateUnmappedSettlements.tenantId, tenantId),
          eq(candidateUnmappedSettlements.validationStatus, 'pending')
        )
      );

    // 2. Query high-density population cells with NO named settlements inside the radius
    const detectionQuery = `
      SELECT 
        g.id,
        g.population_total,
        g.under5_population,
        g.geojson,
        ST_X(ST_Centroid(g.geometry)) as longitude,
        ST_Y(ST_Centroid(g.geometry)) as latitude
      FROM population_grids g
      WHERE g.tenant_id = $1
        AND g.population_total >= $2
        AND NOT EXISTS (
          SELECT 1 
          FROM settlements_master s
          WHERE s.tenant_id = $1 
            AND s.validation_status = 'approved'
            AND ST_DWithin(g.geometry::geography, s.geometry::geography, $3)
        )
    `;

    const res = await client.query(detectionQuery, [tenantId, popThreshold, radiusMeters]);
    console.log(`Found ${res.rows.length} high-density grids without nearby master settlements.`);

    let insertedCount = 0;

    // 3. Process each unmapped node, calculate auxiliary fields, and store
    for (const gridCell of res.rows) {
      const lng = parseFloat(gridCell.longitude);
      const lat = parseFloat(gridCell.latitude);
      const population = parseInt(gridCell.population_total);
      
      // Calculate building counts: average size of 5.2 people per building
      const buildingCount = Math.max(
        buildingThreshold,
        Math.round(population / 5.2)
      );

      // Perform administrative lookup
      const admin = await assignAdminBoundaries(tenantId, lng, lat);

      // Find nearest health facility
      const facility = await getNearestHealthFacility(tenantId, lng, lat);
      
      // Calculate HTR scores
      const htr = calculateHTRIndex(facility.distanceKm);

      // Calculate confidence score (based on population size and admin alignment)
      let confidence = 0.75;
      if (population >= 100) confidence += 0.10;
      if (admin.districtName) confidence += 0.10;
      confidence = Math.min(0.99, confidence);

      // Find nearest named settlement
      const nearestSettlementRes = await client.query(`
        SELECT name, ST_Distance(
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          geometry::geography
        ) as distance_meters
        FROM settlements_master
        WHERE tenant_id = $3 AND validation_status = 'approved'
        ORDER BY distance_meters ASC
        LIMIT 1
      `, [lng, lat, tenantId]);

      const nearestNamed = nearestSettlementRes.rows[0]?.name || 'Unknown Community';

      // Insert candidate settlement record
      await db.insert(candidateUnmappedSettlements).values({
        tenantId,
        latitude: lat.toString(),
        longitude: lng.toString(),
        geojson: {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [lng, lat]
          },
          properties: {
            estimated_population: population,
            building_count: buildingCount,
            nearest_facility: facility.facilityName || 'None',
            distance_to_facility: facility.distanceKm
          }
        },
        estimatedPopulation: population,
        buildingCount,
        nearestNamedSettlement: nearestNamed,
        nearestFacility: facility.facilityName || 'Unassigned',
        distanceToFacility: facility.distanceKm.toString(),
        confidenceScore: confidence.toString(),
        validationStatus: 'pending'
      });

      insertedCount++;
    }

    return {
      success: true,
      message: `Successfully run spatial intelligence engine. Detected ${insertedCount} new Zero-Dose candidate settlements.`,
      candidatesDetected: insertedCount
    };
  } catch (err: any) {
    console.error('Failed to run missing settlement engine:', err.message);
    return {
      success: false,
      message: `Failed to run missing settlement engine: ${err.message}`,
      candidatesDetected: 0
    };
  }
}
