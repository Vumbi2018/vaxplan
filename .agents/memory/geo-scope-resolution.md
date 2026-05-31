---
name: Geo scope resolution
description: How hierarchical data-visibility (facility/district/province) is enforced and the three resolver paths that must agree.
---

# Role-aware geographic scope

Data visibility is gated by ROLE, not just `dataAccessScope`. A facility user's
`data_access_scope` often carries `provinces[]`/`districts[]` too — those are the
facility's hierarchy *path*, not an access grant. Treating them as grants made a
`facility_clerk` see their whole province.

**Rule:** role caps the maximum granularity.
- facility_clerk / facility_in_charge → facilities only
- district_manager → districts (+ explicit facility grants)
- provincial_coordinator → provinces (+ explicit district/facility grants)
- national_admin / gis_specialist / platform-admin / cross-tenant / unknown-role-with-no-scope → whole tenant

**Why:** unioning all three scope arrays leaks parent-area data to narrowly-scoped staff.

**Fail closed:** a hierarchical (scoped) role whose area cannot be resolved must
see NOTHING, never tenant-wide. Only non-scoped roles default to tenant-wide.

## Three resolver paths that MUST stay in agreement (server/routes.ts)
All three share `resolveRoleScopeIds(dbUser)`:
- `getGeoScope` — precomputes ID sets for list endpoints (expands province→district→facility).
- `userCanAccessGeo` — per-record gate for single-entity reads.
- `getScopedFacilityIds` — facility-id allowlist for indicator aggregates (dropout/defaulters/zero-dose).

**How to apply:** any new geo-sensitive list/record endpoint must route through one
of these helpers. Do NOT reintroduce `hasPermission(...geo...)` for read filtering —
`hasPermission` still UNIONS scope arrays (not role-capped) and will leak for facility staff.

## Known remaining gaps (not yet role-capped)
`hasPermission`'s geo branch is still scope-union; routes that filter reads via it
(`/api/clients`, `/api/clients/:id`, `/api/session-day-plans`, `/api/catchments*`)
can still spill parent-area data for facility staff.
