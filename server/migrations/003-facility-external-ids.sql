-- Phase 4 prep — facilities.external_ids jsonb column
-- Stores IdP-side identifiers (DHIS2 UID, SmartCare GUID, eLMIS ID, iHRIS ID, etc.)
-- keyed by IdP code so a single facility can carry multiple cross-references.
-- Idempotent.

ALTER TABLE facilities
  ADD COLUMN IF NOT EXISTS external_ids jsonb DEFAULT '{}'::jsonb;

UPDATE facilities SET external_ids = '{}'::jsonb WHERE external_ids IS NULL;
