---
name: VaxPlan schema drift pattern
description: New columns in schema.ts often need explicit DB migrations; not auto-applied
---

Drizzle ORM is used declaratively but migrations are hand-written. New columns added to `shared/schema.ts` are NOT automatically applied to the database. They must be added via a migration file in `server/migrations/` and called from `server/index.ts` startup.

**Pattern for adding a column:**
1. Create `server/migrations/0NN-description.ts` exporting `async function applyXxx()`
2. Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (idempotent)
3. Import and call it in `server/index.ts` alongside `applyVillageColumns`, `applyOutreachColumns`, etc.

**Known drift fixed:**
- `microplans`: missing `submitted_at`, `auto_approve_at`, `reminder_sent_at`, `district_edit_reason` → added in `015-microplan-approval-columns.ts`

**Why:** The project has no auto-migration runner. Each new column needs a `ADD COLUMN IF NOT EXISTS` migration. Errors show as `column "xyz" of relation "tablename" does not exist` in the seed/startup logs.

**How to apply:** When you see that error, check `shared/schema.ts` for the column definition and create a migration using the pattern in `server/migrations/014-outreach-columns.ts`.
