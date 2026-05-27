-- Task #32: Enforce Microplan → SessionPlan parent cascade and split Routine vs SIA.
-- This migration:
--   1) Creates the session_plan_type enum.
--   2) Converts session_plans.plan_type from varchar to the enum (defaulting unknowns to 'routine').
--   3) Makes session_plans.microplan_id NOT NULL.
--   4) Adds an index on session_plans.microplan_id.
--
-- NOTE: This migration assumes any pre-existing rows already have a non-null microplan_id
-- and a plan_type value in {'routine','campaign'}. The development DB was empty at the time
-- this was authored, so no backfill step is included. For a populated environment, run a
-- backfill first (assign each orphaned session to a parent microplan and normalise plan_type)
-- before applying this migration.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_plan_type') THEN
    CREATE TYPE session_plan_type AS ENUM ('routine', 'campaign');
  END IF;
END $$;

ALTER TABLE session_plans
  ALTER COLUMN plan_type DROP DEFAULT;

ALTER TABLE session_plans
  ALTER COLUMN plan_type TYPE session_plan_type
  USING (
    CASE
      WHEN plan_type IS NULL THEN 'routine'
      WHEN plan_type = 'campaign' THEN 'campaign'
      ELSE 'routine'
    END
  )::session_plan_type;

ALTER TABLE session_plans
  ALTER COLUMN plan_type SET DEFAULT 'routine'::session_plan_type;

ALTER TABLE session_plans
  ALTER COLUMN plan_type SET NOT NULL;

ALTER TABLE session_plans
  ALTER COLUMN microplan_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_session_plans_microplan
  ON session_plans(microplan_id);
