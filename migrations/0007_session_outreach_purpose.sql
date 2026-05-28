-- Task #197: Persist an explicit outreach purpose on session_plans so that
-- defaulter follow-up sessions stay filterable/reportable even if a planner
-- renames the auto-prefilled session name. Values written by the API today:
--   'defaulter_followup' | 'unserved' | 'routine_outreach'
-- Kept as a free-form varchar (not an enum) so new map prefill kinds can be
-- added without an enum migration.
-- Idempotent: safe to re-run against environments where the column was
-- already created via drizzle-kit push.

ALTER TABLE "session_plans"
  ADD COLUMN IF NOT EXISTS "outreach_purpose" varchar(32);

CREATE INDEX IF NOT EXISTS "idx_session_plans_outreach_purpose"
  ON "session_plans" ("tenant_id", "outreach_purpose");
