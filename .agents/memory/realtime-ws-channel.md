---
name: Realtime websocket change channel
description: How VaxPlan's tenant-scoped live-sync websocket is designed and its non-obvious gotchas.
---

# Realtime tenant-scoped change channel

The live-sync nudge is intentionally minimal: the server never pushes row data
over the socket, only a small `{type:"changed", tenantId}` poke. Clients respond
with their normal authenticated `/api/sync/pull`, reusing all existing
tenant-scoping/auth. It is layered on top of the reliable interval sync and is
fully optional — if the socket can't connect, interval sync keeps clients
eventually-consistent.

**Why a single `res.on('finish')` middleware generates the pokes:** broadcasting
from one Express middleware after any successful mutating `/api` request (status
2xx, non-GET) covers BOTH normal REST writes and the offline `/api/sync/batch`
replay with zero per-handler coupling. GETs never poke, so a client's own pull
can't create a feedback loop. Pokes are debounced per tenant so write bursts
collapse into one nudge. The middleware reads `req.tenantId`, which `requireTenant`
sets during routing — available by the time `finish` fires.

**Gotcha — coexisting with Vite HMR on the same httpServer:** the websocket
upgrade listener must handle ONLY its own path (`/ws`) and `return` without
touching the socket for any other path. Vite's HMR attaches its own `upgrade`
listener to the same server; if you destroy/respond to non-`/ws` upgrades you
break HMR. Multiple `upgrade` listeners coexist fine as long as each ignores
paths it doesn't own.

**Auth on upgrade:** run the same express-session middleware on the upgrade
`req` (with a stub `res` exposing no-op `on/end/setHeader/...`) to populate
`req.session`, then check `session.passport.user`. The client passes the viewed
tenant via `?tenantId=` query param (cross-tenant browsing means any authed user
may read any active tenant, so scoping the read stream to the requested tenant is
fine; writes are still REST-guarded).
