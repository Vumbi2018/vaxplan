---
name: VaxPlan database restore strategy
description: How to repopulate the database when CSV seed files are absent
---

The geographic seed migration scripts (003-zambia, 004-south-sudan, 006-png, 010-south-africa) require CSV files under `data/zambia/`, `data/south_sudan/`, `data/png/`, `data/south_africa/`. These CSV files are NOT committed to the repo.

**Restore strategy:** Use `local_dump.sql.zip` (root of project, ~137MB compressed, ~29MB zip) which is a full PostgreSQL COPY-format dump of a working local database.

Steps:
1. `unzip -o local_dump.sql.zip -d /tmp/`
2. `grep -v '\\restrict' /tmp/local_dump.sql > /tmp/local_dump_clean.sql` (strip Replit security header)
3. Truncate conflicting tables: `TRUNCATE TABLE facilities, districts, provinces, regions, tenants ... RESTART IDENTITY CASCADE`
4. `psql "$DATABASE_URL" -f /tmp/local_dump_clean.sql`
5. After restore, reset all user passwords: run `UPDATE users SET password_hash = <bcryptjs hash of vaxplan2024>`

**Why:** The dump was created from a dev environment that had all 4 geographic migrations run. It contains 9,931 total facilities across ZMB/SSD/PNG/ZAF.

**How to apply:** Any time you get `[ZMB] tenant not found` or facilities/provinces/districts are 0 for a tenant.
