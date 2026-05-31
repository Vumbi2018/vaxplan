-- Task #261: Smart community creation + catchment-overlap harmonization.
-- Additive, idempotent migration (do NOT use db:push here — it can destructively
-- rename PostGIS tables). Adds an optional GeoJSON boundary polygon to villages
-- and a lightweight conflict table for overlap harmonization requests.

ALTER TABLE "villages" ADD COLUMN IF NOT EXISTS "boundary" jsonb;

CREATE TABLE IF NOT EXISTS "catchment_conflicts" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "tenant_id" varchar NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "village_id" integer NOT NULL REFERENCES "villages"("id") ON DELETE CASCADE,
  "conflicting_village_id" integer NOT NULL REFERENCES "villages"("id") ON DELETE CASCADE,
  "conflicting_facility_id" integer REFERENCES "facilities"("id") ON DELETE SET NULL,
  "overlap_pct" numeric(6, 2),
  "status" varchar(20) NOT NULL DEFAULT 'open',
  "requested_by_user_id" varchar,
  "note" text,
  "created_at" timestamp DEFAULT now(),
  "resolved_at" timestamp
);

CREATE INDEX IF NOT EXISTS "idx_catchment_conflicts_tenant"
  ON "catchment_conflicts" ("tenant_id");
