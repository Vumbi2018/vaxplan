-- Presence freshness for the Site activity panel.
--
-- Adds page_views.last_seen_at, kept separate from created_at so a lightweight
-- client heartbeat can mark a logged-in user "still here" (keeping them in the
-- 5-minute "online now" window even while idle on one page) WITHOUT mutating
-- the immutable event time that visit/trend/top-page analytics aggregate on.
-- Online queries use coalesce(last_seen_at, created_at); all visit-history
-- aggregates continue to key off created_at. Nullable + idempotent so it can be
-- re-applied safely and old rows (no heartbeat) fall back to created_at.

ALTER TABLE "page_views"
  ADD COLUMN IF NOT EXISTS "last_seen_at" timestamptz;

CREATE INDEX IF NOT EXISTS "idx_page_views_tenant_last_seen"
  ON "page_views" ("tenant_id", "last_seen_at");
