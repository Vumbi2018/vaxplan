---
name: Home-tenant vs view-tenant in authorization checks
description: Which tenant to compare against when authorizing tenant-scoped writes, and why req.tenantId is wrong for "is this my tenant" gates.
---

# Home tenant vs view (active) tenant in authz

When authorizing a sensitive tenant-scoped action ("can this admin manage a user
in tenant X?"), compare the target against the caller's **HOME** tenant, not the
**active/view** tenant.

- `req.tenantId` (set by `tenantContext`) follows `session.viewTenantId` first —
  it is the tenant the user is *currently browsing* in the cross-tenant model.
  Using it for a "same tenant as me" gate lets any user `POST /api/me/switch-tenant`
  to a foreign tenant and then pass the check there (privilege escalation).
- The raw `users.tenantId` column (`caller.tenantId`) is **frequently null** for
  legitimate national admins — their home tenant is resolved via SSO email-domain
  mapping or an approved signup invite, and carried in `session.tenantId`, not the
  column. Comparing solely against `caller.tenantId` produces spurious 403s.

**Correct home-tenant resolution:** `caller.tenantId ?? req.session?.tenantId ?? null`,
then require `target.tenantId === homeTenantId`. `session.tenantId` only ever holds
the HOME tenant: login sets it to the home tenant, `tenantContext` writes it from
`users.tenantId`/SSO/invite, and `switch-tenant` mutates only `viewTenantId` — never
`session.tenantId`.

**Why:** `/api/auth/set-password` originally ran only `isAuthenticated` (no tenant
resolver) and gated on `caller.tenantId`, so the create-user flow (create → set
initial password) 403'd whenever that column was null, then a retry 400'd
("email already exists") on the half-created user. The first fix used `req.tenantId`
and reopened a cross-tenant password-reset hole; the right boundary is the home
tenant.

**How to apply:** Any authz gate of the form "target belongs to the caller's
tenant" for a *write* must use the home-tenant resolution above. Reserve
`req.tenantId` for read scoping (where visiting another tenant is intended). Also
recognize privileged roles from BOTH `user.role` and the `user.roles[]` array
(mirror `hasPermission`'s `hasNationalAdminRole`) — gating on the `role` string
alone wrongly rejects admins whose role lives only in the array.
