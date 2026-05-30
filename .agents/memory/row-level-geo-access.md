---
name: Row-level geographic read access (IDOR)
description: How within-tenant facility/district/province read scoping works in VaxPlan and the IDOR class to watch for on single-record and nested reads.
---

Within-tenant isolation in VaxPlan has two layers: tenant scoping (storage `withTenant`) AND row-level geographic scoping (a `facility_clerk` must see only their own facility's rows, district/province users only their area).

**The recurring bug class:** list endpoints (`/api/facilities`, `/villages`, `/population`, `/microplans`, `/monthly-reports`) narrow by the caller's geo scope, but single-record `/:id` reads, hydration/consolidated endpoints, and nested sub-resources (`/facilities/:id/catchments`, `/facilities/:id/excluded-villages`, `/sessions/:sessionId/days`, `/microplans/:id/hydration`) historically only checked the tenant — so a non-admin who guesses an integer id could read rows outside their scope (IDOR). Any new read endpoint that returns facility/district/province-scoped data must apply the same row-level gate and return **404** (not 403) on deny, to match the list behavior of "you can't even see it exists."

**Two gate helpers, keep them consistent:**
- `hasPermission(dbUser, perm, GeographicContext)` in `server/auth/authorization.ts` — permission + geo. Used for session reads (`view_session_plans`).
- `userCanAccessGeo(dbUser, tenantId, {facilityId,districtId,provinceId})` in `server/routes.ts` — pure geo gate for endpoints with no specific view permission.

`userCanAccessGeo` must mirror `hasPermission`'s geo rules exactly, or the two drift:
1. `isPlatformAdmin` and `national_admin` bypass.
2. **Cross-tenant skip:** when the record's tenant != the user's HOME tenant (`dbUser.tenantId`), skip the geo check entirely — home-tenant facility/district/province IDs are meaningless in a visited tenant (PKs aren't shared, may collide). Skipping this *over-blocks* legitimate cross-tenant browsing.
3. Prefer explicit `dataAccessScope` (arrays of provinces/districts/facilities); fall back to legacy single columns (`user.facilityId/districtId/provinceId`).
4. A user with NO geo scope keeps tenant-wide read (matches list endpoints, which only narrow when a scope is set).

**Why:** the architect repeatedly flags both the IDOR holes and helper/`hasPermission` drift. **How to apply:** when adding any geo-scoped read route, gate it and grep `userCanAccessGeo`/`hasPermission` call sites to confirm the new route follows the same 404-on-deny pattern.
