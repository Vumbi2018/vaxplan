// Best-effort IP geolocation for the site-activity analytics panel.
//
// Resolves a coarse location (country / region / city) from a request IP so the
// dashboard can show "where users are logged in from". This is intentionally
// best-effort: results are cached in memory, private/local addresses short-
// circuit to "Local network", and any lookup failure (no network, rate limit,
// timeout) resolves to nulls rather than throwing. Analytics must never block
// or break a request just because geo lookup is unavailable.

export interface GeoInfo {
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

const EMPTY: GeoInfo = { country: null, region: null, city: null, latitude: null, longitude: null };
const LOCAL: GeoInfo = { country: "Local network", region: null, city: null, latitude: null, longitude: null };

// Cache lookups for a day; IP→location is stable enough for analytics.
const TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { value: GeoInfo; expires: number }>();
// Coalesce concurrent lookups for the same IP into a single outbound request.
// Page-view tracking fires fire-and-forget on every navigation, so without this
// a burst of rapid navigations would hit the geo provider many times for the
// same IP and trip its free-tier rate limit (resolving to "Unknown").
const inFlight = new Map<string, Promise<GeoInfo>>();

export function normalizeIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let ip = String(raw).trim();
  // x-forwarded-for can be a comma-separated list; the client is the first.
  if (ip.includes(",")) ip = ip.split(",")[0].trim();
  // Strip IPv6-mapped IPv4 prefix (::ffff:127.0.0.1 → 127.0.0.1).
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  return ip || null;
}

export function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  if (ip === "::1" || ip === "127.0.0.1" || ip === "localhost") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("169.254.")) return true;
  // 172.16.0.0 – 172.31.255.255
  const m = ip.match(/^172\.(\d+)\./);
  if (m) {
    const second = Number(m[1]);
    if (second >= 16 && second <= 31) return true;
  }
  // IPv6 unique-local / link-local
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return true;
  return false;
}

export async function lookupGeo(rawIp: string | null | undefined): Promise<GeoInfo> {
  const ip = normalizeIp(rawIp);
  if (!ip) return EMPTY;
  if (isPrivateIp(ip)) return LOCAL;

  const cached = cache.get(ip);
  if (cached && cached.expires > Date.now()) return cached.value;

  // Share a single outbound lookup across concurrent callers for this IP.
  const pending = inFlight.get(ip);
  if (pending) return pending;

  const promise = fetchGeo(ip).finally(() => inFlight.delete(ip));
  inFlight.set(ip, promise);
  return promise;
}

async function fetchGeo(ip: string): Promise<GeoInfo> {
  let value: GeoInfo = EMPTY;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    // Use an HTTPS provider (ipapi.co) so the request IP is never sent in
    // cleartext. Its free tier works server-side and returns coarse location.
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      signal: controller.signal,
      headers: { "User-Agent": "VaxPlan/1.0 (analytics)" },
    });
    clearTimeout(timer);
    if (res.ok) {
      const data: any = await res.json();
      if (data && !data.error) {
        const lat = typeof data.latitude === "number" ? data.latitude : Number(data.latitude);
        const lng = typeof data.longitude === "number" ? data.longitude : Number(data.longitude);
        value = {
          country: data.country_name || null,
          region: data.region || null,
          city: data.city || null,
          latitude: Number.isFinite(lat) ? lat : null,
          longitude: Number.isFinite(lng) ? lng : null,
        };
      }
    }
  } catch {
    // network error / timeout / abort — fall through to EMPTY
    value = EMPTY;
  }

  // Only cache successful resolutions. Caching a failure (EMPTY) would poison
  // this IP's location for the full TTL after a single transient hiccup, so we
  // let failed lookups retry on the next request instead.
  if (value.country || value.region || value.city) {
    cache.set(ip, { value, expires: Date.now() + TTL_MS });
  }
  return value;
}
