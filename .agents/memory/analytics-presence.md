---
name: Site-activity presence & map location
description: How "online now" presence and the live user map are kept accurate without corrupting visit-history analytics.
---

# Site-activity presence & map location

Two separate concerns share the `page_views` table and must NOT be conflated:
**visit history** (immutable events) and **presence** ("who is online now").

## Rule: never mutate `created_at` to keep a user "online"
`created_at` is the immutable event time. ALL visit aggregates key off it —
visits-today, 30d totals, 14d trend, top pages, locations. There is a separate
nullable `last_seen_at` column purely for presence.

- Navigation (`recordPageView`) INSERTs a row and stamps `last_seen_at = now`.
- A client heartbeat (`touchPresence`) UPDATEs ONLY `last_seen_at` + the live-map
  fields (`country/region/city/latitude/longitude`) on the user's most recent
  row when it is recent (≤30 min); otherwise it INSERTs a fresh row (genuine
  return after being away). It must never touch `created_at` or `path`.
- "Online now" queries (`getOnlineCount`, online list in `getTrafficAnalytics`)
  filter/order by `coalesce(last_seen_at, created_at)` within a 5-min window.
  Old rows predating the column fall back to `created_at` via the coalesce.

**Why:** an earlier version bumped `created_at` on every heartbeat. A long-open
visible tab then carried one old visit forward indefinitely and across midnight,
silently inflating "visits today" and skewing trend/top-page windows.

## Map location: prefer device GPS over IP geolocation
IP geolocation (ipapi.co) resolves only to the ISP's registered city — in many
countries that is always the capital (e.g. a user in Solwezi showed as Lusaka).
The client requests browser GPS once and sends `lat/lng` on track/heartbeat;
the server prefers GPS, reverse-geocodes it for a label via Nominatim
(`reverseGeo` in `server/services/geo.ts`), and only falls back to IP geo when no
usable GPS is sent. Districts/provinces have NULL coordinates — only facilities
carry lat/long — so an unassigned admin's pin can ONLY come from device GPS.

## Heartbeat / rate-limit constraints
- Heartbeat interval is well inside the 5-min online window and the per-user
  `/api/analytics/track` limiter (40/60s). Heartbeats pause when the tab is
  hidden (visibility check) and fire on `visibilitychange → visible`.
- `reverseGeo` is best-effort: per-~1km-bucket cache + in-flight coalescing +
  a global ~1.1s min-interval gate so bursts can't breach Nominatim's ~1 req/s.
  On any failure/throttle it returns nulls; the pin still shows from raw coords.

## Schema-change gotcha
`InsertPageView = Omit<PageView, "id" | "createdAt" | "tenantId" | "lastSeenAt">`
— `lastSeenAt` must stay in the Omit list or every `recordPageView` call site
would be forced to pass it. The storage methods stamp it internally.
Migrations here are hand-written idempotent numbered SQL files in `migrations/`
(no startup runner); add a new `00NN_*.sql` matching the latest one's style.
