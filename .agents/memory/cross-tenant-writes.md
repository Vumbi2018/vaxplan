---
name: Cross-tenant write enforcement
description: What actually enforces (and doesn't enforce) cross-tenant write isolation in VaxPlan, vs what replit.md claims.
---

The architecture section of `replit.md` states that "Writes outside the user's home tenant are rejected with HTTP 403 by `crossTenantWriteGuard`." As of May 2026 this is **not true** in the codebase:

- There is no `server/middleware/` directory and no `crossTenantWriteGuard` symbol anywhere in `server/` or `shared/`.
- The only `crossTenant` references in `server/routes.ts` are a boolean flag (`!!(actingUser?.tenantId && actingUser.tenantId !== req.tenantId)`) attached to audit-log entries — observational, not preventative.
- Reads and writes after `POST /api/me/switch-tenant` operate against `session.viewTenantId`, scoped through `tenantContext`. Nothing actively blocks a write from being committed against the viewed tenant.

**Why this matters:** when writing user-facing docs (e.g. the Standards Alignment page) or threat-modeling outputs, do not cite the guard as shipped. Describe the real control (tenantContext scoping + audit `crossTenant` flag) and call the 403-guard out as a recommendation/gap.

**How to apply:** before claiming any middleware named `*Guard` exists, `rg -n "<name>" server/ shared/` to confirm. The architect catches this kind of overclaim — trust the codebase over `replit.md` when they disagree, and note the drift here.

**Per-endpoint enforcement does exist in places.** Some sensitive handlers enforce same-tenant inline rather than via middleware — e.g. `POST /api/auth/set-password` allows the caller only if self, platform admin (`isPlatformAdmin`, any tenant), OR a same-tenant national admin (`target.tenantId === caller.tenantId`). A non-platform national admin browsing another country (via `viewTenantId`) therefore gets a correct 403 on writes there.

**Do NOT gate UI write controls on a client-side home-vs-viewed-tenant comparison — gate on ROLE only.** We tried twice to mirror the server's home-tenant rule on the client and both failed:
1. Async `useQuery(["/api/me/tenant"])` fail-closed → momentarily `undefined` (shared 5-min staleTime, GC, not-yet-fetched) wrongly hid the control from home-tenant admins.
2. Synchronous `currentUser.tenantId === localStorage active tenant` → **also wrong**, because a user's home tenant is resolved server-side from `users.tenantId` **then SSO domain mapping then approved signup invite** (see replit.md). So `currentUser.tenantId` is frequently `null`/absent for a legitimate home-tenant admin, the comparison is a false negative, and the field vanishes on the user's own tenant.

**The fix that works:** gate sensitive write controls on role only (`isPlatformAdmin || national_admin || national_program_manager`) and let the server's per-endpoint 403 (e.g. `POST /api/auth/set-password`) be the real cross-tenant boundary. The reset/create mutation already surfaces that 403 as a destructive toast, which is acceptable UX for the rare cross-tenant attempt. **Why:** the client cannot reliably know a user's home tenant (it isn't always `users.tenantId`), so any client-side home detection will false-negative; a UI affordance must default visible for the common case and rely on the server as the boundary.
