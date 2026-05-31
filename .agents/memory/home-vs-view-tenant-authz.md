---
name: Tenant scope in user-management authorization (set-password et al.)
description: Keep a route's tenant authority in lockstep with its sibling routes; reads use the view tenant, user-management writes use the operating tenant.
---

# Tenant scope in authorization checks

## The core rule
Do NOT make one route's tenant authorization stricter than its sibling routes
that operate on the same resource. `/api/auth/set-password` must grant the same
tenant authority as `POST/PATCH/DELETE /api/users`. Those routes let a
`national_admin` manage users in the tenant they are **operating in** —
`req.tenantId` (their home tenant, or a tenant they've switched to view via the
country switcher). `hasPermission` returns true for national_admin in ANY tenant
(cross-tenant skip), so user creation/deletion is already allowed cross-tenant.

**Why:** set-password originally ran only `isAuthenticated` (no tenant resolver)
and gated on the raw `caller.tenantId` column, which is frequently null for
legitimate admins (home tenant lives in the session / SSO domain / approved
invite). That caused a 403 on the create-user-with-password flow; the retry then
400'd ("email already exists") on the half-created user. A first fix restricted
to the HOME tenant (`caller.tenantId ?? session.tenantId`) — but that BROKE the
real workflow: admins manage *other* tenants via the switcher, so the created
user lives in the viewed tenant, not home. Because creation/deletion are NOT
home-restricted, making only password-setting home-restricted blocks legitimate
use while leaving the actual cross-tenant gap open.

**Correct check:** authorize set-password when `isSelf || isPlatformAdmin ||
(isNationalAdminRole && target.tenantId === req.tenantId)`, with
`caller.tenantId`/`session.tenantId` only as fallbacks if `req.tenantId` is
unset. Recognize national-admin from BOTH `user.role` and `user.roles[]`
(mirror `hasPermission`'s `hasNationalAdminRole`); gating on the `role` string
alone wrongly rejects admins whose role lives only in the array. Mirror the same
role logic in the client gate (`hasPasswordRole`).

## Home-only writes are aspirational, not enforced
`replit.md` claims a `crossTenantWriteGuard` rejects writes outside the home
tenant — it does NOT exist (see cross-tenant-writes.md). Until a unified guard
is added and applied to ALL user-management routes together, every such route
authorizes against the operating tenant (`req.tenantId`). Don't half-enforce the
home-only model on a single route.

**How to apply:** For user-management writes, scope to `req.tenantId`. For pure
reads, `req.tenantId` (view tenant) is also correct. Reserve home-tenant
comparisons for when a real, uniformly-applied cross-tenant write guard exists.
