// Community-asset discovery for the Geospatial Intelligence Layer.
//
// Queries the OpenStreetMap Overpass API for community assets (schools,
// churches/places of worship, markets, water points, transport nodes,
// pharmacies/drug stores, universities/colleges, government offices, transport
// & logistics features such as airstrips/helipads/ferries/bridges/piers/fuel/
// river crossings, and vulnerable-population sites such as refugee/IDP camps
// and mining sites) within a radius of a point. Used to enrich population
// clusters with what services already exist nearby.
//
// Best-effort, mirroring server/services/geo.ts: results are cached, identical
// concurrent lookups are coalesced, outbound calls are rate-limited (Overpass
// is strict), and ANY failure resolves to an empty list rather than throwing.

export type AssetType =
  | "school"
  | "church"
  | "market"
  | "water_point"
  | "transport"
  | "pharmacy"
  | "university"
  | "government"
  | "logistics"
  | "vulnerable_site";

export interface CommunityAsset {
  type: AssetType;
  name: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
}

const TTL_MS = 24 * 60 * 60 * 1000; // OSM assets are stable; cache a day
const cache = new Map<string, { value: CommunityAsset[]; expires: number }>();
const inFlight = new Map<string, Promise<CommunityAsset[]>>();

// Overpass usage policy is strict; gate genuinely-new outbound queries.
const OVERPASS_MIN_INTERVAL_MS = 1500;
let lastOverpassAt = 0;

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

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

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function classify(tags: Record<string, string> | undefined): AssetType | null {
  if (!tags) return null;
  if (tags.amenity === "school" || tags.amenity === "kindergarten") {
    return "school";
  }
  if (tags.amenity === "place_of_worship") return "church";
  if (tags.amenity === "marketplace" || tags.shop === "supermarket") return "market";
  if (
    tags.amenity === "drinking_water" ||
    tags.man_made === "water_well" ||
    tags.man_made === "water_tap" ||
    tags.man_made === "borehole"
  ) {
    return "water_point";
  }
  if (
    tags.highway === "bus_stop" ||
    tags.public_transport === "station" ||
    tags.public_transport === "stop_position" ||
    tags.amenity === "bus_station"
  ) {
    return "transport";
  }
  if (
    tags.amenity === "pharmacy" ||
    tags.shop === "chemist" ||
    tags.healthcare === "pharmacy"
  ) {
    return "pharmacy";
  }
  // Tertiary/higher education and training centres — deliberately distinct from
  // the "school" bucket (OSM `amenity=college` is post-secondary).
  if (
    tags.amenity === "university" ||
    tags.amenity === "college" ||
    tags.office === "educational_institution"
  ) {
    return "university";
  }
  if (
    tags.office === "government" ||
    tags.office === "administrative" ||
    tags.amenity === "townhall" ||
    tags.amenity === "courthouse" ||
    tags.amenity === "police" ||
    tags.amenity === "fire_station" ||
    tags.amenity === "post_office"
  ) {
    return "government";
  }
  if (
    tags.aeroway === "aerodrome" ||
    tags.aeroway === "airstrip" ||
    tags.aeroway === "helipad" ||
    tags.amenity === "ferry_terminal" ||
    tags.amenity === "taxi" ||
    tags.amenity === "fuel" ||
    tags.man_made === "bridge" ||
    tags.man_made === "pier" ||
    tags.ford === "yes" ||
    tags.highway === "ford"
  ) {
    return "logistics";
  }
  // Vulnerable-population sites: refugee/IDP camps and mining sites (mining
  // camps are typically near a quarry, mine, mineshaft or adit).
  if (
    tags.amenity === "refugee_site" ||
    (tags.refugee !== undefined && tags.refugee !== "no") ||
    tags.landuse === "quarry" ||
    tags.industrial === "mine" ||
    tags.man_made === "mineshaft" ||
    tags.man_made === "adit"
  ) {
    return "vulnerable_site";
  }
  return null;
}

function labelFor(type: AssetType): string {
  switch (type) {
    case "school":
      return "School";
    case "church":
      return "Place of worship";
    case "market":
      return "Market";
    case "water_point":
      return "Water point";
    case "transport":
      return "Transport node";
    case "pharmacy":
      return "Pharmacy / drug store";
    case "university":
      return "University / college";
    case "government":
      return "Government office";
    case "logistics":
      return "Transport & logistics";
    case "vulnerable_site":
      return "Vulnerable-population site";
  }
}

// Single additive Overpass query. The original five category selectors are
// left exactly as they were (node-only). New categories are appended; some new
// features (universities, government offices, aerodromes, bridges, quarries,
// refugee sites) are areas/ways, so the union is emitted with `out center`
// instead of `out body` — for the original node selectors this is identical
// output (nodes always carry lat/lon), so no previously-returned asset is
// dropped; the change is purely additive. The element cap is raised to fit the
// extra categories. A two-query split (legacy + new) was rejected because
// Overpass enforces a shared per-process throttle (OVERPASS_MIN_INTERVAL_MS),
// which would make the second call return [] under normal usage.
function buildQuery(lat: number, lng: number, radiusM: number): string {
  const a = `around:${radiusM},${lat},${lng}`;
  return (
    `[out:json][timeout:25];(` +
    `node["amenity"="school"](${a});` +
    `node["amenity"="kindergarten"](${a});` +
    `node["amenity"="college"](${a});` +
    `node["amenity"="place_of_worship"](${a});` +
    `node["amenity"="marketplace"](${a});` +
    `node["shop"="supermarket"](${a});` +
    `node["amenity"="drinking_water"](${a});` +
    `node["man_made"="water_well"](${a});` +
    `node["man_made"="water_tap"](${a});` +
    `node["man_made"="borehole"](${a});` +
    `node["highway"="bus_stop"](${a});` +
    `node["amenity"="bus_station"](${a});` +
    `node["public_transport"="station"](${a});` +
    // Pharmacies / drug stores
    `nwr["amenity"="pharmacy"](${a});` +
    `nwr["shop"="chemist"](${a});` +
    `nwr["healthcare"="pharmacy"](${a});` +
    // Universities / colleges / training centres (distinct from schools;
    // amenity=college is queried in the block above and classified as university)
    `nwr["amenity"="university"](${a});` +
    `nwr["office"="educational_institution"](${a});` +
    // Government / administrative offices
    `nwr["office"="government"](${a});` +
    `nwr["office"="administrative"](${a});` +
    `nwr["amenity"="townhall"](${a});` +
    `nwr["amenity"="courthouse"](${a});` +
    `nwr["amenity"="police"](${a});` +
    `nwr["amenity"="fire_station"](${a});` +
    `nwr["amenity"="post_office"](${a});` +
    // Transport & logistics: airstrips, helipads, ferries, river crossings,
    // bridges, piers, fuel stations, taxi ranks
    `nwr["aeroway"="aerodrome"](${a});` +
    `nwr["aeroway"="airstrip"](${a});` +
    `nwr["aeroway"="helipad"](${a});` +
    `nwr["amenity"="ferry_terminal"](${a});` +
    `nwr["amenity"="fuel"](${a});` +
    `node["amenity"="taxi"](${a});` +
    `node["ford"="yes"](${a});` +
    `node["highway"="ford"](${a});` +
    `nwr["man_made"="bridge"](${a});` +
    `nwr["man_made"="pier"](${a});` +
    // Vulnerable-population sites: refugee/IDP camps, mining sites
    `nwr["amenity"="refugee_site"](${a});` +
    `nwr["refugee"](${a});` +
    `nwr["landuse"="quarry"](${a});` +
    `nwr["industrial"="mine"](${a});` +
    `nwr["man_made"="mineshaft"](${a});` +
    `nwr["man_made"="adit"](${a});` +
    `);out center 200;`
  );
}

async function fetchAssets(
  lat: number,
  lng: number,
  radiusM: number,
): Promise<CommunityAsset[]> {
  const now = Date.now();
  if (now - lastOverpassAt < OVERPASS_MIN_INTERVAL_MS) return []; // throttle
  lastOverpassAt = now;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "VaxPlan/1.0 (health microplanning community assets)",
      },
      body: "data=" + encodeURIComponent(buildQuery(lat, lng, radiusM)),
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data: any = await res.json();
    const elements: any[] = Array.isArray(data?.elements) ? data.elements : [];
    const assets: CommunityAsset[] = [];
    for (const el of elements) {
      const elLat = typeof el.lat === "number" ? el.lat : el.center?.lat;
      const elLng = typeof el.lon === "number" ? el.lon : el.center?.lon;
      if (!isFiniteCoord(elLat, elLng)) continue;
      const type = classify(el.tags);
      if (!type) continue;
      const name = (el.tags?.name as string) || labelFor(type);
      assets.push({
        type,
        name,
        latitude: elLat,
        longitude: elLng,
        distanceKm: parseFloat(haversineKm(lat, lng, elLat, elLng).toFixed(2)),
      });
    }
    assets.sort((a, b) => a.distanceKm - b.distanceKm);
    return assets;
  } catch {
    return []; // timeout / abort / network — empty list
  }
}

/**
 * Discover community assets within `radiusKm` (clamped 1–5 km) of a point.
 * Always resolves (best-effort); returns [] when Overpass is unavailable.
 */
export async function discoverCommunityAssets(
  latitude: number,
  longitude: number,
  radiusKm: number,
): Promise<CommunityAsset[]> {
  if (!isFiniteCoord(latitude, longitude)) return [];
  const radius = Math.min(5, Math.max(1, Number.isFinite(radiusKm) ? radiusKm : 2));
  const radiusM = Math.round(radius * 1000);

  const key = `${latitude.toFixed(3)},${longitude.toFixed(3)}:${radiusM}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = fetchAssets(latitude, longitude, radiusM).finally(() =>
    inFlight.delete(key),
  );
  inFlight.set(key, promise);
  const value = await promise;
  // Cache only non-empty successes so a transient failure doesn't poison the
  // location for the full TTL.
  if (value.length > 0) {
    cache.set(key, { value, expires: Date.now() + TTL_MS });
  }
  return value;
}
