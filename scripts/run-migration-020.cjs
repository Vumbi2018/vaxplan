/**
 * run-migration-020.cjs
 * Applies migration 020 (cold_chain_equipment) directly via raw SQL.
 * Safe to re-run (IF NOT EXISTS).
 */

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  try {
    const envPath = path.resolve(__dirname, "../.env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf8");
      const match = envContent.match(/^DATABASE_URL=(.*)$/m);
      if (match) {
        connectionString = match[1].trim().replace(/(^['"]|['"]$)/g, "");
      }
    }
  } catch (err) {
    // Ignore error
  }
}

if (!connectionString) {
  connectionString = "postgresql://postgres:postgres@localhost:5432/vaxplan";
}

const p = new Pool({ connectionString });

const SQL = `
CREATE TABLE IF NOT EXISTS cold_chain_equipment (
  id                           SERIAL PRIMARY KEY,
  tenant_id                    VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  facility_id                  INTEGER NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,

  equipment_type               VARCHAR(60)  NOT NULL,
  brand                        VARCHAR(100),
  model                        VARCHAR(100),
  serial_number                VARCHAR(100),
  catalog_number               VARCHAR(100),
  iga_id                       VARCHAR(100),

  manufacturer                 VARCHAR(150),
  year_of_manufacture          INTEGER,
  year_installed               INTEGER,
  warranty_expiry_date         DATE,

  condition                    VARCHAR(30) NOT NULL DEFAULT 'functional',
  power_source                 VARCHAR(30),
  volume_litres                DECIMAL(10,2),
  storage_capacity_litres      DECIMAL(10,2),
  min_temp                     DECIMAL(6,2),
  max_temp                     DECIMAL(6,2),
  alarm_enabled                BOOLEAN NOT NULL DEFAULT FALSE,
  data_logger_installed        BOOLEAN NOT NULL DEFAULT FALSE,
  data_logger_id               VARCHAR(100),

  location_in_facility         VARCHAR(255),
  responsible_officer          VARCHAR(255),

  last_maintenance_date        DATE,
  next_maintenance_date        DATE,
  maintenance_notes            TEXT,

  working_status               VARCHAR(30),
  temperature_log_ok           BOOLEAN,
  last_temperature_check       DATE,
  decommissioned_at            DATE,
  decommission_reason          TEXT,

  is_active                    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id           VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  created_at                   TIMESTAMP DEFAULT NOW(),
  updated_at                   TIMESTAMP DEFAULT NOW(),

  CONSTRAINT uq_cold_chain_tenant_serial UNIQUE (tenant_id, serial_number)
);

CREATE INDEX IF NOT EXISTS idx_cold_chain_facility ON cold_chain_equipment(tenant_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_cold_chain_condition ON cold_chain_equipment(condition);
`;

p.query(SQL)
  .then(() => {
    console.log("✅ Migration 020 applied: cold_chain_equipment table created.");
    p.end();
  })
  .catch(e => {
    console.error("❌ Migration failed:", e.message);
    p.end();
    process.exit(1);
  });
