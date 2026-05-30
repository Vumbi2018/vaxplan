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

**UI write controls must mirror the server's home-tenant rule.** Gating a write-only control on role alone is a bug when cross-tenant browsing is possible: the control shows but the write 403s. Compare the **viewed** tenant (`useQuery(["/api/me/tenant"]).id`) against the user's **home** tenant (`user.tenantId` from `/api/auth/user` = `req.dbUser`) and hide non-platform-admin write controls when they differ. The `user` object carries the home tenant, not the viewed one.
