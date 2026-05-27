-- Phase 1 multitenant schema additions
-- Idempotent: uses IF NOT EXISTS everywhere

-- 1. Enums
DO $$ BEGIN
  CREATE TYPE tenant_status AS ENUM ('trial', 'active', 'suspended', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE idp_protocol AS ENUM ('oidc', 'saml');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE signup_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Control plane tables
CREATE TABLE IF NOT EXISTS tenants (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  code varchar(10) NOT NULL UNIQUE,
  country_code varchar(3) NOT NULL,
  status tenant_status NOT NULL DEFAULT 'trial',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_idp_configs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  protocol idp_protocol NOT NULL,
  display_name varchar(255) NOT NULL,
  email_domain varchar(255) NOT NULL,
  issuer_url varchar,
  client_id varchar,
  client_secret_ref varchar,
  entry_point varchar,
  cert_ref varchar,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_idp_email_domain ON tenant_idp_configs(email_domain);

CREATE TABLE IF NOT EXISTS signup_requests (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email varchar(255) NOT NULL,
  full_name varchar(255) NOT NULL,
  requested_role varchar(50) NOT NULL,
  facility_id integer,
  district_id integer,
  province_id integer,
  justification text,
  status signup_status NOT NULL DEFAULT 'pending',
  approver_user_id varchar,
  decision_reason text,
  decided_at timestamp,
  expires_at timestamp,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_signup_tenant_status ON signup_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_signup_email ON signup_requests(email);

-- 3. Add tenant_id (nullable for now) + index to every domain table
ALTER TABLE users                    ADD COLUMN IF NOT EXISTS tenant_id varchar REFERENCES tenants(id);
ALTER TABLE regions                  ADD COLUMN IF NOT EXISTS tenant_id varchar REFERENCES tenants(id);
ALTER TABLE provinces                ADD COLUMN IF NOT EXISTS tenant_id varchar REFERENCES tenants(id);
ALTER TABLE districts                ADD COLUMN IF NOT EXISTS tenant_id varchar REFERENCES tenants(id);
ALTER TABLE llgs                     ADD COLUMN IF NOT EXISTS tenant_id varchar REFERENCES tenants(id);
ALTER TABLE facilities               ADD COLUMN IF NOT EXISTS tenant_id varchar REFERENCES tenants(id);
ALTER TABLE villages                 ADD COLUMN IF NOT EXISTS tenant_id varchar REFERENCES tenants(id);
ALTER TABLE population_data          ADD COLUMN IF NOT EXISTS tenant_id varchar REFERENCES tenants(id);
ALTER TABLE session_plans            ADD COLUMN IF NOT EXISTS tenant_id varchar REFERENCES tenants(id);
ALTER TABLE budget_items             ADD COLUMN IF NOT EXISTS tenant_id varchar REFERENCES tenants(id);
ALTER TABLE vaccine_requirements     ADD COLUMN IF NOT EXISTS tenant_id varchar REFERENCES tenants(id);
ALTER TABLE mobilization_activities  ADD COLUMN IF NOT EXISTS tenant_id varchar REFERENCES tenants(id);
ALTER TABLE approval_requests        ADD COLUMN IF NOT EXISTS tenant_id varchar REFERENCES tenants(id);
ALTER TABLE audit_logs               ADD COLUMN IF NOT EXISTS tenant_id varchar REFERENCES tenants(id);
ALTER TABLE htr_scores               ADD COLUMN IF NOT EXISTS tenant_id varchar REFERENCES tenants(id);

CREATE INDEX IF NOT EXISTS idx_users_tenant         ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_regions_tenant       ON regions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_provinces_tenant     ON provinces(tenant_id);
CREATE INDEX IF NOT EXISTS idx_districts_tenant     ON districts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_llgs_tenant          ON llgs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_facilities_tenant    ON facilities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_villages_tenant      ON villages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_population_tenant    ON population_data(tenant_id);
CREATE INDEX IF NOT EXISTS idx_session_plans_tenant ON session_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_tenant  ON budget_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vaccine_req_tenant   ON vaccine_requirements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mobilization_tenant  ON mobilization_activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approval_req_tenant  ON approval_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant    ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_htr_scores_tenant    ON htr_scores(tenant_id);
