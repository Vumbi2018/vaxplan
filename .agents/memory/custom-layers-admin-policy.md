---
name: Custom layers admin gating
description: Which roles can manage custom map layers, and why client/server must agree
---

Custom-layer management (upload/patch/delete of admin map layers) is **national_admin only**.

**Why:** Server `requireAdmin` middleware checks `role === "national_admin"` exclusively (it does NOT include gis_specialist, despite the client `isAdmin()` helper which does). Gating the admin page with `isAdmin()` let gis_specialists open the page but get 403 on every mutation — a silent dead-end. The page now gates on `user.role === "national_admin"` to match the server.

**How to apply:** Any new admin-only management surface protected server-side by `requireAdmin` must gate the client UI on `national_admin` directly, NOT on the broader `isAdmin()` helper. The sidebar already routes most `/admin/*` items through `isNationalAdmin`.

Related: untrusted uploaded feature attributes (GeoJSON/CSV/Shapefile) must be HTML-escaped before going into Leaflet `bindPopup` HTML strings — they are a stored-XSS vector otherwise.
