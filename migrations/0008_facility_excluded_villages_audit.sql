-- Create facility_excluded_villages (if missing) and add removal-audit
-- metadata so the wizard can show who removed a community from a catchment,
-- when, and why. Idempotent so it can be re-applied safely.

CREATE TABLE IF NOT EXISTS "facility_excluded_villages" (
  "tenant_id" varchar NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "facility_id" integer NOT NULL REFERENCES "facilities"("id") ON DELETE CASCADE,
  "village_id" integer NOT NULL REFERENCES "villages"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "facility_excluded_villages_pk"
    UNIQUE ("tenant_id", "facility_id", "village_id")
);

CREATE INDEX IF NOT EXISTS "idx_facility_excluded_villages_facility"
  ON "facility_excluded_villages" ("tenant_id", "facility_id");

ALTER TABLE "facility_excluded_villages"
  ADD COLUMN IF NOT EXISTS "removed_by_user_id" varchar;

ALTER TABLE "facility_excluded_villages"
  ADD COLUMN IF NOT EXISTS "reason" text;
