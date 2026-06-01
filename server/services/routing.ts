// Road-network travel-time routing for the Geospatial Intelligence Layer.
//
// Augments (never replaces) the existing straight-line distance heuristic in
// server/pipeline/settlementEngine.ts. Given a point, it finds the nearest
// active facility and computes a real driving route via the public OSRM demo
// server, plus a walking-time estimate derived from the road distance.
//
// Like server/services/geo.ts this is intentionally best-effort: results are
// cached, concurrent identical lookups are coalesced, outbound calls are
// rate-limited, and ANY failure (no network, timeout, rate limit, no facility)
// falls back to the straight-line estimate rather than throwing. A map click
// must never break because routing is unavailable.

import { pool } from "../db";

export interface TravelMode {
  durationMin: number;
  estimated: boolean; // true when derived from straight-line / non-routed
}

export interface TravelTimeResult {
  facilityName: string | null;
  facilityLatitude: number | null;
  facilityLongitude: number | null;
  straightLineKm: number; // great-circle distance to nearest facility
  roadDistanceKm: number | null; // OSRM road distance (null when not routed)
  driving: TravelMode;
  walking: TravelMode;
  routeClassification: "road" | "straight-line estimate";
  provider: "osrm" | "estimate";
}

// Walking/driving speeds for estimates (km/h).
const WALK_KMH = 5;
const HEURISTIC_DRIVE_KMH = 4; // matches existing 15 min/km heuristic (60/15)

const TTL_MS = 6 * 60 * 60 * 1000; // routes are stable; cache 6h
const cache = new Map<string, { value: TravelTimeResult; expires: number }>();
const inFlight = new Map<string, Promise<TravelTimeResult>>();

// OSRM public demo asks for gentle usage; bound genuinely-new outbound calls.
const OSRM_MIN_INTERVAL_MS = 250;
let lastOsrmAt = 0;

function roundCoord(n: number): string {
  return n.toFixed(4); // ~11m buckets so nearby clicks reuse a route
}

function isFiniteCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

interface NearestFacility {
  name: string;
  longitude: number;
  latitude: number;
  straightLineKm: number;
}

// Nearest active facility WITH coordinates (needed to build a route). Kept
// separate from settlementEngine.getNearestHealthFacility, which returns only
// name + distance and must stay unchanged.
async function getNearestFacilityWithCoords(
  tenantId: string,
  longitude: number,
  latitude: number,
): Promise<NearestFacility | null> {
  try {
    const query = `
      SELECT
        name,
        longitude::float AS longitude,
        latitude::float AS latitude,
        ST_Distance(
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          ST_SetSRID(ST_MakePoint(longitude::float, latitude::float), 4326)::geography
        ) AS distance_meters
      FROM facilities
      WHERE tenant_id = $3 AND latitude IS NOT NULL AND longitude IS NOT NULL AND is_active = true
      ORDER BY distance_meters ASC
      LIMIT 1
    `;
    const res = await pool.query(query, [longitude, latitude, tenantId]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      name: row.name,
      longitude: Number(row.longitude),
      latitude: Number(row.latitude),
      straightLineKm: parseFloat((Number(row.distance_meters) / 1000).toFixed(2)),
    };
  } catch (err: any) {
    console.error("[routing] nearest facility lookup failed:", err?.message);
    return null;
  }
}

interface OsrmRoute {
  roadDistanceKm: number;
  drivingMin: number;
}

async function fetchOsrmRoute(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
): Promise<OsrmRoute | null> {
  const now = Date.now();
  if (now - lastOsrmAt < OSRM_MIN_INTERVAL_MS) return null; // throttle: caller falls back to estimate
  lastOsrmAt = now;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${fromLng},${fromLat};${toLng},${toLat}?overview=false&alternatives=false&steps=false`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "VaxPlan/1.0 (health microplanning travel-time)" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data: any = await res.json();
    if (data?.code !== "Ok" || !Array.isArray(data.routes) || data.routes.length === 0) {
      return null;
    }
    const route = data.routes[0];
    const meters = Number(route.distance);
    const seconds = Number(route.duration);
    if (!Number.isFinite(meters) || !Number.isFinite(seconds)) return null;
    return {
      roadDistanceKm: parseFloat((meters / 1000).toFixed(2)),
      drivingMin: Math.round(seconds / 60),
    };
  } catch {
    return null; // timeout / abort / network — caller falls back
  }
}

/**
 * Compute travel time from an arbitrary point to the nearest active facility.
 * Always resolves (best-effort); falls back to the straight-line estimate when
 * routing is unavailable.
 */
export async function getTravelTimeToNearestFacility(
  tenantId: string,
  longitude: number,
  latitude: number,
): Promise<TravelTimeResult> {
  const empty: TravelTimeResult = {
    facilityName: null,
    facilityLatitude: null,
    facilityLongitude: null,
    straightLineKm: 0,
    roadDistanceKm: null,
    driving: { durationMin: 0, estimated: true },
    walking: { durationMin: 0, estimated: true },
    routeClassification: "straight-line estimate",
    provider: "estimate",
  };
  if (!isFiniteCoord(latitude, longitude)) return empty;

  const key = `${tenantId}:${roundCoord(longitude)},${roundCoord(latitude)}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = (async (): Promise<TravelTimeResult> => {
    const facility = await getNearestFacilityWithCoords(tenantId, longitude, latitude);
    if (!facility) return empty;

    const straightLineKm = facility.straightLineKm;
    // Straight-line estimate (matches existing heuristic: 15 min/km driving).
    const estimateResult: TravelTimeResult = {
      facilityName: facility.name,
      facilityLatitude: facility.latitude,
      facilityLongitude: facility.longitude,
      straightLineKm,
      roadDistanceKm: null,
      driving: { durationMin: Math.round((straightLineKm / HEURISTIC_DRIVE_KMH) * 60), estimated: true },
      walking: { durationMin: Math.round((straightLineKm / WALK_KMH) * 60), estimated: true },
      routeClassification: "straight-line estimate",
      provider: "estimate",
    };

    const osrm = await fetchOsrmRoute(longitude, latitude, facility.longitude, facility.latitude);
    if (!osrm) return estimateResult; // graceful fallback (not cached so it retries)

    const result: TravelTimeResult = {
      facilityName: facility.name,
      facilityLatitude: facility.latitude,
      facilityLongitude: facility.longitude,
      straightLineKm,
      roadDistanceKm: osrm.roadDistanceKm,
      driving: { durationMin: osrm.drivingMin, estimated: false },
      // OSRM public demo only serves the driving profile; derive walking from
      // the real road distance at walking pace (more accurate than great-circle).
      walking: { durationMin: Math.round((osrm.roadDistanceKm / WALK_KMH) * 60), estimated: true },
      routeClassification: "road",
      provider: "osrm",
    };
    cache.set(key, { value: result, expires: Date.now() + TTL_MS });
    return result;
  })().finally(() => inFlight.delete(key));

  inFlight.set(key, promise);
  return promise;
}
