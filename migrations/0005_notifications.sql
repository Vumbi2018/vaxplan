-- Backfill migration for the in-app notifications table introduced by the
-- stock-alert digest scheduler (server/jobs/stockAlertDigest.ts).
-- Idempotent: safe to re-run against environments where the table was
-- already created via drizzle-kit push.

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" varchar NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" varchar(50) NOT NULL,
  "title" varchar(255) NOT NULL,
  "body" text,
  "data" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "read_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_notifications_user_unread"
  ON "notifications" ("user_id", "read_at");

CREATE INDEX IF NOT EXISTS "idx_notifications_tenant"
  ON "notifications" ("tenant_id");
