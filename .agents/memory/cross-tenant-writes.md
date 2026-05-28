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
