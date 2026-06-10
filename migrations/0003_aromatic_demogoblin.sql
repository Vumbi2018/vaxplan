CREATE TYPE "public"."custom_layer_category" AS ENUM('road_network', 'travel_time', 'schools', 'health_features', 'water', 'terrain', 'settlement', 'other');--> statement-breakpoint
CREATE TYPE "public"."custom_layer_format" AS ENUM('geojson', 'shapefile', 'csv', 'geotiff');--> statement-breakpoint
CREATE TYPE "public"."custom_layer_type" AS ENUM('vector', 'raster');--> statement-breakpoint
CREATE TABLE "annual_immunization_plans" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "annual_immunization_plans_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar NOT NULL,
	"year" integer NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"total_target_population" integer,
	"surviving_infants" integer,
	"pregnant_women" integer,
	"budget_envelope" numeric(14, 2),
	"funding_mix" jsonb DEFAULT '{}'::jsonb,
	"priorities" text,
	"targets_by_antigen" jsonb DEFAULT '{}'::jsonb,
	"narrative" text,
	"approved_at" timestamp,
	"approved_by_user_id" varchar,
	"created_by_user_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catchment_conflicts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "catchment_conflicts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar NOT NULL,
	"village_id" integer NOT NULL,
	"conflicting_village_id" integer NOT NULL,
	"conflicting_facility_id" integer,
	"overlap_pct" numeric(6, 2),
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"requested_by_user_id" varchar,
	"note" text,
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "csv_imports" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "csv_imports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar NOT NULL,
	"filename" varchar(255) NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"imported_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'preview' NOT NULL,
	"error_report" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"uploaded_by_user_id" varchar,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_layers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"category" "custom_layer_category" DEFAULT 'other' NOT NULL,
	"layer_type" "custom_layer_type" NOT NULL,
	"format" "custom_layer_format" NOT NULL,
	"geojson" jsonb DEFAULT 'null'::jsonb,
	"feature_count" integer DEFAULT 0,
	"file_path" varchar(500),
	"file_size_bytes" integer,
	"bbox" jsonb DEFAULT 'null'::jsonb,
	"style" jsonb DEFAULT '{}'::jsonb,
	"usable_in_planning" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"uploaded_by_user_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "device_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"tenant_id" varchar,
	"token_hash" varchar(128) NOT NULL,
	"platform" varchar(32) NOT NULL,
	"device_label" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	CONSTRAINT "device_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "facility_excluded_villages" (
	"tenant_id" varchar NOT NULL,
	"facility_id" integer NOT NULL,
	"village_id" integer NOT NULL,
	"removed_by_user_id" varchar,
	"reason" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "facility_excluded_villages_pk" UNIQUE("tenant_id","facility_id","village_id")
);
--> statement-breakpoint
CREATE TABLE "imported_coverage" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "imported_coverage_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar NOT NULL,
	"facility_id" integer NOT NULL,
	"period" varchar(10) NOT NULL,
	"antigen" varchar(50) NOT NULL,
	"doses_administered" integer DEFAULT 0 NOT NULL,
	"target_pop_override" integer,
	"source" varchar(20) NOT NULL,
	"source_ref" varchar(255),
	"imported_by_user_id" varchar,
	"imported_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "imported_coverage_unique" UNIQUE("tenant_id","facility_id","period","antigen","source")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_views" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "page_views_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar,
	"user_id" varchar,
	"path" varchar(300) NOT NULL,
	"ip_address" varchar(100),
	"country" varchar(120),
	"region" varchar(120),
	"city" varchar(120),
	"latitude" numeric(10, 6),
	"longitude" numeric(10, 6),
	"user_agent" varchar(400),
	"created_at" timestamp with time zone DEFAULT now(),
	"last_seen_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "quarterly_reviews" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "quarterly_reviews_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar NOT NULL,
	"facility_id" integer NOT NULL,
	"year" integer NOT NULL,
	"quarter" integer NOT NULL,
	"top_drivers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"corrective_actions" text NOT NULL,
	"next_survey_date" timestamp,
	"created_by_user_id" varchar,
	"updated_by_user_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_quarterly_reviews_facility_period" UNIQUE("tenant_id","facility_id","year","quarter")
);
--> statement-breakpoint
CREATE TABLE "supervision_checklist_templates" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "supervision_checklist_templates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supervision_visits" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "supervision_visits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar NOT NULL,
	"facility_id" integer NOT NULL,
	"microplan_id" integer,
	"session_plan_id" integer,
	"scheduled_date" timestamp NOT NULL,
	"conducted_date" timestamp,
	"supervisor_user_id" varchar,
	"supervisor_name" varchar(255),
	"visit_type" varchar(40) DEFAULT 'routine' NOT NULL,
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"template_id" integer,
	"checklist" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"score" integer,
	"gps_latitude" numeric(10, 6),
	"gps_longitude" numeric(10, 6),
	"findings" text,
	"follow_up_actions" text,
	"next_visit_date" timestamp,
	"created_by_user_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budget_items" ADD COLUMN "source" varchar(32) DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "session_day_plans" ADD COLUMN "lead_vaccinator" varchar(255);--> statement-breakpoint
ALTER TABLE "session_plans" ADD COLUMN "outreach_purpose" varchar(32);--> statement-breakpoint
ALTER TABLE "session_plans" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "session_plans" ADD COLUMN "vaccinated_counts" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_platform_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notification_prefs" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "vaccine_configurations" ADD COLUMN "cvx_code" varchar(16);--> statement-breakpoint
ALTER TABLE "vaccine_configurations" ADD COLUMN "who_atc_code" varchar(16);--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "boundary" jsonb;--> statement-breakpoint
ALTER TABLE "annual_immunization_plans" ADD CONSTRAINT "annual_immunization_plans_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annual_immunization_plans" ADD CONSTRAINT "annual_immunization_plans_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annual_immunization_plans" ADD CONSTRAINT "annual_immunization_plans_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catchment_conflicts" ADD CONSTRAINT "catchment_conflicts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catchment_conflicts" ADD CONSTRAINT "catchment_conflicts_village_id_villages_id_fk" FOREIGN KEY ("village_id") REFERENCES "public"."villages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catchment_conflicts" ADD CONSTRAINT "catchment_conflicts_conflicting_village_id_villages_id_fk" FOREIGN KEY ("conflicting_village_id") REFERENCES "public"."villages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catchment_conflicts" ADD CONSTRAINT "catchment_conflicts_conflicting_facility_id_facilities_id_fk" FOREIGN KEY ("conflicting_facility_id") REFERENCES "public"."facilities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csv_imports" ADD CONSTRAINT "csv_imports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csv_imports" ADD CONSTRAINT "csv_imports_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_layers" ADD CONSTRAINT "custom_layers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_layers" ADD CONSTRAINT "custom_layers_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_excluded_villages" ADD CONSTRAINT "facility_excluded_villages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_excluded_villages" ADD CONSTRAINT "facility_excluded_villages_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_excluded_villages" ADD CONSTRAINT "facility_excluded_villages_village_id_villages_id_fk" FOREIGN KEY ("village_id") REFERENCES "public"."villages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_coverage" ADD CONSTRAINT "imported_coverage_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_coverage" ADD CONSTRAINT "imported_coverage_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_coverage" ADD CONSTRAINT "imported_coverage_imported_by_user_id_users_id_fk" FOREIGN KEY ("imported_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quarterly_reviews" ADD CONSTRAINT "quarterly_reviews_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quarterly_reviews" ADD CONSTRAINT "quarterly_reviews_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quarterly_reviews" ADD CONSTRAINT "quarterly_reviews_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quarterly_reviews" ADD CONSTRAINT "quarterly_reviews_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_checklist_templates" ADD CONSTRAINT "supervision_checklist_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_checklist_templates" ADD CONSTRAINT "supervision_checklist_templates_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_visits" ADD CONSTRAINT "supervision_visits_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_visits" ADD CONSTRAINT "supervision_visits_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_visits" ADD CONSTRAINT "supervision_visits_microplan_id_microplans_id_fk" FOREIGN KEY ("microplan_id") REFERENCES "public"."microplans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_visits" ADD CONSTRAINT "supervision_visits_session_plan_id_session_plans_id_fk" FOREIGN KEY ("session_plan_id") REFERENCES "public"."session_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_visits" ADD CONSTRAINT "supervision_visits_supervisor_user_id_users_id_fk" FOREIGN KEY ("supervisor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_visits" ADD CONSTRAINT "supervision_visits_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_annual_plan_tenant" ON "annual_immunization_plans" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_annual_plan_tenant_year" ON "annual_immunization_plans" USING btree ("tenant_id","year");--> statement-breakpoint
CREATE INDEX "idx_catchment_conflicts_tenant" ON "catchment_conflicts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_csv_imports_tenant" ON "csv_imports" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "custom_layers_tenant_idx" ON "custom_layers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "custom_layers_tenant_category_idx" ON "custom_layers" USING btree ("tenant_id","category");--> statement-breakpoint
CREATE INDEX "idx_device_tokens_user" ON "device_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_device_tokens_hash" ON "device_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_facility_excluded_villages_facility" ON "facility_excluded_villages" USING btree ("tenant_id","facility_id");--> statement-breakpoint
CREATE INDEX "idx_imported_coverage_tenant" ON "imported_coverage" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_imported_coverage_facility" ON "imported_coverage" USING btree ("tenant_id","facility_id","period");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_unread" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_tenant" ON "notifications" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_page_views_tenant_created" ON "page_views" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_page_views_tenant_user" ON "page_views" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_page_views_tenant_last_seen" ON "page_views" USING btree ("tenant_id","last_seen_at");--> statement-breakpoint
CREATE INDEX "idx_quarterly_reviews_tenant" ON "quarterly_reviews" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_quarterly_reviews_facility" ON "quarterly_reviews" USING btree ("tenant_id","facility_id");--> statement-breakpoint
CREATE INDEX "idx_supervision_template_tenant" ON "supervision_checklist_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_supervision_tenant" ON "supervision_visits" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_supervision_facility" ON "supervision_visits" USING btree ("tenant_id","facility_id");--> statement-breakpoint
CREATE INDEX "idx_supervision_scheduled" ON "supervision_visits" USING btree ("tenant_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_session_plans_completed_at" ON "session_plans" USING btree ("completed_at");