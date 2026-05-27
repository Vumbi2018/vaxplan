-- Merged: combines Task #36 idempotent staffing/funding additions with the
-- canonical drizzle-generated migration (population refresh jobs, session
-- plan type enum + index). All statements are wrapped to be idempotent so
-- this migration coexists with hand-applied changes on existing databases.

DO $$ BEGIN
    CREATE TYPE "public"."funding_source" AS ENUM('government', 'gavi', 'who', 'unicef', 'other', 'unspecified');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."population_refresh_status" AS ENUM('pending', 'running', 'succeeded', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."population_refresh_trigger" AS ENUM('manual', 'scheduled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."session_plan_type" AS ENUM('routine', 'campaign');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "population_refresh_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"triggered_by" "population_refresh_trigger" NOT NULL,
	"triggered_by_user_id" varchar,
	"raster_path" varchar(500) NOT NULL,
	"min_population" integer NOT NULL,
	"status" "population_refresh_status" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"rows_inserted" integer,
	"cells_scanned" integer,
	"cells_above_threshold" integer,
	"duration_ms" integer,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint

ALTER TABLE "session_plans" ALTER COLUMN "microplan_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "session_plans" ALTER COLUMN "plan_type" SET DEFAULT 'routine'::"public"."session_plan_type";--> statement-breakpoint
ALTER TABLE "session_plans" ALTER COLUMN "plan_type" SET DATA TYPE "public"."session_plan_type" USING "plan_type"::"public"."session_plan_type";--> statement-breakpoint
ALTER TABLE "session_plans" ALTER COLUMN "plan_type" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "budget_items" ADD COLUMN IF NOT EXISTS "funding_source" "funding_source" DEFAULT 'unspecified' NOT NULL;--> statement-breakpoint
ALTER TABLE "budget_items" ADD COLUMN IF NOT EXISTS "funding_source_other" varchar(255);--> statement-breakpoint
ALTER TABLE "microplans" ADD COLUMN IF NOT EXISTS "staffing" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "population_refresh_jobs" ADD CONSTRAINT "population_refresh_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_pop_refresh_tenant_started" ON "population_refresh_jobs" USING btree ("tenant_id","started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pop_refresh_status" ON "population_refresh_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_session_plans_microplan" ON "session_plans" USING btree ("microplan_id");
