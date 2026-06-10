CREATE TYPE "public"."approval_status" AS ENUM('draft', 'pending', 'approved', 'rejected', 'locked');--> statement-breakpoint
CREATE TYPE "public"."boundary_source" AS ENUM('geoboundaries', 'gadm', 'ocha_hdx', 'natural_earth', 'custom');--> statement-breakpoint
CREATE TYPE "public"."idp_protocol" AS ENUM('oidc', 'saml');--> statement-breakpoint
CREATE TYPE "public"."population_source" AS ENUM('nso', 'hmis', 'worldpop', 'survey', 'community_census');--> statement-breakpoint
CREATE TYPE "public"."session_type" AS ENUM('static', 'mobile', 'outreach');--> statement-breakpoint
CREATE TYPE "public"."signup_status" AS ENUM('pending', 'approved', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('trial', 'active', 'suspended', 'archived');--> statement-breakpoint
CREATE TYPE "public"."transport_mode" AS ENUM('walking', 'road', 'boat', 'air');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('facility_clerk', 'facility_in_charge', 'district_manager', 'provincial_coordinator', 'national_admin', 'gis_specialist');--> statement-breakpoint
CREATE TABLE "admin_boundaries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"admin_level" integer NOT NULL,
	"level_name" varchar(100) NOT NULL,
	"source" "boundary_source" DEFAULT 'geoboundaries' NOT NULL,
	"country_code" varchar(3) NOT NULL,
	"feature_count" integer DEFAULT 0,
	"geojson" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"bbox" jsonb DEFAULT 'null'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"fetched_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "approval_requests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer NOT NULL,
	"requested_by_id" varchar NOT NULL,
	"current_level" varchar(50) NOT NULL,
	"status" "approval_status" DEFAULT 'pending',
	"comments" text,
	"submitted_at" timestamp DEFAULT now(),
	"resolved_at" timestamp,
	"resolved_by_id" varchar
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar,
	"user_id" varchar,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" integer,
	"old_value" jsonb,
	"new_value" jsonb,
	"ip_address" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "budget_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "budget_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar,
	"facility_id" integer NOT NULL,
	"session_id" integer,
	"category" varchar(100) NOT NULL,
	"description" varchar(255) NOT NULL,
	"unit_cost" numeric(12, 2) NOT NULL,
	"quantity" integer NOT NULL,
	"total_cost" numeric(12, 2) NOT NULL,
	"quarter" integer NOT NULL,
	"year" integer NOT NULL,
	"approval_status" "approval_status" DEFAULT 'draft',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_vaccinations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "client_vaccinations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar NOT NULL,
	"client_id" varchar NOT NULL,
	"vaccine_config_id" integer NOT NULL,
	"vaccine_name" varchar(100) NOT NULL,
	"administered_date" timestamp NOT NULL,
	"batch_number" varchar(100),
	"expiry_date" timestamp,
	"vvm_status" integer,
	"administered_by_user_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"facility_id" integer NOT NULL,
	"village_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"client_type" varchar(50) NOT NULL,
	"date_of_birth" timestamp NOT NULL,
	"gender" varchar(20),
	"parent_name" varchar(255),
	"contact_phone" varchar(50),
	"catchment_status" varchar(50) DEFAULT 'catchment' NOT NULL,
	"contraindications" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"refusal_reason" text,
	"is_refusal" boolean DEFAULT false NOT NULL,
	"is_cross_border" boolean DEFAULT false NOT NULL,
	"country_of_origin" varchar(100),
	"foreign_residence" text,
	"border_point_of_entry" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "districts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar,
	"name" varchar(255) NOT NULL,
	"code" varchar(10) NOT NULL,
	"province_id" integer NOT NULL,
	"coordinates" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "districts_tenant_code_unique" UNIQUE("tenant_id","code")
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "facilities_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar,
	"name" varchar(255) NOT NULL,
	"hmis_code" varchar(50) NOT NULL,
	"facility_type" varchar(100),
	"agency_name" varchar(100),
	"operational_status" varchar(50),
	"district_id" integer NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"address" text,
	"contact_phone" varchar(50),
	"operating_hours" varchar(100),
	"has_refrigerator" boolean DEFAULT false,
	"has_power" boolean DEFAULT false,
	"staff_count" integer,
	"catchment_radius" numeric(10, 2),
	"is_active" boolean DEFAULT true,
	"external_ids" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "facilities_tenant_hmis_unique" UNIQUE("tenant_id","hmis_code")
);
--> statement-breakpoint
CREATE TABLE "facility_catchments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"facility_id" integer NOT NULL,
	"drawn_by_user_id" varchar,
	"name" varchar(255) NOT NULL,
	"description" text,
	"geojson" jsonb NOT NULL,
	"area_sq_km" numeric(12, 4),
	"population_estimate" integer,
	"is_official" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "htr_scores" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "htr_scores_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar,
	"village_id" integer NOT NULL,
	"distance_score" integer,
	"terrain_score" integer,
	"seasonal_score" integer,
	"coverage_score" integer,
	"composite_score" integer,
	"intervention_priority" varchar(50),
	"calculated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "llgs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "llgs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar,
	"name" varchar(255) NOT NULL,
	"code" varchar(50),
	"district_id" integer NOT NULL,
	"coordinates" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mobilization_activities" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mobilization_activities_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar,
	"facility_id" integer NOT NULL,
	"activity_type" varchar(100) NOT NULL,
	"description" text,
	"target_audience" varchar(100),
	"scheduled_date" timestamp,
	"estimated_attendance" integer,
	"materials_needed" jsonb,
	"budget_allocation" numeric(12, 2),
	"status" varchar(50) DEFAULT 'planned',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "monthly_reports" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "monthly_reports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar NOT NULL,
	"facility_id" integer NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"immunizations" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"stock_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"surveillance" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"submitted_by_id" varchar,
	"approval_status" "approval_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "population_data" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "population_data_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar,
	"province_id" integer,
	"district_id" integer,
	"village_id" integer,
	"facility_id" integer,
	"source" "population_source" NOT NULL,
	"year" integer NOT NULL,
	"total_population" integer NOT NULL,
	"male_population" integer,
	"female_population" integer,
	"under_1_population" integer,
	"under_5_population" integer,
	"pregnant_women" integer,
	"school_entry" integer,
	"school_exit" integer,
	"growth_rate" numeric(5, 2),
	"confidence_score" numeric(5, 2),
	"metadata" jsonb,
	"approval_status" "approval_status" DEFAULT 'draft',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provinces" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "provinces_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar,
	"name" varchar(255) NOT NULL,
	"code" varchar(10) NOT NULL,
	"region_id" integer,
	"coordinates" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "provinces_tenant_code_unique" UNIQUE("tenant_id","code")
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "regions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar,
	"name" varchar(255) NOT NULL,
	"code" varchar(10) NOT NULL,
	"coordinates" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "regions_tenant_code_unique" UNIQUE("tenant_id","code")
);
--> statement-breakpoint
CREATE TABLE "session_day_plans" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "session_day_plans_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar NOT NULL,
	"session_plan_id" integer NOT NULL,
	"day_number" integer NOT NULL,
	"session_date" timestamp NOT NULL,
	"communities_visited" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"target_population" integer NOT NULL,
	"vaccines_required" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"vitamin_a_doses" integer DEFAULT 0 NOT NULL,
	"deworming_doses" integer DEFAULT 0 NOT NULL,
	"vaccine_carriers" integer DEFAULT 1 NOT NULL,
	"ice_packs" integer DEFAULT 4 NOT NULL,
	"chalk_sticks" integer DEFAULT 6 NOT NULL,
	"tally_sheets" integer DEFAULT 2 NOT NULL,
	"distance_km" numeric(8, 2),
	"transport_type" varchar(50),
	"fuel_liters" numeric(8, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "session_plans" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "session_plans_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar,
	"facility_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"session_type" "session_type" NOT NULL,
	"quarter" integer NOT NULL,
	"year" integer NOT NULL,
	"scheduled_date" timestamp,
	"transport_mode" "transport_mode",
	"estimated_duration" integer,
	"target_population" integer,
	"status" varchar(50) DEFAULT 'planned',
	"approval_status" "approval_status" DEFAULT 'draft',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "session_villages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "session_villages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar,
	"session_id" integer NOT NULL,
	"village_id" integer NOT NULL,
	"order_index" integer
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signup_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"email" varchar(255) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"requested_role" varchar(50) NOT NULL,
	"facility_id" integer,
	"district_id" integer,
	"province_id" integer,
	"justification" text,
	"status" "signup_status" DEFAULT 'pending' NOT NULL,
	"approver_user_id" varchar,
	"decision_reason" text,
	"decided_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_transactions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stock_transactions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar NOT NULL,
	"facility_id" integer NOT NULL,
	"vaccine_name" varchar(100) NOT NULL,
	"transaction_type" varchar(50) NOT NULL,
	"quantity_doses" integer NOT NULL,
	"batch_number" varchar(100) NOT NULL,
	"expiry_date" timestamp NOT NULL,
	"vvm_status" integer NOT NULL,
	"supplier_or_recipient" varchar(255),
	"transaction_date" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"recorded_by_user_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenant_idp_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"protocol" "idp_protocol" NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"email_domain" varchar(255) NOT NULL,
	"issuer_url" varchar,
	"client_id" varchar,
	"client_secret_ref" varchar,
	"entry_point" varchar,
	"cert_ref" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenant_interest_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" varchar(3) NOT NULL,
	"country_name" varchar(255) NOT NULL,
	"organization" varchar(255),
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"requested_role" varchar(50) NOT NULL,
	"justification" text,
	"status" "signup_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(10) NOT NULL,
	"country_code" varchar(3) NOT NULL,
	"status" "tenant_status" DEFAULT 'trial' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "tenants_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" "user_role" DEFAULT 'facility_clerk' NOT NULL,
	"facility_id" integer,
	"district_id" integer,
	"province_id" integer,
	"hmis_code" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vaccine_configurations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "vaccine_configurations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar NOT NULL,
	"name" varchar(100) NOT NULL,
	"target_group" varchar(50) NOT NULL,
	"doses" integer NOT NULL,
	"recommended_age" varchar(100) NOT NULL,
	"recommended_age_weeks" integer DEFAULT 0 NOT NULL,
	"wastage_factor" numeric(5, 2) NOT NULL,
	"vials_per_dose" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vaccine_requirements" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "vaccine_requirements_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar,
	"facility_id" integer NOT NULL,
	"vaccine_name" varchar(100) NOT NULL,
	"target_population" integer NOT NULL,
	"doses_required" integer NOT NULL,
	"wastage_rate" numeric(5, 2) NOT NULL,
	"doses_with_wastage" integer NOT NULL,
	"vials_required" integer NOT NULL,
	"quarter" integer NOT NULL,
	"year" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "villages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "villages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar,
	"name" varchar(255) NOT NULL,
	"code" varchar(50),
	"district_id" integer NOT NULL,
	"llg_id" integer,
	"assigned_facility_id" integer,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"distance_to_facility" numeric(10, 2),
	"travel_time_minutes" integer,
	"terrain_difficulty" integer,
	"is_hard_to_reach" boolean DEFAULT false,
	"seasonal_accessibility" varchar(100),
	"transport_mode" "transport_mode",
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "admin_boundaries" ADD CONSTRAINT "admin_boundaries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_resolved_by_id_users_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_session_id_session_plans_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_vaccinations" ADD CONSTRAINT "client_vaccinations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_vaccinations" ADD CONSTRAINT "client_vaccinations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_vaccinations" ADD CONSTRAINT "client_vaccinations_vaccine_config_id_vaccine_configurations_id_fk" FOREIGN KEY ("vaccine_config_id") REFERENCES "public"."vaccine_configurations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_vaccinations" ADD CONSTRAINT "client_vaccinations_administered_by_user_id_users_id_fk" FOREIGN KEY ("administered_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_village_id_villages_id_fk" FOREIGN KEY ("village_id") REFERENCES "public"."villages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_catchments" ADD CONSTRAINT "facility_catchments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_catchments" ADD CONSTRAINT "facility_catchments_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_catchments" ADD CONSTRAINT "facility_catchments_drawn_by_user_id_users_id_fk" FOREIGN KEY ("drawn_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "htr_scores" ADD CONSTRAINT "htr_scores_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "htr_scores" ADD CONSTRAINT "htr_scores_village_id_villages_id_fk" FOREIGN KEY ("village_id") REFERENCES "public"."villages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llgs" ADD CONSTRAINT "llgs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llgs" ADD CONSTRAINT "llgs_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobilization_activities" ADD CONSTRAINT "mobilization_activities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobilization_activities" ADD CONSTRAINT "mobilization_activities_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_reports" ADD CONSTRAINT "monthly_reports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_reports" ADD CONSTRAINT "monthly_reports_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_reports" ADD CONSTRAINT "monthly_reports_submitted_by_id_users_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "population_data" ADD CONSTRAINT "population_data_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "population_data" ADD CONSTRAINT "population_data_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "population_data" ADD CONSTRAINT "population_data_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "population_data" ADD CONSTRAINT "population_data_village_id_villages_id_fk" FOREIGN KEY ("village_id") REFERENCES "public"."villages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "population_data" ADD CONSTRAINT "population_data_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provinces" ADD CONSTRAINT "provinces_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provinces" ADD CONSTRAINT "provinces_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regions" ADD CONSTRAINT "regions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_day_plans" ADD CONSTRAINT "session_day_plans_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_day_plans" ADD CONSTRAINT "session_day_plans_session_plan_id_session_plans_id_fk" FOREIGN KEY ("session_plan_id") REFERENCES "public"."session_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_plans" ADD CONSTRAINT "session_plans_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_plans" ADD CONSTRAINT "session_plans_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_villages" ADD CONSTRAINT "session_villages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_villages" ADD CONSTRAINT "session_villages_session_id_session_plans_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_villages" ADD CONSTRAINT "session_villages_village_id_villages_id_fk" FOREIGN KEY ("village_id") REFERENCES "public"."villages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signup_requests" ADD CONSTRAINT "signup_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_idp_configs" ADD CONSTRAINT "tenant_idp_configs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccine_configurations" ADD CONSTRAINT "vaccine_configurations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccine_requirements" ADD CONSTRAINT "vaccine_requirements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccine_requirements" ADD CONSTRAINT "vaccine_requirements_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "villages" ADD CONSTRAINT "villages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "villages" ADD CONSTRAINT "villages_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "villages" ADD CONSTRAINT "villages_llg_id_llgs_id_fk" FOREIGN KEY ("llg_id") REFERENCES "public"."llgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "villages" ADD CONSTRAINT "villages_assigned_facility_id_facilities_id_fk" FOREIGN KEY ("assigned_facility_id") REFERENCES "public"."facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_boundaries_tenant_level_idx" ON "admin_boundaries" USING btree ("tenant_id","admin_level");--> statement-breakpoint
CREATE INDEX "admin_boundaries_tenant_code_idx" ON "admin_boundaries" USING btree ("tenant_id","country_code");--> statement-breakpoint
CREATE INDEX "idx_approval_req_tenant" ON "approval_requests" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_tenant" ON "audit_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_budget_items_tenant" ON "budget_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "client_vac_tenant_idx" ON "client_vaccinations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "client_vac_client_idx" ON "client_vaccinations" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "clients_tenant_idx" ON "clients" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "clients_facility_idx" ON "clients" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "clients_village_idx" ON "clients" USING btree ("village_id");--> statement-breakpoint
CREATE INDEX "idx_districts_tenant" ON "districts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_facilities_tenant" ON "facilities" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "facility_catchments_tenant_idx" ON "facility_catchments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "facility_catchments_facility_idx" ON "facility_catchments" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "idx_htr_scores_tenant" ON "htr_scores" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_llgs_tenant" ON "llgs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_mobilization_tenant" ON "mobilization_activities" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "monthly_rep_tenant_idx" ON "monthly_reports" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "monthly_rep_facility_idx" ON "monthly_reports" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "idx_population_tenant" ON "population_data" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_provinces_tenant" ON "provinces" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_regions_tenant" ON "regions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "session_day_tenant_idx" ON "session_day_plans" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "session_day_plan_idx" ON "session_day_plans" USING btree ("session_plan_id");--> statement-breakpoint
CREATE INDEX "idx_session_plans_tenant" ON "session_plans" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_session_villages_tenant" ON "session_villages" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_signup_tenant_status" ON "signup_requests" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_signup_email" ON "signup_requests" USING btree ("email");--> statement-breakpoint
CREATE INDEX "stock_txn_tenant_idx" ON "stock_transactions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "stock_txn_facility_idx" ON "stock_transactions" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "idx_idp_email_domain" ON "tenant_idp_configs" USING btree ("email_domain");--> statement-breakpoint
CREATE INDEX "idx_tenant_interest_country" ON "tenant_interest_requests" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "idx_tenant_interest_status" ON "tenant_interest_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_users_tenant" ON "users" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "vaccine_config_tenant_idx" ON "vaccine_configurations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_vaccine_req_tenant" ON "vaccine_requirements" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_villages_tenant" ON "villages" USING btree ("tenant_id");