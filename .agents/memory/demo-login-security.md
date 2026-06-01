---
name: Public demo one-click login security model
description: How the landing-page "Select a Test Identity" demo login is kept safe (no password in bundle, pinned tenant, immutable-ID gate).
---

# Public demo one-click login

The public landing page signs into pre-seeded demo identities with one click,
with no Replit-OIDC redirect. Hard-won constraints (a first attempt violated all
of these and failed review):

**Rules**
- NEVER ship a demo password in the client bundle. The demo accounts carry
  `passwordHash: null`; auth happens only through a dedicated server endpoint
  (`POST /api/auth/demo-login`) that takes just `{email}` — no password.
- Only expose LOW-privilege, geographically-scoped roles publicly (Provincial
  Coordinator / District Manager / Facility Clerk). NEVER a national_admin demo
  card. If an admin demo row was ever seeded, retire it (isActive=false +
  passwordHash=null) by its fixed id.
- Seeding is pinned to ONE demo tenant resolved by tenant `code` (ZMB). NEVER
  fall back to "first active tenant" — that can drop public accounts into the
  wrong live tenant. If the demo tenant is missing, skip seeding and log loudly.
- Seed by matching the FIXED demo `id` (not email), so you only ever touch your
  own seed rows and never collide with a real user.
- The login endpoint defends in depth: same-origin (Origin/Referer host ==
  Host) check to block login-CSRF, plus the resolved user must be active, its
  `id` ∈ immutable demo-id set, AND its `tenantId` == the demo tenant. Email
  allowlist alone is not enough.

**Why:** demo cards are public and unauthenticated; the threat is a stranger (or
a forced cross-site request) gaining a privileged or wrong-tenant session. Low
privilege + tenant pinning + immutable-id gate keep blast radius to a sandbox.

**How to apply:** any future demo/sandbox identity work — keep secrets out of the
bundle, pin the tenant by code with no fallback, gate by id+tenant, and never
add an admin-level public demo.
