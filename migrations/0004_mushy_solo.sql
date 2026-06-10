CREATE TABLE "communication_channels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"communication_id" varchar NOT NULL,
	"channel" varchar(50) NOT NULL,
	"attempted" boolean DEFAULT false NOT NULL,
	"delivered" boolean DEFAULT false NOT NULL,
	"response_code" varchar(100),
	"delivery_time" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"event_id" varchar,
	"recipient_id" varchar NOT NULL,
	"message_type" varchar(100) NOT NULL,
	"priority" varchar(50) DEFAULT 'medium' NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"communication_id" varchar NOT NULL,
	"provider" varchar(100) NOT NULL,
	"status" varchar(50) NOT NULL,
	"response" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indicator_manual" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"category" varchar(255) NOT NULL,
	"sub_category" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"numerator" text NOT NULL,
	"numerator_source" text NOT NULL,
	"denominator" text NOT NULL,
	"denominator_source" text NOT NULL,
	"calculation" text NOT NULL,
	"calculation_example" text NOT NULL,
	"reference" text,
	"reference_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"language" varchar(50) NOT NULL,
	"channel" varchar(50),
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "whatsapp_available" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "has_app" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "preferred_language" varchar(50) DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "preferred_channel" varchar(50);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "client_id" varchar(100);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "serial_number" integer;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "registration_year" integer;--> statement-breakpoint
ALTER TABLE "microplans" ADD COLUMN "campaign_scope_details" jsonb;--> statement-breakpoint
ALTER TABLE "supervision_checklist_templates" ADD COLUMN "category" varchar(50) DEFAULT 'supervision' NOT NULL;--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "accessibility_score" varchar(50);--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "referral_route" text;--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "outreach_latitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "outreach_longitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "villages" ADD COLUMN "outreach_post_name" varchar(255);--> statement-breakpoint
ALTER TABLE "communication_channels" ADD CONSTRAINT "communication_channels_communication_id_communications_id_fk" FOREIGN KEY ("communication_id") REFERENCES "public"."communications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_recipient_id_clients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_logs" ADD CONSTRAINT "delivery_logs_communication_id_communications_id_fk" FOREIGN KEY ("communication_id") REFERENCES "public"."communications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator_manual" ADD CONSTRAINT "indicator_manual_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_indicator_manual_tenant" ON "indicator_manual" USING btree ("tenant_id");