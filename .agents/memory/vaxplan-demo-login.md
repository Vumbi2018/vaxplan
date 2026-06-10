---
name: VaxPlan demo login credentials
description: How demo users are structured and what password to use for testing
---

All demo users follow the pattern `demo+<slug>@<tenantCode-lower>.vaxplan.test`.

National admin emails (all use password **vaxplan2024**):
- `demo+national-admin@zmb.vaxplan.test`
- `demo+national-admin@ssd.vaxplan.test`
- `demo+national-admin@png.vaxplan.test`
- `demo+national-admin@zaf.vaxplan.test`

**Why:** The seed script (`server/migrations/006-seed-demo-operational.ts`) uses `emailFor(tenantCode, slug)` which lowercases the code. All hashes use `bcryptjs` (not `bcrypt`). The password "vaxplan2024" was set via `hashPassword()` in `server/auth/passwordAuth.ts`.

**How to apply:** If login returns 401, check that `password_hash IS NOT NULL` for the user and that it was hashed with bcryptjs not native bcrypt (the app uses bcryptjs throughout).
