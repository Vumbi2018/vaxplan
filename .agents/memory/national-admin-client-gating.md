---
name: National-admin-only client gating
description: When a server route is national_admin-only, the client gate must match — isAdmin() is too broad.
---

For any feature whose server mutation routes are gated by `requireAdmin`
(national_admin only, by `req.user.dbRole`), the client UI must gate on
`user.role === "national_admin"` — NOT the `isAdmin()` helper.

**Why:** `isAdmin()` in `client/src/lib/permissions.ts` returns true for
`national_admin` OR `gis_specialist`. Using it to show admin-only UI lets
gis_specialists see buttons/editors they cannot actually use (server returns
403), which is a confusing UX and a policy/authorization mismatch.

**How to apply:** Mirror the server's exact role set on the client. For
national_admin-only surfaces (e.g. supervision checklist template builder,
custom map layers) check the role string directly. This already bit the
supervision checklist template feature in code review.
