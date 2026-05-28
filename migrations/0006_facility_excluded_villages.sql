-- Per-facility list of villages excluded from the microplan catchment.
-- See shared/schema.ts (facilityExcludedVillages) and task #167.
-- Idempotent: safe to re-run against environments where the table was
-- already created via drizzle-kit push.

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
