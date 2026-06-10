CREATE TYPE "public"."case_classification" AS ENUM('suspected', 'probable', 'confirmed', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."vpd_diseases" AS ENUM('afp', 'measles', 'nnt', 'yellow_fever', 'cholera', 'covid19', 'other');--> statement-breakpoint
CREATE TABLE "communication_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar,
	"channel" text NOT NULL,
	"destination" text NOT NULL,
	"status" text NOT NULL,
	"provider_response" text,
	"fallback_triggered" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_samples" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" varchar NOT NULL,
	"sample_type" varchar(100) NOT NULL,
	"date_collected" timestamp NOT NULL,
	"date_sent" timestamp,
	"date_received" timestamp,
	"date_results" timestamp,
	"result" varchar(100),
	"lab_name" varchar(255),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surveillance_cases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"facility_id" integer NOT NULL,
	"village_id" integer,
	"client_id" varchar,
	"disease" "vpd_diseases" NOT NULL,
	"patient_name" varchar(255) NOT NULL,
	"patient_age_months" integer,
	"patient_gender" varchar(20),
	"date_of_onset" timestamp NOT NULL,
	"date_reported" timestamp DEFAULT now() NOT NULL,
	"classification" "case_classification" DEFAULT 'suspected' NOT NULL,
	"investigator_user_id" varchar,
	"clinical_notes" text,
	"gps_latitude" numeric(10, 7),
	"gps_longitude" numeric(10, 7),
	"status" varchar(50) DEFAULT 'open' NOT NULL,
	"template_id" integer,
	"form_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_vpd_configurations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tenant_vpd_configurations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar NOT NULL,
	"disease" "vpd_diseases" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"target_incidence_rate" numeric(8, 2),
	"alert_threshold" integer DEFAULT 1,
	"notify_roles" jsonb DEFAULT '["district_manager","provincial_coordinator"]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_tenant_vpd_config_disease" UNIQUE("tenant_id","disease")
);
--> statement-breakpoint
CREATE TABLE "vpd_linelist_templates" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "vpd_linelist_templates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar NOT NULL,
	"disease" "vpd_diseases" NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_samples" ADD CONSTRAINT "lab_samples_case_id_surveillance_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."surveillance_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveillance_cases" ADD CONSTRAINT "surveillance_cases_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveillance_cases" ADD CONSTRAINT "surveillance_cases_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveillance_cases" ADD CONSTRAINT "surveillance_cases_village_id_villages_id_fk" FOREIGN KEY ("village_id") REFERENCES "public"."villages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveillance_cases" ADD CONSTRAINT "surveillance_cases_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveillance_cases" ADD CONSTRAINT "surveillance_cases_investigator_user_id_users_id_fk" FOREIGN KEY ("investigator_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveillance_cases" ADD CONSTRAINT "surveillance_cases_template_id_vpd_linelist_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."vpd_linelist_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_vpd_configurations" ADD CONSTRAINT "tenant_vpd_configurations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vpd_linelist_templates" ADD CONSTRAINT "vpd_linelist_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vpd_linelist_templates" ADD CONSTRAINT "vpd_linelist_templates_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_lab_samples_case" ON "lab_samples" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "idx_surveillance_cases_tenant" ON "surveillance_cases" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_surveillance_cases_facility" ON "surveillance_cases" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "idx_surveillance_cases_disease" ON "surveillance_cases" USING btree ("tenant_id","disease");--> statement-breakpoint
CREATE INDEX "idx_tenant_vpd_config_tenant" ON "tenant_vpd_configurations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_vpd_linelist_template_tenant" ON "vpd_linelist_templates" USING btree ("tenant_id");