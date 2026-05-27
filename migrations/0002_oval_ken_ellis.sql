-- Task #36: Staffing roster + Funding Source classification
-- Idempotent so it coexists safely with hand-applied 0002_session_plan_cascade.sql
-- and any prior population_refresh / session_plan_type changes.

DO $$ BEGIN
    CREATE TYPE "public"."funding_source" AS ENUM('government', 'gavi', 'who', 'unicef', 'other', 'unspecified');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

ALTER TABLE "budget_items" ADD COLUMN IF NOT EXISTS "funding_source" "funding_source" DEFAULT 'unspecified' NOT NULL;--> statement-breakpoint
ALTER TABLE "budget_items" ADD COLUMN IF NOT EXISTS "funding_source_other" varchar(255);--> statement-breakpoint
ALTER TABLE "microplans" ADD COLUMN IF NOT EXISTS "staffing" jsonb DEFAULT '[]'::jsonb;
