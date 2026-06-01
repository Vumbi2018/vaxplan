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

import { pool, db } from "../db";
import { storage } from "../storage";
import { sessionVillages } from "@shared/schema";
import { eq } from "drizzle-orm";
import { haversineKm, resolveSessionLocation } from "./proximityCheck";

export interface TravelMode {
  durationMin: number;
  estimated: boolean; // true when derived from straight-line / non-routed
}

// A single routed destination (the nearest facility, or the nearest outreach
// site). Both share the same shape so the client can render them identically.
export interface TravelDestination {
  name: string | null;
  latitude: number | null;
  longitude: number | null;
  straightLineKm: number; // great-circle distance to the destination
  roadDistanceKm: number | null; // OSRM road distance (null when not routed)
  driving: TravelMode;
  walking: TravelMode;
  routeClassification: "road" | "straight-line estimate";
  provider: "osrm" | "estimate";
}

export interface TravelTimeResult {
  // Flat nearest-facility fields kept for backward compatibility with existing
  // clients. They mirror `facility` below.
  facilityName: string | null;
  facilityLatitude: number | null;
  facilityLongitude: number | null;
  straightLineKm: number; // great-circle distance to nearest facility
  roadDistanceKm: number | null; // OSRM road distance (null when not routed)
  driving: TravelMode;
  walking: TravelMode;
  routeClassification: "road" | "straight-line estimate";
  provider: "osrm" | "estimate";
  // Nearest existing outreach site (an outreach session resolved to a point),
  // null when the tenant has no active outreach sites to route to. Outreach
  // posts are often closer to remote clusters than fixed facilities.
  outreachSite: TravelDestination | null;
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

interface NearestPlace {
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
): Promise<NearestPlace | null> {
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

// Nearest active outreach SITE with coordinates. An outreach site is an
// outreach session (session_plans.session_type = 'outreach') resolved to a
// point via its geojson, linked villages, or parent facility — the same
// resolution used by the proximity check, so the two views stay consistent.
// Done in app code (not pure SQL) because the coordinate lives in jsonb /
// junction rows rather than columns on the session.
async function getNearestOutreachSiteWithCoords(
  tenantId: string,
  longitude: number,
  latitude: number,
): Promise<NearestPlace | null> {
  try {
    const all = await storage.getSessionPlans(tenantId);
    const outreach = (all as any[]).filter(
      (s) =>
        s.sessionType === "outreach" &&
        s.status !== "cancelled" &&
        s.status !== "completed",
    );
    if (outreach.length === 0) return null;

    const facList = await storage.getFacilities(tenantId);
    const facMap = new Map<number, any>(facList.map((f: any) => [f.id, f]));
    const vilList = await storage.getVillages(tenantId);
    const vilMap = new Map<number, any>(vilList.map((v: any) => [v.id, v]));
    const svRows = await db
      .select()
      .from(sessionVillages)
      .where(eq(sessionVillages.tenantId, String(tenantId)));
    const svByPlan = new Map<number, number[]>();
    for (const r of svRows) {
      const arr = svByPlan.get(r.sessionId) ?? [];
      arr.push(r.villageId);
      svByPlan.set(r.sessionId, arr);
    }

    let best: NearestPlace | null = null;
    let bestKm = Infinity;
    for (const s of outreach) {
      const loc = await resolveSessionLocation(tenantId, s, vilMap, facMap, svByPlan);
      if (!loc || !isFiniteCoord(loc.lat, loc.lng)) continue;
      const km = haversineKm(latitude, longitude, loc.lat, loc.lng);
      if (km < bestKm) {
        bestKm = km;
        best = {
          name: s.name,
          longitude: loc.lng,
          latitude: loc.lat,
          straightLineKm: parseFloat(km.toFixed(2)),
        };
      }
    }
    return best;
  } catch (err: any) {
    console.error("[routing] nearest outreach site lookup failed:", err?.message);
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
  // Gentle pacing for the OSRM public demo: wait out the minimum interval
  // rather than bail, so multiple destinations resolved in a single lookup
  // (nearest facility + nearest outreach site) each get a real road route
  // instead of one of them silently falling back to a straight-line estimate.
  const sinceLast = Date.now() - lastOsrmAt;
  if (sinceLast < OSRM_MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, OSRM_MIN_INTERVAL_MS - sinceLast));
  }
  lastOsrmAt = Date.now();
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

// Build a routed TravelDestination from a resolved nearest place: try a real
// OSRM road route, otherwise fall back to the straight-line estimate (matches
// the existing heuristic of 15 min/km driving).
async function buildTravelDestination(
  fromLng: number,
  fromLat: number,
  place: NearestPlace,
): Promise<TravelDestination> {
  const straightLineKm = place.straightLineKm;
  const estimate: TravelDestination = {
    name: place.name,
    latitude: place.latitude,
    longitude: place.longitude,
    straightLineKm,
    roadDistanceKm: null,
    driving: { durationMin: Math.round((straightLineKm / HEURISTIC_DRIVE_KMH) * 60), estimated: true },
    walking: { durationMin: Math.round((straightLineKm / WALK_KMH) * 60), estimated: true },
    routeClassification: "straight-line estimate",
    provider: "estimate",
  };

  const osrm = await fetchOsrmRoute(fromLng, fromLat, place.longitude, place.latitude);
  if (!osrm) return estimate; // graceful fallback

  return {
    name: place.name,
    latitude: place.latitude,
    longitude: place.longitude,
    straightLineKm,
    roadDistanceKm: osrm.roadDistanceKm,
    driving: { durationMin: osrm.drivingMin, estimated: false },
    // OSRM public demo only serves the driving profile; derive walking from
    // the real road distance at walking pace (more accurate than great-circle).
    walking: { durationMin: Math.round((osrm.roadDistanceKm / WALK_KMH) * 60), estimated: true },
    routeClassification: "road",
    provider: "osrm",
  };
}

/**
 * Compute travel time from an arbitrary point to the nearest active facility
 * AND the nearest existing outreach site. Always resolves (best-effort); each
 * destination falls back to the straight-line estimate when routing is
 * unavailable, and either destination may be null when none exists.
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
    outreachSite: null,
  };
  if (!isFiniteCoord(latitude, longitude)) return empty;

  const key = `${tenantId}:${roundCoord(longitude)},${roundCoord(latitude)}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = (async (): Promise<TravelTimeResult> => {
    const [facility, outreach] = await Promise.all([
      getNearestFacilityWithCoords(tenantId, longitude, latitude),
      getNearestOutreachSiteWithCoords(tenantId, longitude, latitude),
    ]);
    if (!facility && !outreach) return empty;

    // Route sequentially so the OSRM pacing applies between the two calls and
    // both destinations get a real road route rather than racing the throttle.
    const facilityDest = facility
      ? await buildTravelDestination(longitude, latitude, facility)
      : null;
    const outreachDest = outreach
      ? await buildTravelDestination(longitude, latitude, outreach)
      : null;

    const result: TravelTimeResult = {
      facilityName: facilityDest?.name ?? null,
      facilityLatitude: facilityDest?.latitude ?? null,
      facilityLongitude: facilityDest?.longitude ?? null,
      straightLineKm: facilityDest?.straightLineKm ?? 0,
      roadDistanceKm: facilityDest?.roadDistanceKm ?? null,
      driving: facilityDest?.driving ?? { durationMin: 0, estimated: true },
      walking: facilityDest?.walking ?? { durationMin: 0, estimated: true },
      routeClassification: facilityDest?.routeClassification ?? "straight-line estimate",
      provider: facilityDest?.provider ?? "estimate",
      outreachSite: outreachDest,
    };

    // Cache only once every present destination has a real road route, so an
    // estimate-only result retries on the next click (preserves prior
    // facility-only retry behavior).
    const facilityRouted = !facility || facilityDest?.provider === "osrm";
    const outreachRouted = !outreach || outreachDest?.provider === "osrm";
    const anyRouted = facilityDest?.provider === "osrm" || outreachDest?.provider === "osrm";
    if (facilityRouted && outreachRouted && anyRouted) {
      cache.set(key, { value: result, expires: Date.now() + TTL_MS });
    }
    return result;
  })().finally(() => inFlight.delete(key));

  inFlight.set(key, promise);
  return promise;
}
