/**
 * Migration 020 — cold_chain_equipment
 *
 * Creates the cold_chain_equipment table used to document ALL cold-chain
 * equipment at every health facility. The schema aligns with the WHO EIR
 * (Equipment Inventory and Replacement) data model so that data can be
 * imported from / exported to external IGA (Inventory and Gap Analysis)
 * systems.
 *
 * Safe to re-run: uses IF NOT EXISTS.
 */
import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export async function up(db: NodePgDatabase<any>): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cold_chain_equipment (
      id                           SERIAL PRIMARY KEY,
      tenant_id                    VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      facility_id                  INTEGER NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,

      -- Equipment classification
      equipment_type               VARCHAR(60)  NOT NULL,
      -- refrigerator | freezer | icm | cold_box | vaccine_carrier | generator | temperature_logger | other

      brand                        VARCHAR(100),
      model                        VARCHAR(100),
      serial_number                VARCHAR(100),
      catalog_number               VARCHAR(100),

      -- Physical specs
      capacity_liters              NUMERIC(8,2),
      net_storage_capacity_liters  NUMERIC(8,2),
      temperature_min              NUMERIC(5,1),
      temperature_max              NUMERIC(5,1),

      -- Power & energy
      power_source                 VARCHAR(40),
      energy_consumption_kwh_day   NUMERIC(6,2),

      -- Provenance & lifecycle
      manufacture_year             INTEGER,
      installation_date            VARCHAR(20),
      purchase_cost                NUMERIC(14,2),
      purchase_currency            VARCHAR(5)   DEFAULT 'USD',
      warranty_expiry              VARCHAR(20),
      supplier                     VARCHAR(255),
      donor_funded                 BOOLEAN      DEFAULT FALSE,
      funding_source               VARCHAR(100),

      -- Maintenance & condition
      condition                    VARCHAR(30)  NOT NULL DEFAULT 'functional',
      -- functional | needs_repair | non_functional | condemned | decommissioned
      last_service_date            VARCHAR(20),
      next_service_due             VARCHAR(20),
      last_temperature_check       VARCHAR(20),
      maintenance_notes            TEXT,

      -- Flags & metadata
      is_active                    BOOLEAN      NOT NULL DEFAULT TRUE,
      notes                        TEXT,
      external_id                  VARCHAR(100),

      created_by_user_id           VARCHAR REFERENCES users(id) ON DELETE SET NULL,
      updated_by_user_id           VARCHAR REFERENCES users(id) ON DELETE SET NULL,
      created_at                   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at                   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_cce_tenant
      ON cold_chain_equipment(tenant_id);

    CREATE INDEX IF NOT EXISTS idx_cce_facility
      ON cold_chain_equipment(facility_id);

    CREATE INDEX IF NOT EXISTS idx_cce_condition
      ON cold_chain_equipment(tenant_id, condition);
  `);
}

export async function down(db: NodePgDatabase<any>): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS cold_chain_equipment;
  `);
}
