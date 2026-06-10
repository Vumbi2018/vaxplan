ALTER TYPE "public"."transport_mode" ADD VALUE 'car' BEFORE 'boat';--> statement-breakpoint
ALTER TYPE "public"."transport_mode" ADD VALUE 'motorbike' BEFORE 'boat';--> statement-breakpoint
ALTER TYPE "public"."transport_mode" ADD VALUE 'donkey' BEFORE 'boat';--> statement-breakpoint
ALTER TYPE "public"."transport_mode" ADD VALUE 'chopper';--> statement-breakpoint
CREATE TABLE "facility_staff" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "facility_staff_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" varchar NOT NULL,
	"facility_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" varchar(100) NOT NULL,
	"phone" varchar(50),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "microplans" ADD COLUMN "submitted_at" timestamp;--> statement-breakpoint
ALTER TABLE "microplans" ADD COLUMN "auto_approve_at" timestamp;--> statement-breakpoint
ALTER TABLE "microplans" ADD COLUMN "reminder_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "microplans" ADD COLUMN "district_edit_reason" text;--> statement-breakpoint
ALTER TABLE "surveillance_cases" ADD COLUMN "investigation_date" timestamp;--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "focal_person_name" varchar(255);--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "focal_person_phone" varchar(50);--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "focal_person_comm_checked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "outside_follow_up_made" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "facility_staff" ADD CONSTRAINT "facility_staff_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_staff" ADD CONSTRAINT "facility_staff_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_facility_staff_tenant" ON "facility_staff" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_facility_staff_facility" ON "facility_staff" USING btree ("facility_id");