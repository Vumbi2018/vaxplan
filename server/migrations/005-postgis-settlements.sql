-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Add physical geometry columns to the tables
ALTER TABLE settlements_master ADD COLUMN IF NOT EXISTS geometry geometry(Point, 4326);
ALTER TABLE population_grids ADD COLUMN IF NOT EXISTS geometry geometry(Polygon, 4326);
ALTER TABLE candidate_unmapped_settlements ADD COLUMN IF NOT EXISTS geometry geometry(Point, 4326);

-- 2. Create trigger function to automatically synchronize the geography/geometry column from the geojson JSONB column
CREATE OR REPLACE FUNCTION update_geometry_from_geojson()
RETURNS TRIGGER AS $$
DECLARE
  geom_json text;
BEGIN
  IF NEW.geojson IS NOT NULL AND NEW.geojson::text <> '{}'::text AND NEW.geojson::text <> 'null'::text THEN
    -- Extract the geometry object if it's wrapped in a GeoJSON Feature
    IF NEW.geojson->'geometry' IS NOT NULL THEN
      geom_json := (NEW.geojson->'geometry')::text;
    ELSE
      geom_json := NEW.geojson::text;
    END IF;
    NEW.geometry := ST_SetSRID(ST_GeomFromGeoJSON(geom_json), 4326);
  ELSE
    NEW.geometry := NULL;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback/graceful failure if GeoJSON is invalid
    NEW.geometry := NULL;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Bind the triggers to the tables (drop first to prevent duplicate bindings)
DROP TRIGGER IF EXISTS trg_settlements_geometry ON settlements_master;
CREATE TRIGGER trg_settlements_geometry
BEFORE INSERT OR UPDATE ON settlements_master
FOR EACH ROW
EXECUTE FUNCTION update_geometry_from_geojson();

DROP TRIGGER IF EXISTS trg_pop_grids_geometry ON population_grids;
CREATE TRIGGER trg_pop_grids_geometry
BEFORE INSERT OR UPDATE ON population_grids
FOR EACH ROW
EXECUTE FUNCTION update_geometry_from_geojson();

DROP TRIGGER IF EXISTS trg_candidates_geometry ON candidate_unmapped_settlements;
CREATE TRIGGER trg_candidates_geometry
BEFORE INSERT OR UPDATE ON candidate_unmapped_settlements
FOR EACH ROW
EXECUTE FUNCTION update_geometry_from_geojson();

-- 4. Create high-performance GiST spatial indexes
CREATE INDEX IF NOT EXISTS idx_settlements_geometry_gist ON settlements_master USING gist(geometry);
CREATE INDEX IF NOT EXISTS idx_pop_grids_geometry_gist ON population_grids USING gist(geometry);
CREATE INDEX IF NOT EXISTS idx_candidates_geometry_gist ON candidate_unmapped_settlements USING gist(geometry);
