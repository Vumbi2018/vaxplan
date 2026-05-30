-- Configurable supervision checklists.
--
-- Adds the tenant-scoped supervision_checklist_templates table (national
-- admins author these; lower levels pick an active one when scheduling a
-- visit) and a nullable template_id link on supervision_visits recording
-- which template a visit used. Idempotent so it can be re-applied safely.

CREATE TABLE IF NOT EXISTS "supervision_checklist_templates" (
  "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "tenant_id" varchar NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "name" varchar(200) NOT NULL,
  "description" text,
  "items" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_by_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_supervision_template_tenant"
  ON "supervision_checklist_templates" ("tenant_id");

ALTER TABLE "supervision_visits"
  ADD COLUMN IF NOT EXISTS "template_id" integer;
