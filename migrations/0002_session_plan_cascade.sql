-- Task #32: Enforce Microplan → SessionPlan parent cascade and split Routine vs SIA.
--
-- 1) Create the session_plan_type enum.
-- 2) Convert session_plans.plan_type from varchar to that enum (defaulting nulls/unknowns to 'routine').
-- 3) Backfill orphan sessions (microplan_id IS NULL) by auto-creating an
--    "Unassigned Q{q} {year}" parent microplan per (tenant, facility, year, quarter, plan_type)
--    and attaching the orphans to it.
-- 4) Make session_plans.microplan_id NOT NULL.
-- 5) Add an index on session_plans.microplan_id.

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

-- Backfill orphan sessions: create one "Unassigned Q{q} {year}" microplan per
-- (tenant_id, facility_id, year, quarter, plan_type) that has orphans, then
-- attach those orphans. plan_type on microplans is the existing free varchar:
-- 'facility_routine' for routine sessions, 'sia_campaign' for campaign sessions.
WITH orphan_groups AS (
  SELECT DISTINCT
    sp.tenant_id,
    sp.facility_id,
    sp.year,
    sp.quarter,
    sp.plan_type AS session_plan_type
  FROM session_plans sp
  WHERE sp.microplan_id IS NULL
), created AS (
  INSERT INTO microplans (
    tenant_id, facility_id, name, year, quarter, plan_type, status, created_at, updated_at
  )
  SELECT
    og.tenant_id,
    og.facility_id,
    'Unassigned Q' || og.quarter || ' ' || og.year || ' ('
      || CASE WHEN og.session_plan_type = 'campaign' THEN 'SIA' ELSE 'Routine' END || ')',
    og.year,
    og.quarter,
    CASE WHEN og.session_plan_type = 'campaign' THEN 'sia_campaign' ELSE 'facility_routine' END,
    'draft',
    NOW(),
    NOW()
  FROM orphan_groups og
  RETURNING id, tenant_id, facility_id, year, quarter, plan_type
)
UPDATE session_plans sp
SET microplan_id = c.id
FROM created c
WHERE sp.microplan_id IS NULL
  AND sp.tenant_id = c.tenant_id
  AND sp.facility_id = c.facility_id
  AND sp.year = c.year
  AND sp.quarter = c.quarter
  AND (
    (sp.plan_type::text = 'campaign' AND c.plan_type = 'sia_campaign')
    OR (sp.plan_type::text = 'routine' AND c.plan_type = 'facility_routine')
  );

ALTER TABLE session_plans
  ALTER COLUMN microplan_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_session_plans_microplan
  ON session_plans(microplan_id);
