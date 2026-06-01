---
name: Walking-time isochrones
description: How the Settlement Intelligence Travel-Time Zones layer computes road-network walking zones and why it needs a provider key.
---

The Travel-Time Zones map layer renders 1/2/3-hour walking zones around
facilities as true road/path-network isochrones, not plain circles.

**Provider:** OpenRouteService (`foot-walking` isochrones endpoint), gated on
`OPENROUTESERVICE_API_KEY`.

**Why ORS, not OSRM:** the keyless public OSRM demo server only does routes
(`/route`), it has no isochrone service. ORS does isochrones over the OSM
walking graph but requires an API key. So this is the one place that needs a
secret; everything else (travel-time-to-nearest-facility) stays keyless OSRM.

**How to apply:**
- Server `getWalkingIsochrones(tenantId)` in `server/services/routing.ts`:
  batches active facilities (5/request, ORS free-tier cap; max 25 facilities),
  range_type=time with WALK_ISOCHRONE_BANDS seconds, caches 24h, coalesces
  in-flight. Returns `{ available:false, reason }` when no key / provider fails
  / no facilities — never throws.
- Endpoint `GET /api/geo/isochrones` (auth + tenant) must never 500 the layer;
  on error it returns available:false so the client keeps its circles.
- Client `SettlementIntelligence.tsx` renders ORS polygons (GeoJSON [lng,lat]
  -> Leaflet [lat,lng]; handle Polygon AND MultiPolygon; draw larger bands
  first) only when features exist, else falls back to the dashed circles.
