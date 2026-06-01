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
  // Road geometry of the chosen route as an array of [longitude, latitude]
  // pairs (GeoJSON order). null when the route fell back to a straight-line
  // estimate, so the client draws a straight dashed line instead.
  geometry: [number, number][] | null;
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
  // Road geometry to the nearest facility (mirrors facility.geometry below);
  // array of [longitude, latitude] pairs, null on straight-line fallback.
  geometry: [number, number][] | null;
  // Nearest existing outreach site (an outreach session resolved to a point),
  // null when the tenant has no active outreach sites to route to. Outreach
  // posts are often closer to remote clusters than fixed facilities.
  outreachSite: TravelDestination | null;
}

// Walking/driving speeds for estimates (km/h).
const WALK_KMH = 5;
const HEURISTIC_DRIVE_KMH = 4; // matches existing 15 min/km heuristic (60/15)

// Walking-time bands rendered as travel-time zones (1/2/3 hours on foot).
export const WALK_ISOCHRONE_BANDS = [
  { hours: 1, seconds: 3600, color: "#16a34a" },
  { hours: 2, seconds: 7200, color: "#d97706" },
  { hours: 3, seconds: 10800, color: "#dc2626" },
] as const;

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
  // Decoded LineString geometry: [longitude, latitude] pairs (GeoJSON order).
  geometry: [number, number][] | null;
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
      `${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&alternatives=false&steps=false`;
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
    // overview=full + geometries=geojson returns a LineString of [lng,lat]
    // pairs. Keep only finite coords; null it if anything looks malformed so
    // the client falls back to a straight line rather than drawing garbage.
    let geometry: [number, number][] | null = null;
    const rawCoords = route?.geometry?.coordinates;
    if (Array.isArray(rawCoords) && rawCoords.length >= 2) {
      const cleaned = rawCoords
        .filter(
          (c: any) =>
            Array.isArray(c) &&
            c.length >= 2 &&
            Number.isFinite(Number(c[0])) &&
            Number.isFinite(Number(c[1])),
        )
        .map((c: any) => [Number(c[0]), Number(c[1])] as [number, number]);
      if (cleaned.length >= 2) geometry = cleaned;
    }
    return {
      roadDistanceKm: parseFloat((meters / 1000).toFixed(2)),
      drivingMin: Math.round(seconds / 60),
      geometry,
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
    geometry: null,
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
    geometry: osrm.geometry,
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
    geometry: null,
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
      geometry: facilityDest?.geometry ?? null,
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

// ---------------------------------------------------------------------------
// Walking-time isochrones (road/path-network travel-time zones)
// ---------------------------------------------------------------------------
//
// The travel-time-zone map layer previously drew plain circles around each
// facility. Real walking time follows roads, paths, rivers and terrain, so we
// replace the circles with true isochrones computed by OpenRouteService (ORS)
// over the OSM walking network. ORS requires an API key
// (OPENROUTESERVICE_API_KEY). When no key is configured, or any upstream call
// fails, this returns { available: false } and the client falls back to the
// original circles — the map must never break because routing is unavailable.

export interface IsochroneResult {
  available: boolean;
  reason?: string; // why isochrones are unavailable (for logs / client hints)
  bands: Array<{ hours: number; seconds: number; color: string }>;
  // GeoJSON FeatureCollection; each Feature is a walking-time polygon tagged
  // with { hours, seconds, color, facilityName } in its properties.
  featureCollection: {
    type: "FeatureCollection";
    features: any[];
  };
}

const ORS_ISOCHRONE_URL =
  "https://api.openrouteservice.org/v2/isochrones/foot-walking";
const ORS_MAX_LOCATIONS_PER_REQUEST = 5; // ORS free tier limit
const ORS_MAX_FACILITIES = 25; // bound outbound calls & rate-limit usage
const ISOCHRONE_TTL_MS = 24 * 60 * 60 * 1000; // facility positions are stable

const isochroneCache = new Map<
  string,
  { value: IsochroneResult; expires: number }
>();
const isochroneInFlight = new Map<string, Promise<IsochroneResult>>();

interface FacilityCoords {
  name: string;
  longitude: number;
  latitude: number;
}

async function getActiveFacilitiesWithCoords(
  tenantId: string,
): Promise<FacilityCoords[]> {
  try {
    const query = `
      SELECT name, longitude::float AS longitude, latitude::float AS latitude
      FROM facilities
      WHERE tenant_id = $1
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND is_active = true
      ORDER BY name ASC
      LIMIT ${ORS_MAX_FACILITIES}
    `;
    const res = await pool.query(query, [tenantId]);
    return res.rows
      .map((r: any) => ({
        name: r.name,
        longitude: Number(r.longitude),
        latitude: Number(r.latitude),
      }))
      .filter((f: FacilityCoords) => isFiniteCoord(f.latitude, f.longitude));
  } catch (err: any) {
    console.error("[routing] facility coords lookup failed:", err?.message);
    return [];
  }
}

// Fetch isochrones for up to ORS_MAX_LOCATIONS_PER_REQUEST facilities in one
// ORS call. Returns the tagged features, or null on any failure.
async function fetchOrsIsochroneBatch(
  apiKey: string,
  batch: FacilityCoords[],
): Promise<any[] | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(ORS_ISOCHRONE_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
        Accept: "application/geo+json",
      },
      body: JSON.stringify({
        locations: batch.map((f) => [f.longitude, f.latitude]),
        range: WALK_ISOCHRONE_BANDS.map((b) => b.seconds),
        range_type: "time",
        location_type: "destination",
        smoothing: 25,
        attributes: [],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.error(
        `[routing] ORS isochrones HTTP ${res.status} for batch of ${batch.length}`,
      );
      return null;
    }
    const data: any = await res.json();
    if (!data || !Array.isArray(data.features)) return null;

    // ORS returns one feature per (location, range). group_index maps the
    // feature back to its position in the `locations` array; value is the range
    // in seconds. Tag each feature with band colour + facility name.
    const tagged: any[] = [];
    for (const feature of data.features) {
      const props = feature?.properties || {};
      const seconds = Number(props.value);
      const band = WALK_ISOCHRONE_BANDS.find((b) => b.seconds === seconds);
      if (!band) continue;
      const facility = batch[Number(props.group_index)];
      tagged.push({
        ...feature,
        properties: {
          hours: band.hours,
          seconds: band.seconds,
          color: band.color,
          facilityName: facility?.name ?? null,
        },
      });
    }
    return tagged;
  } catch (err: any) {
    console.error("[routing] ORS isochrones request failed:", err?.message);
    return null;
  }
}

/**
 * Compute walking-time isochrones (1/2/3 hours on foot) for the tenant's active
 * facilities. Always resolves (best-effort): returns { available: false } when
 * no ORS key is configured or every upstream call fails, so the client can fall
 * back to plain circles.
 */
export async function getWalkingIsochrones(
  tenantId: string,
): Promise<IsochroneResult> {
  const bands = WALK_ISOCHRONE_BANDS.map((b) => ({ ...b }));
  const unavailable = (reason: string): IsochroneResult => ({
    available: false,
    reason,
    bands,
    featureCollection: { type: "FeatureCollection", features: [] },
  });

  const apiKey = process.env.OPENROUTESERVICE_API_KEY;
  if (!apiKey) return unavailable("no-api-key");

  const cached = isochroneCache.get(tenantId);
  if (cached && cached.expires > Date.now()) return cached.value;
  const pending = isochroneInFlight.get(tenantId);
  if (pending) return pending;

  const promise = (async (): Promise<IsochroneResult> => {
    const facilities = await getActiveFacilitiesWithCoords(tenantId);
    if (facilities.length === 0) return unavailable("no-facilities");

    const features: any[] = [];
    for (let i = 0; i < facilities.length; i += ORS_MAX_LOCATIONS_PER_REQUEST) {
      const batch = facilities.slice(i, i + ORS_MAX_LOCATIONS_PER_REQUEST);
      const tagged = await fetchOrsIsochroneBatch(apiKey, batch);
      if (tagged) features.push(...tagged);
    }

    // Total failure → let the client keep its circles.
    if (features.length === 0) return unavailable("provider-unavailable");

    // Draw larger bands first so the 1h zone paints on top of the 3h zone.
    features.sort(
      (a, b) => (b.properties?.seconds ?? 0) - (a.properties?.seconds ?? 0),
    );

    const result: IsochroneResult = {
      available: true,
      bands,
      featureCollection: { type: "FeatureCollection", features },
    };
    isochroneCache.set(tenantId, {
      value: result,
      expires: Date.now() + ISOCHRONE_TTL_MS,
    });
    return result;
  })().finally(() => isochroneInFlight.delete(tenantId));

  isochroneInFlight.set(tenantId, promise);
  return promise;
}
