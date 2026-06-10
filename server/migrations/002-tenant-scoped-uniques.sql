-- Phase 1.1 — Tenant-scope unique constraints + add tenant_id to session_villages
-- Idempotent.

-- session_villages: junction table needs tenant_id for RLS + clean cascades
ALTER TABLE session_villages ADD COLUMN IF NOT EXISTS tenant_id varchar REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_session_villages_tenant ON session_villages(tenant_id);

UPDATE session_villages sv
   SET tenant_id = sp.tenant_id
  FROM session_plans sp
 WHERE sv.session_id = sp.id AND sv.tenant_id IS NULL;

-- regions.code → unique (tenant_id, code)
ALTER TABLE regions DROP CONSTRAINT IF EXISTS regions_code_unique;
ALTER TABLE regions DROP CONSTRAINT IF EXISTS regions_code_key;
DO $$ BEGIN
  ALTER TABLE regions ADD CONSTRAINT regions_tenant_code_unique UNIQUE (tenant_id, code);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- provinces.code → unique (tenant_id, code)
ALTER TABLE provinces DROP CONSTRAINT IF EXISTS provinces_code_unique;
ALTER TABLE provinces DROP CONSTRAINT IF EXISTS provinces_code_key;
DO $$ BEGIN
  ALTER TABLE provinces ADD CONSTRAINT provinces_tenant_code_unique UNIQUE (tenant_id, code);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- districts.code → unique (tenant_id, code)
ALTER TABLE districts DROP CONSTRAINT IF EXISTS districts_code_unique;
ALTER TABLE districts DROP CONSTRAINT IF EXISTS districts_code_key;
DO $$ BEGIN
  ALTER TABLE districts ADD CONSTRAINT districts_tenant_code_unique UNIQUE (tenant_id, code);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- facilities.hmis_code → unique (tenant_id, hmis_code)
ALTER TABLE facilities DROP CONSTRAINT IF EXISTS facilities_hmis_code_unique;
ALTER TABLE facilities DROP CONSTRAINT IF EXISTS facilities_hmis_code_key;
DO $$ BEGIN
  ALTER TABLE facilities ADD CONSTRAINT facilities_tenant_hmis_unique UNIQUE (tenant_id, hmis_code);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
