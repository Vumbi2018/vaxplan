import { db, pool } from '../db';
import { candidateUnmappedSettlements } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Spatial admin assignment using PostGIS ST_Distance ordering to prevent null boundaries
 * due to slight shapefile alignment inaccuracies.
 *
 * Kept for backwards compatibility / single-point lookups (e.g. ad-hoc API calls).
 * The bulk detection pipeline below no longer uses this function; it joins admin polygons
 * once per tenant in a single set-based query.
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
    wardName: ward || constituency,
    constituencyName: constituency,
  };
}

/**
 * Maps coordinates to the nearest operational health facility using geodesic ST_Distance.
 * Retained for single-point callers; bulk pipeline below joins facilities directly.
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
    const estimatedTravelTime = Math.round(distanceKm * 15.0);

    return {
      facilityName: res.rows[0].name,
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      estimatedTravelTime,
    };
  } catch (err: any) {
    console.error('Error finding nearest facility:', err.message);
    return { facilityName: null, distanceKm: 0, estimatedTravelTime: 0 };
  }
}

/**
 * Calculates a composite accessibility score (1.0 to 4.0) and HTR status.
 */
export function calculateHTRIndex(distanceKm: number): {
  accessibilityScore: number;
  hardToReach: boolean;
} {
  let accessibilityScore = 1.0;
  if (distanceKm < 5.0) {
    accessibilityScore = 1.0;
  } else if (distanceKm < 10.0) {
    accessibilityScore = 2.0;
  } else if (distanceKm < 20.0) {
    accessibilityScore = 3.0;
  } else {
    accessibilityScore = 4.0;
  }

  const hardToReach = distanceKm >= 5.0;
  return { accessibilityScore, hardToReach };
}

/**
 * THE SPATIAL MISSING SETTLEMENT DETECTION ENGINE (GAVI Zero-Dose Intelligence module)
 *
 * Set-based pipeline:
 *   1. Find population_grids cells above the threshold with no master settlement within radius.
 *   2. Collapse adjacent qualifying cells into clusters with ST_ClusterDBSCAN so that dense
 *      urban grids do not produce thousands of near-duplicate candidates.
 *   3. Enrich every cluster in one query: nearest admin polygon at levels 1-4 (joined against
 *      a CTE of unnested admin features), nearest active facility, nearest named settlement.
 *   4. Bulk INSERT the enriched clusters into candidate_unmapped_settlements.
 *
 * This replaces the previous row-by-row loop (6 spatial queries per candidate), which made it
 * impractical to drop populationThreshold below ~300 on real WorldPop data.
 */
export async function runMissingSettlementDetection(
  tenantId: string,
  options: {
    populationThreshold?: number;
    buildingThreshold?: number;
    radiusKm?: number;
    clusterEpsKm?: number;
  } = {}
): Promise<{
  success: boolean;
  message: string;
  candidatesDetected: number;
}> {
  const popThreshold = options.populationThreshold ?? 50;
  const buildingThreshold = options.buildingThreshold ?? 10;
  const radiusMeters = (options.radiusKm ?? 1.5) * 1000;
  // DBSCAN epsilon in degrees (rough metres->deg conversion at equator). Default ~500m
  // ensures neighbouring WorldPop ~100m cells collapse into one candidate without merging
  // unrelated villages.
  const clusterEpsDeg = ((options.clusterEpsKm ?? 0.5) * 1000) / 111320;

  console.log(`Running missing settlement detection for tenant ${tenantId}...`);
  console.log(
    `Parameters: Pop >= ${popThreshold}, Buildings >= ${buildingThreshold}, Radius = ${radiusMeters}m, ClusterEps = ${clusterEpsDeg.toFixed(5)}deg`,
  );

  try {
    // 1. Clear pending candidates for this tenant so the run is idempotent.
    await db
      .delete(candidateUnmappedSettlements)
      .where(
        and(
          eq(candidateUnmappedSettlements.tenantId, tenantId),
          eq(candidateUnmappedSettlements.validationStatus, 'pending'),
        ),
      );

    // 2. Single set-based query: qualify -> cluster -> enrich -> insert.
    // Admin polygons are unnested ONCE into a MATERIALIZED CTE so the 4 KNN lookups per
    // cluster reuse the same materialised set instead of re-parsing GeoJSON per row.
    const sql = `
      WITH admin_polys AS MATERIALIZED (
        SELECT
          b.admin_level,
          COALESCE(
            feat->'properties'->>'shapeName',
            feat->'properties'->>'name',
            feat->'properties'->>'NAME'
          ) AS name,
          ST_SetSRID(ST_GeomFromGeoJSON(feat->>'geometry'), 4326) AS geom
        FROM admin_boundaries b,
             LATERAL jsonb_array_elements(b.geojson->'features') AS feat
        WHERE b.tenant_id = $1
          AND COALESCE(b.is_active, true) = true
          AND feat ? 'geometry'
      ),
      qualifying_cells AS (
        SELECT
          g.id,
          g.population_total,
          g.under5_population,
          ST_Centroid(g.geometry) AS centroid
        FROM population_grids g
        WHERE g.tenant_id = $1
          AND g.population_total >= $2
          AND g.geometry IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM settlements_master s
            WHERE s.tenant_id = $1
              AND s.validation_status = 'approved'
              AND s.geometry IS NOT NULL
              AND ST_DWithin(g.geometry::geography, s.geometry::geography, $3)
          )
      ),
      clustered AS (
        SELECT
          id,
          population_total,
          under5_population,
          centroid,
          ST_ClusterDBSCAN(centroid, eps := $4, minpoints := 1) OVER () AS cluster_id
        FROM qualifying_cells
      ),
      clusters AS (
        SELECT
          cluster_id,
          SUM(population_total)::int       AS population_total,
          SUM(under5_population)::int      AS under5_population,
          ST_Centroid(ST_Collect(centroid)) AS centroid
        FROM clustered
        WHERE cluster_id IS NOT NULL
        GROUP BY cluster_id
      ),
      enriched AS (
        SELECT
          ST_X(c.centroid) AS lng,
          ST_Y(c.centroid) AS lat,
          c.population_total,
          c.under5_population,
          (SELECT name FROM admin_polys
             WHERE admin_level = 1 AND name IS NOT NULL
             ORDER BY geom <-> c.centroid LIMIT 1)         AS province_name,
          (SELECT name FROM admin_polys
             WHERE admin_level = 2 AND name IS NOT NULL
             ORDER BY geom <-> c.centroid LIMIT 1)         AS district_name,
          (SELECT name FROM admin_polys
             WHERE admin_level = 3 AND name IS NOT NULL
             ORDER BY geom <-> c.centroid LIMIT 1)         AS constituency_name,
          (SELECT name FROM admin_polys
             WHERE admin_level = 4 AND name IS NOT NULL
             ORDER BY geom <-> c.centroid LIMIT 1)         AS ward_name,
          nf.name        AS facility_name,
          nf.distance_m  AS facility_distance_m,
          ns.name        AS nearest_settlement_name
        FROM clusters c
        LEFT JOIN LATERAL (
          SELECT
            f.name,
            ST_Distance(
              c.centroid::geography,
              ST_SetSRID(ST_MakePoint(f.longitude::float, f.latitude::float), 4326)::geography
            ) AS distance_m
          FROM facilities f
          WHERE f.tenant_id = $1
            AND f.is_active = true
            AND f.latitude IS NOT NULL
            AND f.longitude IS NOT NULL
          ORDER BY
            ST_SetSRID(ST_MakePoint(f.longitude::float, f.latitude::float), 4326)
            <-> c.centroid
          LIMIT 1
        ) nf ON TRUE
        LEFT JOIN LATERAL (
          SELECT s.name
          FROM settlements_master s
          WHERE s.tenant_id = $1
            AND s.validation_status = 'approved'
            AND s.geometry IS NOT NULL
          ORDER BY s.geometry <-> c.centroid
          LIMIT 1
        ) ns ON TRUE
      )
      INSERT INTO candidate_unmapped_settlements (
        tenant_id,
        latitude,
        longitude,
        geojson,
        estimated_population,
        building_count,
        nearest_named_settlement,
        nearest_facility,
        distance_to_facility,
        confidence_score,
        validation_status
      )
      SELECT
        $1,
        ROUND(e.lat::numeric, 7),
        ROUND(e.lng::numeric, 7),
        jsonb_build_object(
          'type', 'Feature',
          'geometry', jsonb_build_object(
            'type', 'Point',
            'coordinates', jsonb_build_array(e.lng, e.lat)
          ),
          'properties', jsonb_build_object(
            'estimated_population', e.population_total,
            'building_count', GREATEST($5::int, (e.population_total / 5.2)::int),
            'nearest_facility', COALESCE(e.facility_name, 'None'),
            'distance_to_facility', ROUND((COALESCE(e.facility_distance_m, 0) / 1000.0)::numeric, 2),
            'province', e.province_name,
            'district', e.district_name,
            'constituency', e.constituency_name,
            'ward', e.ward_name
          )
        ),
        e.population_total,
        GREATEST($5::int, (e.population_total / 5.2)::int),
        COALESCE(e.nearest_settlement_name, 'Unknown Community'),
        COALESCE(e.facility_name, 'Unassigned'),
        ROUND((COALESCE(e.facility_distance_m, 0) / 1000.0)::numeric, 2),
        LEAST(
          0.99,
          0.75
            + CASE WHEN e.population_total >= 100 THEN 0.10 ELSE 0 END
            + CASE WHEN e.district_name IS NOT NULL THEN 0.10 ELSE 0 END
        ),
        'pending'
      FROM enriched e
    `;

    const result = await pool.query(sql, [
      tenantId,
      popThreshold,
      radiusMeters,
      clusterEpsDeg,
      buildingThreshold,
    ]);

    const insertedCount = result.rowCount ?? 0;
    console.log(`Inserted ${insertedCount} Zero-Dose candidate settlements.`);

    return {
      success: true,
      message: `Successfully run spatial intelligence engine. Detected ${insertedCount} new Zero-Dose candidate settlements.`,
      candidatesDetected: insertedCount,
    };
  } catch (err: any) {
    console.error('Failed to run missing settlement engine:', err.message);
    return {
      success: false,
      message: `Failed to run missing settlement engine: ${err.message}`,
      candidatesDetected: 0,
    };
  }
}
