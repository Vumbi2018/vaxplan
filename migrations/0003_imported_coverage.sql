-- Task #40: Inbound DHIS2 + CSV coverage import → Missed Communities analysis.
--
-- Adds two tenant-scoped tables:
--   1) imported_coverage  — normalized doses_administered per
--      (tenant, facility, period, antigen, source) with idempotent upsert key.
--   2) csv_imports        — audit row per uploaded CSV file (filename, row counts,
--      error report JSON, who uploaded).
--
-- Both are idempotent (IF NOT EXISTS) so this migration can coexist with
-- environments where the tables were created by drizzle-kit push.

CREATE TABLE IF NOT EXISTS "imported_coverage" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "tenant_id" varchar REFERENCES "tenants"("id"),
  "facility_id" integer NOT NULL REFERENCES "facilities"("id"),
  "period" varchar(16) NOT NULL,
  "antigen" varchar(64) NOT NULL,
  "doses_administered" integer NOT NULL,
  "target_pop_override" integer,
  "source" varchar(32) NOT NULL,
  "source_ref" varchar(255),
  "imported_by_user_id" varchar REFERENCES "users"("id"),
  "imported_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_imported_coverage_key"
  ON "imported_coverage" ("tenant_id", "facility_id", "period", "antigen", "source");

CREATE INDEX IF NOT EXISTS "idx_imported_coverage_tenant"
  ON "imported_coverage" ("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_imported_coverage_period"
  ON "imported_coverage" ("tenant_id", "period");

CREATE TABLE IF NOT EXISTS "csv_imports" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "tenant_id" varchar REFERENCES "tenants"("id"),
  "filename" varchar(255) NOT NULL,
  "row_count" integer NOT NULL,
  "error_count" integer NOT NULL DEFAULT 0,
  "imported_count" integer NOT NULL DEFAULT 0,
  "status" varchar(32) NOT NULL,
  "error_report" jsonb,
  "uploaded_by_user_id" varchar REFERENCES "users"("id"),
  "uploaded_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_csv_imports_tenant"
  ON "csv_imports" ("tenant_id");
