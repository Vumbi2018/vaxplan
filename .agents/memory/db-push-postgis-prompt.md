---
name: db:push PostGIS rename prompt + migration convention
description: Why db:push is unsafe here and how schema changes are actually applied
---

`npm run db:push` (drizzle-kit push) prompts interactively and, when the schema
adds a brand-new table, drizzle may offer to *rename* an unrelated extra DB table
into it — notably the PostGIS system table `spatial_ref_sys`. Accepting that
rename is destructive.

**Why:** the DB carries PostGIS system tables that aren't in `shared/schema.ts`,
so drizzle sees them as "extra" and pairs them with new schema tables as possible
renames. Blindly hitting enter on the default can drop/rename a system table.

**How to apply:** Do NOT run an unattended `db:push` when adding tables. For
plain column additions, either:
- run idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` directly (via the
  executeSql callback), and/or
- add a hand-written numbered file in `migrations/` (e.g. `0010_*.sql`) using
  `IF NOT EXISTS`.

The `migrations/meta/_journal.json` only tracks the first few (0000–0002);
everything from 0003 onward is hand-written raw SQL applied outside
`drizzle-kit migrate`. Follow that pattern — bump the number, keep it idempotent.
