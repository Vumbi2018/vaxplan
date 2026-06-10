CREATE TABLE "chv_profiles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chv_profiles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar NOT NULL,
	"facility_id" integer NOT NULL,
	"assigned_village_id" integer,
	"full_name" varchar(255) NOT NULL,
	"gender" varchar(20) DEFAULT 'female' NOT NULL,
	"age" integer,
	"education_level" varchar(50) DEFAULT 'primary',
	"training_received" text,
	"role_description" text,
	"contact_phone" varchar(50),
	"years_of_service" integer,
	"sia_role" varchar(50) DEFAULT 'mobilizer',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "community_health_volunteers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "community_health_volunteers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar NOT NULL,
	"facility_id" integer NOT NULL,
	"village_id" integer,
	"name" varchar(255) NOT NULL,
	"gender" varchar(20),
	"years_of_service" integer,
	"education_level" varchar(100),
	"training_status" varchar(50) DEFAULT 'untrained',
	"community_unit" varchar(255),
	"campaign_role" varchar(100),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hfc_committee" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hfc_committee_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar NOT NULL,
	"facility_id" integer NOT NULL,
	"member_name" varchar(255) NOT NULL,
	"gender" varchar(20),
	"position" varchar(100),
	"years_of_service" integer,
	"is_chairperson" boolean DEFAULT false NOT NULL,
	"contact_phone" varchar(50),
	"committee_established_date" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hfc_committee_members" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hfc_committee_members_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar NOT NULL,
	"facility_id" integer NOT NULL,
	"member_name" varchar(255) NOT NULL,
	"gender" varchar(20) DEFAULT 'female' NOT NULL,
	"position" varchar(100) DEFAULT 'Member' NOT NULL,
	"years_of_service" integer,
	"is_chairperson" boolean DEFAULT false NOT NULL,
	"contact_phone" varchar(50),
	"committee_established_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "uncovered_communities" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "uncovered_communities_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar NOT NULL,
	"facility_id" integer NOT NULL,
	"village_id" integer,
	"village_name" varchar(255),
	"estimated_population" integer,
	"flagged_level" varchar(30) DEFAULT 'district',
	"flagged_at" timestamp DEFAULT now(),
	"resolved_at" timestamp,
	"resolved_by_user_id" varchar,
	"note" text
);
--> statement-breakpoint
DROP INDEX "idx_facility_staff_tenant";--> statement-breakpoint
DROP INDEX "idx_facility_staff_facility";--> statement-breakpoint
ALTER TABLE "facility_staff" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "facility_staff" ALTER COLUMN "role" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "facilities" ADD COLUMN "catchment_polygon" jsonb;--> statement-breakpoint
ALTER TABLE "facilities" ADD COLUMN "catchment_grid_population" integer;--> statement-breakpoint
ALTER TABLE "facility_staff" ADD COLUMN "full_name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "facility_staff" ADD COLUMN "gender" varchar(20) DEFAULT 'female';--> statement-breakpoint
ALTER TABLE "facility_staff" ADD COLUMN "position" varchar(100);--> statement-breakpoint
ALTER TABLE "facility_staff" ADD COLUMN "contact_phone" varchar(50);--> statement-breakpoint
ALTER TABLE "facility_staff" ADD COLUMN "years_of_professional_experience" integer;--> statement-breakpoint
ALTER TABLE "facility_staff" ADD COLUMN "years_experience" integer;--> statement-breakpoint
ALTER TABLE "facility_staff" ADD COLUMN "years_at_facility" integer;--> statement-breakpoint
ALTER TABLE "facility_staff" ADD COLUMN "campaign_role" varchar(100) DEFAULT 'vaccinator';--> statement-breakpoint
ALTER TABLE "facility_staff" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "facility_staff" ADD COLUMN "education_level" varchar(100);--> statement-breakpoint
ALTER TABLE "facility_staff" ADD COLUMN "training_status" varchar(100);--> statement-breakpoint
ALTER TABLE "facility_staff" ADD COLUMN "residence_village" varchar(255);--> statement-breakpoint
ALTER TABLE "facility_staff" ADD COLUMN "is_volunteer" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "facility_staff" ADD COLUMN "user_id" varchar;--> statement-breakpoint
ALTER TABLE "session_day_plans" ADD COLUMN "vitamin_a_blue_caps" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "session_day_plans" ADD COLUMN "vitamin_a_red_caps" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "session_day_plans" ADD COLUMN "scissors_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "catchment_polygon" jsonb;--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "gridded_population" integer;--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "population_source_label" varchar(100);--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "polygon_color" varchar(7);--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "is_cross_border" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "border_country" varchar(100);--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "is_crossing_point" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "crossing_type" varchar(50);--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "daily_movement_volume" integer;--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "border_village_country" varchar(100);--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "border_village_facility_name" varchar(255);--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "settlement_type" varchar(50) DEFAULT 'village';--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "high_risk" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "high_risk_reason" varchar(255);--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "total_catchment_population" integer;--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "under5_population" integer;--> statement-breakpoint
ALTER TABLE "chv_profiles" ADD CONSTRAINT "chv_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chv_profiles" ADD CONSTRAINT "chv_profiles_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chv_profiles" ADD CONSTRAINT "chv_profiles_assigned_village_id_villages_id_fk" FOREIGN KEY ("assigned_village_id") REFERENCES "public"."villages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_health_volunteers" ADD CONSTRAINT "community_health_volunteers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_health_volunteers" ADD CONSTRAINT "community_health_volunteers_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_health_volunteers" ADD CONSTRAINT "community_health_volunteers_village_id_villages_id_fk" FOREIGN KEY ("village_id") REFERENCES "public"."villages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hfc_committee" ADD CONSTRAINT "hfc_committee_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hfc_committee" ADD CONSTRAINT "hfc_committee_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hfc_committee_members" ADD CONSTRAINT "hfc_committee_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hfc_committee_members" ADD CONSTRAINT "hfc_committee_members_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uncovered_communities" ADD CONSTRAINT "uncovered_communities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uncovered_communities" ADD CONSTRAINT "uncovered_communities_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uncovered_communities" ADD CONSTRAINT "uncovered_communities_village_id_villages_id_fk" FOREIGN KEY ("village_id") REFERENCES "public"."villages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chv_profiles_facility" ON "chv_profiles" USING btree ("tenant_id","facility_id");--> statement-breakpoint
CREATE INDEX "idx_chv_profiles_village" ON "chv_profiles" USING btree ("assigned_village_id");--> statement-breakpoint
CREATE INDEX "idx_chv_tenant" ON "community_health_volunteers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_chv_facility" ON "community_health_volunteers" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "idx_hfc_committee_tenant" ON "hfc_committee" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_hfc_committee_facility" ON "hfc_committee" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "idx_hfc_members_facility" ON "hfc_committee_members" USING btree ("tenant_id","facility_id");--> statement-breakpoint
CREATE INDEX "idx_uncovered_communities_facility" ON "uncovered_communities" USING btree ("tenant_id","facility_id");--> statement-breakpoint
CREATE INDEX "idx_uncovered_communities_resolved" ON "uncovered_communities" USING btree ("resolved_at");--> statement-breakpoint
ALTER TABLE "facility_staff" ADD CONSTRAINT "facility_staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_facility_staff_user" ON "facility_staff" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_facility_staff_facility" ON "facility_staff" USING btree ("tenant_id","facility_id");