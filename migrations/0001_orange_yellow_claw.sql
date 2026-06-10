CREATE TYPE "public"."microplan_type" AS ENUM('facility_routine', 'sia_campaign');--> statement-breakpoint
CREATE TABLE "candidate_unmapped_settlements" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "candidate_unmapped_settlements_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"geojson" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"estimated_population" integer DEFAULT 0 NOT NULL,
	"building_count" integer DEFAULT 0 NOT NULL,
	"nearest_named_settlement" varchar(255),
	"nearest_facility" varchar(255),
	"distance_to_facility" numeric(8, 2),
	"confidence_score" numeric(5, 2) DEFAULT '0.75' NOT NULL,
	"validation_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "microplans" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "microplans_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar,
	"facility_id" integer,
	"name" varchar(255) NOT NULL,
	"plan_type" "microplan_type" DEFAULT 'facility_routine' NOT NULL,
	"year" integer NOT NULL,
	"quarter" integer NOT NULL,
	"status" varchar(50) DEFAULT 'draft',
	"campaign_antigen" varchar(100),
	"campaign_target_age" varchar(100),
	"campaign_scope" varchar(100),
	"target_population" integer,
	"budget" numeric(12, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "population_grids" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "population_grids_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar NOT NULL,
	"population_total" integer NOT NULL,
	"under5_population" integer DEFAULT 0 NOT NULL,
	"geojson" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"raster_cell" varchar(100),
	"density_classification" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settlements_master" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "settlements_master_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"place_type" varchar(100) NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"geojson" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"province_name" varchar(100),
	"district_name" varchar(100),
	"constituency_name" varchar(100),
	"ward_name" varchar(100),
	"health_catchment" varchar(255),
	"population_estimate" integer DEFAULT 0 NOT NULL,
	"under5_population" integer DEFAULT 0 NOT NULL,
	"building_count" integer DEFAULT 0 NOT NULL,
	"source" varchar(100) DEFAULT 'osm' NOT NULL,
	"source_confidence" numeric(5, 2) DEFAULT '0.90' NOT NULL,
	"nearest_health_facility" varchar(255),
	"distance_to_facility_km" numeric(8, 2),
	"estimated_travel_time" integer,
	"accessibility_score" numeric(5, 2),
	"hard_to_reach" boolean DEFAULT false NOT NULL,
	"validation_status" varchar(50) DEFAULT 'approved' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_roles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "uq_user_roles_tenant_code" UNIQUE("tenant_id","code")
);
--> statement-breakpoint
ALTER TABLE "htr_scores" ADD COLUMN "insecurity_score" integer;--> statement-breakpoint
ALTER TABLE "htr_scores" ADD COLUMN "comments" text;--> statement-breakpoint
ALTER TABLE "session_day_plans" ADD COLUMN "actual_vaccinated" integer;--> statement-breakpoint
ALTER TABLE "session_day_plans" ADD COLUMN "actual_vials_used" integer;--> statement-breakpoint
ALTER TABLE "session_day_plans" ADD COLUMN "actual_vials_wasted" integer;--> statement-breakpoint
ALTER TABLE "session_day_plans" ADD COLUMN "execution_status" varchar(50) DEFAULT 'planned';--> statement-breakpoint
ALTER TABLE "session_day_plans" ADD COLUMN "execution_notes" text;--> statement-breakpoint
ALTER TABLE "session_day_plans" ADD COLUMN "executed_at" timestamp;--> statement-breakpoint
ALTER TABLE "session_day_plans" ADD COLUMN "team_count" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "session_day_plans" ADD COLUMN "vaccinators_count" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "session_day_plans" ADD COLUMN "volunteers_count" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "session_day_plans" ADD COLUMN "recorders_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "session_day_plans" ADD COLUMN "supervisors_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "session_day_plans" ADD COLUMN "indelible_markers" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "session_day_plans" ADD COLUMN "cold_boxes" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "session_plans" ADD COLUMN "microplan_id" integer;--> statement-breakpoint
ALTER TABLE "session_plans" ADD COLUMN "human_resources" text;--> statement-breakpoint
ALTER TABLE "session_plans" ADD COLUMN "key_stakeholders" text;--> statement-breakpoint
ALTER TABLE "session_plans" ADD COLUMN "vaccine_adjustments" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "session_plans" ADD COLUMN "plan_type" varchar(50) DEFAULT 'routine';--> statement-breakpoint
ALTER TABLE "session_plans" ADD COLUMN "campaign_antigen" varchar(100);--> statement-breakpoint
ALTER TABLE "session_plans" ADD COLUMN "campaign_target_age" varchar(100);--> statement-breakpoint
ALTER TABLE "session_plans" ADD COLUMN "campaign_scope" varchar(100);--> statement-breakpoint
ALTER TABLE "session_plans" ADD COLUMN "team_type" varchar(100);--> statement-breakpoint
ALTER TABLE "session_plans" ADD COLUMN "geojson" jsonb;--> statement-breakpoint
ALTER TABLE "session_plans" ADD COLUMN "is_achieved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "roles" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "permissions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "data_access_scope" jsonb DEFAULT '{"provinces":[],"districts":[],"facilities":[]}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "insecurity_level" integer;--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "comments" text;--> statement-breakpoint
ALTER TABLE "candidate_unmapped_settlements" ADD CONSTRAINT "candidate_unmapped_settlements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microplans" ADD CONSTRAINT "microplans_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microplans" ADD CONSTRAINT "microplans_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "population_grids" ADD CONSTRAINT "population_grids_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements_master" ADD CONSTRAINT "settlements_master_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_candidates_tenant" ON "candidate_unmapped_settlements" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_candidates_status" ON "candidate_unmapped_settlements" USING btree ("tenant_id","validation_status");--> statement-breakpoint
CREATE INDEX "idx_microplans_tenant" ON "microplans" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_pop_grids_tenant" ON "population_grids" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_pop_grids_density" ON "population_grids" USING btree ("tenant_id","density_classification");--> statement-breakpoint
CREATE INDEX "idx_settlements_tenant" ON "settlements_master" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_settlements_admin" ON "settlements_master" USING btree ("tenant_id","province_name","district_name","ward_name");--> statement-breakpoint
CREATE INDEX "idx_settlements_status" ON "settlements_master" USING btree ("tenant_id","validation_status");--> statement-breakpoint
CREATE INDEX "idx_user_roles_tenant" ON "user_roles" USING btree ("tenant_id");--> statement-breakpoint
ALTER TABLE "session_plans" ADD CONSTRAINT "session_plans_microplan_id_microplans_id_fk" FOREIGN KEY ("microplan_id") REFERENCES "public"."microplans"("id") ON DELETE cascade ON UPDATE no action;