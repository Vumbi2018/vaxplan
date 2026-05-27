-- Backfill migration for columns/tables introduced by recent merged tasks
-- that landed in shared/schema.ts but never produced their own SQL migration.
-- Everything here is idempotent (IF NOT EXISTS / DO $$ guards) so it is safe
-- to re-run against environments where parts were already drizzle-pushed.
--
-- Covers:
--   1) session_plans       — completed_at, vaccinated_counts, supporting index
--   2) session_day_plans   — completed_at, vaccinated_counts
--   3) population_refresh_jobs — full table + supporting enums + indexes

-- ---------------------------------------------------------------------------
-- 1) Session completion tracking
-- ---------------------------------------------------------------------------
ALTER TABLE "session_plans"
  ADD COLUMN IF NOT EXISTS "completed_at" timestamp;

ALTER TABLE "session_plans"
  ADD COLUMN IF NOT EXISTS "vaccinated_counts" jsonb;

CREATE INDEX IF NOT EXISTS "idx_session_plans_completed_at"
  ON "session_plans" ("completed_at");

-- ---------------------------------------------------------------------------
-- 2) Session day-plan completion tracking
-- ---------------------------------------------------------------------------
ALTER TABLE "session_day_plans"
  ADD COLUMN IF NOT EXISTS "completed_at" timestamp;

ALTER TABLE "session_day_plans"
  ADD COLUMN IF NOT EXISTS "vaccinated_counts" jsonb;

-- ---------------------------------------------------------------------------
-- 3) Population refresh jobs (WorldPop ETL run log)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'population_refresh_status') THEN
    CREATE TYPE "population_refresh_status" AS ENUM ('pending','running','succeeded','failed');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'population_refresh_trigger') THEN
    CREATE TYPE "population_refresh_trigger" AS ENUM ('manual','scheduled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "population_refresh_jobs" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" varchar NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "triggered_by" "population_refresh_trigger" NOT NULL,
  "triggered_by_user_id" varchar,
  "raster_path" varchar(500) NOT NULL,
  "min_population" integer NOT NULL,
  "status" "population_refresh_status" NOT NULL DEFAULT 'pending',
  "started_at" timestamp DEFAULT now(),
  "completed_at" timestamp,
  "rows_inserted" integer,
  "cells_scanned" integer,
  "cells_above_threshold" integer,
  "duration_ms" integer,
  "error_message" text,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_pop_refresh_tenant_started"
  ON "population_refresh_jobs" ("tenant_id", "started_at");

CREATE INDEX IF NOT EXISTS "idx_pop_refresh_status"
  ON "population_refresh_jobs" ("status");
