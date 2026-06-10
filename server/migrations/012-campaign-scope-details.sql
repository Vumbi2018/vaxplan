-- Migration 012: Add campaign_scope_details column to microplans
-- This stores the selected province / district / facility IDs when a SIA
-- campaign scope is "Sub-national" or "Targeted" (nullable JSONB).
--
-- Safe to run multiple times: uses IF NOT EXISTS column guard.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'microplans'
      AND column_name = 'campaign_scope_details'
  ) THEN
    ALTER TABLE microplans
      ADD COLUMN campaign_scope_details jsonb;
  END IF;
END $$;
