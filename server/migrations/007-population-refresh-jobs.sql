-- Tracks every WorldPop ETL run (admin-triggered or scheduled) per tenant so
-- national admins can see last-run time, row count, and any error message.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'population_refresh_status') THEN
    CREATE TYPE population_refresh_status AS ENUM ('pending', 'running', 'succeeded', 'failed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'population_refresh_trigger') THEN
    CREATE TYPE population_refresh_trigger AS ENUM ('manual', 'scheduled');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS population_refresh_jobs (
  id                     varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  triggered_by           population_refresh_trigger NOT NULL,
  triggered_by_user_id   varchar,
  raster_path            varchar(500) NOT NULL,
  min_population         integer NOT NULL,
  status                 population_refresh_status NOT NULL DEFAULT 'pending',
  started_at             timestamp DEFAULT NOW(),
  completed_at           timestamp,
  rows_inserted          integer,
  cells_scanned          integer,
  cells_above_threshold  integer,
  duration_ms            integer,
  error_message          text,
  created_at             timestamp DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pop_refresh_tenant_started
  ON population_refresh_jobs (tenant_id, started_at);

CREATE INDEX IF NOT EXISTS idx_pop_refresh_status
  ON population_refresh_jobs (status);
