-- Phase 5A: Governance, HR, extended transport modes, polygon fields, approval timestamps
-- Migration: 0013_phase5_governance_and_polygons.sql

-- ─── 1. Transport mode enum — add new modes (additive, existing rows unaffected) ───────
ALTER TYPE "transport_mode" ADD VALUE IF NOT EXISTS 'car';
ALTER TYPE "transport_mode" ADD VALUE IF NOT EXISTS 'motorbike';
ALTER TYPE "transport_mode" ADD VALUE IF NOT EXISTS 'donkey';
ALTER TYPE "transport_mode" ADD VALUE IF NOT EXISTS 'chopper';

-- ─── 2. Facilities — catchment polygon + grid population ─────────────────────────────
ALTER TABLE "facilities"
  ADD COLUMN IF NOT EXISTS "catchment_polygon" jsonb,
  ADD COLUMN IF NOT EXISTS "catchment_grid_population" integer;

-- ─── 3. Villages — community polygon + dual-source population fields ────────────────
ALTER TABLE "villages"
  ADD COLUMN IF NOT EXISTS "catchment_polygon" jsonb,
  ADD COLUMN IF NOT EXISTS "gridded_population" integer,
  ADD COLUMN IF NOT EXISTS "population_source_label" varchar(100),
  ADD COLUMN IF NOT EXISTS "polygon_color" varchar(7);

-- ─── 4. Microplans — approval workflow timestamps ────────────────────────────────────
ALTER TABLE "microplans"
  ADD COLUMN IF NOT EXISTS "submitted_at" timestamp,
  ADD COLUMN IF NOT EXISTS "auto_approved_at" timestamp,
  ADD COLUMN IF NOT EXISTS "reminder_sent_at" timestamp;

-- ─── 5. HFC Committee Members table (Sheet 9) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "hfc_committee_members" (
  "id"                        integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "tenant_id"                 varchar NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "facility_id"               integer NOT NULL REFERENCES "facilities"("id") ON DELETE CASCADE,
  "member_name"               varchar(255) NOT NULL,
  "gender"                    varchar(20) NOT NULL DEFAULT 'female',
  "position"                  varchar(100) NOT NULL DEFAULT 'Member',
  "years_of_service"          integer,
  "is_chairperson"            boolean NOT NULL DEFAULT false,
  "contact_phone"             varchar(50),
  "committee_established_date" timestamp,
  "is_active"                 boolean NOT NULL DEFAULT true,
  "created_at"                timestamp DEFAULT now(),
  "updated_at"                timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_hfc_members_facility"
  ON "hfc_committee_members" ("tenant_id", "facility_id");

-- ─── 6. CHV Profiles table (Sheet 10) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "chv_profiles" (
  "id"                    integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "tenant_id"             varchar NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "facility_id"           integer NOT NULL REFERENCES "facilities"("id") ON DELETE CASCADE,
  "assigned_village_id"   integer REFERENCES "villages"("id") ON DELETE SET NULL,
  "full_name"             varchar(255) NOT NULL,
  "gender"                varchar(20) NOT NULL DEFAULT 'female',
  "age"                   integer,
  "education_level"       varchar(50) DEFAULT 'primary',
  "training_received"     text,
  "role_description"      text,
  "contact_phone"         varchar(50),
  "years_of_service"      integer,
  "sia_role"              varchar(50) DEFAULT 'mobilizer',
  "is_active"             boolean NOT NULL DEFAULT true,
  "created_at"            timestamp DEFAULT now(),
  "updated_at"            timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_chv_profiles_facility"
  ON "chv_profiles" ("tenant_id", "facility_id");
CREATE INDEX IF NOT EXISTS "idx_chv_profiles_village"
  ON "chv_profiles" ("assigned_village_id");

-- ─── 7. Facility Staff table (Sheet 8) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "facility_staff" (
  "id"                              integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "tenant_id"                       varchar NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "facility_id"                     integer NOT NULL REFERENCES "facilities"("id") ON DELETE CASCADE,
  "full_name"                       varchar(255) NOT NULL,
  "gender"                          varchar(20) DEFAULT 'female',
  "position"                        varchar(100),
  "contact_phone"                   varchar(50),
  "years_of_professional_experience" integer,
  "years_at_facility"               integer,
  "campaign_role"                   varchar(50) DEFAULT 'vaccinator',
  "is_active"                       boolean NOT NULL DEFAULT true,
  "user_id"                         varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at"                      timestamp DEFAULT now(),
  "updated_at"                      timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_facility_staff_facility"
  ON "facility_staff" ("tenant_id", "facility_id");
CREATE INDEX IF NOT EXISTS "idx_facility_staff_user"
  ON "facility_staff" ("user_id");

-- ─── 8. Uncovered Communities table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "uncovered_communities" (
  "id"                    integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "tenant_id"             varchar NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "facility_id"           integer NOT NULL REFERENCES "facilities"("id") ON DELETE CASCADE,
  "village_id"            integer REFERENCES "villages"("id") ON DELETE CASCADE,
  "village_name"          varchar(255),
  "estimated_population"  integer,
  "flagged_level"         varchar(30) DEFAULT 'district',
  "flagged_at"            timestamp DEFAULT now(),
  "resolved_at"           timestamp,
  "resolved_by_user_id"   varchar,
  "note"                  text
);
CREATE INDEX IF NOT EXISTS "idx_uncovered_communities_facility"
  ON "uncovered_communities" ("tenant_id", "facility_id");
CREATE INDEX IF NOT EXISTS "idx_uncovered_communities_resolved"
  ON "uncovered_communities" ("resolved_at");
