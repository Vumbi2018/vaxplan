-- Geo coordinates for site activity and supervision.
--
-- Adds latitude/longitude to page_views (best-effort IP-based geolocation,
-- used to plot online users on the Site activity map) and gps_latitude/
-- gps_longitude to supervision_visits (the on-site GPS point captured when a
-- supervisor conducts a visit). All columns are nullable since geo lookup and
-- GPS capture are best-effort. Idempotent so it can be re-applied safely.

ALTER TABLE "page_views"
  ADD COLUMN IF NOT EXISTS "latitude" numeric(10, 6);
ALTER TABLE "page_views"
  ADD COLUMN IF NOT EXISTS "longitude" numeric(10, 6);

ALTER TABLE "supervision_visits"
  ADD COLUMN IF NOT EXISTS "gps_latitude" numeric(10, 6);
ALTER TABLE "supervision_visits"
  ADD COLUMN IF NOT EXISTS "gps_longitude" numeric(10, 6);
