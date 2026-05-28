-- Add per-user notification preferences (currently used for the weekly
-- supervision-overdue digest, but designed to hold future channel toggles too).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;
