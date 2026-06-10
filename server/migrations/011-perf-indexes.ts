/**
 * 011-perf-indexes.ts
 *
 * Adds composite indexes on the highest-traffic compound WHERE columns.
 * All indexes use CREATE INDEX IF NOT EXISTS so this is fully idempotent.
 *
 * Called automatically from server/index.ts on every startup — the IF NOT
 * EXISTS guard means subsequent runs are instant no-ops (PostgreSQL skips
 * index creation if it already exists).
 *
 * Why each index:
 *  facilities(tenant_id, district_id)     — facilities list filtered by district
 *  facilities(tenant_id, province_id_via_join) is handled by the JOIN fix, but
 *    the district lookup is a hot path even for non-provincial users.
 *  villages(tenant_id, assigned_facility_id) — village list per facility
 *  villages(tenant_id, district_id)       — village list per district
 *  session_plans(tenant_id, facility_id)  — session list per facility
 *  session_plans(tenant_id, microplan_id) — session lookup per microplan (supervision seeding)
 *  session_plans(tenant_id, status)       — status-filtered session lists
 *  population_data(tenant_id, facility_id)— population per facility
 *  population_data(tenant_id, district_id)— population per district (reporting aggregates)
 *  microplans(tenant_id, status)          — active/approved microplan filtering
 *  microplans(tenant_id, facility_id)     — facility-level microplan lookup
 *  supervision_visits(tenant_id, facility_id) — supervision list per facility
 *  audit_logs(tenant_id, created_at)      — audit log time-range queries
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

export async function applyPerfIndexes(): Promise<void> {
  const statements: string[] = [
    // ── Facilities ──────────────────────────────────────────────────────────
    `CREATE INDEX IF NOT EXISTS idx_facilities_tenant_district
       ON facilities (tenant_id, district_id)`,

    // ── Villages ─────────────────────────────────────────────────────────────
    /* Original villages indexes:
    `CREATE INDEX IF NOT EXISTS idx_villages_tenant_facility
       ON villages (tenant_id, assigned_facility_id)`,
    `CREATE INDEX IF NOT EXISTS idx_villages_tenant_district
       ON villages (tenant_id, district_id)`,
    `CREATE INDEX IF NOT EXISTS idx_villages_tenant_htr
       ON villages (tenant_id, is_hard_to_reach)
       WHERE is_hard_to_reach = true`,
    */
    `CREATE INDEX IF NOT EXISTS idx_villages_tenant_facility
       ON villages (tenant_id, assigned_facility_id)`,
    `CREATE INDEX IF NOT EXISTS idx_villages_tenant_district
       ON villages (tenant_id, district_id)`,
    `CREATE INDEX IF NOT EXISTS idx_villages_tenant_htr
       ON villages (tenant_id, is_hard_to_reach)
       WHERE is_hard_to_reach = true`,
    // ADDED: Spatial index to optimize remote sensing proximity/buffer lookups
    `CREATE INDEX IF NOT EXISTS idx_villages_geom
       ON villages USING gist (ST_SetSRID(ST_MakePoint(longitude::float, latitude::float), 4326))`,

    // ── Session plans ────────────────────────────────────────────────────────
    `CREATE INDEX IF NOT EXISTS idx_session_plans_tenant_facility
       ON session_plans (tenant_id, facility_id)`,
    `CREATE INDEX IF NOT EXISTS idx_session_plans_tenant_microplan
       ON session_plans (tenant_id, microplan_id)`,
    `CREATE INDEX IF NOT EXISTS idx_session_plans_tenant_status
       ON session_plans (tenant_id, status)`,
    `CREATE INDEX IF NOT EXISTS idx_session_plans_tenant_scheduled
       ON session_plans (tenant_id, scheduled_date)`,

    // ── Population data ──────────────────────────────────────────────────────
    `CREATE INDEX IF NOT EXISTS idx_population_tenant_facility
       ON population_data (tenant_id, facility_id)`,
    `CREATE INDEX IF NOT EXISTS idx_population_tenant_district
       ON population_data (tenant_id, district_id)`,
    `CREATE INDEX IF NOT EXISTS idx_population_tenant_year
       ON population_data (tenant_id, year)`,

    // ── Microplans ───────────────────────────────────────────────────────────
    `CREATE INDEX IF NOT EXISTS idx_microplans_tenant_status
       ON microplans (tenant_id, status)`,
    `CREATE INDEX IF NOT EXISTS idx_microplans_tenant_facility
       ON microplans (tenant_id, facility_id)`,

    // ── Supervision visits ───────────────────────────────────────────────────
    `CREATE INDEX IF NOT EXISTS idx_supervision_tenant_facility
       ON supervision_visits (tenant_id, facility_id)`,
    `CREATE INDEX IF NOT EXISTS idx_supervision_tenant_status
       ON supervision_visits (tenant_id, status)`,

    // ── Audit logs ───────────────────────────────────────────────────────────
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created
       ON audit_logs (tenant_id, created_at DESC)`,

    // ── Districts ────────────────────────────────────────────────────────────
    `CREATE INDEX IF NOT EXISTS idx_districts_tenant_province
       ON districts (tenant_id, province_id)`,

    // ── Budget items ─────────────────────────────────────────────────────────
    /* Original Code commented out to fix column "microplan_id" not existing on budget_items table:
    `CREATE INDEX IF NOT EXISTS idx_budget_items_tenant_microplan
       ON budget_items (tenant_id, microplan_id)`,
    */
    // Correct indexes using actual budget_items columns:
    `CREATE INDEX IF NOT EXISTS idx_budget_items_tenant_facility
       ON budget_items (tenant_id, facility_id)`,
    `CREATE INDEX IF NOT EXISTS idx_budget_items_tenant_session
       ON budget_items (tenant_id, session_id)`,

    // ── Session villages junction ────────────────────────────────────────────
    /*
    // ORIGINAL CODE: References session_plan_id which does not exist in schema.
    `CREATE INDEX IF NOT EXISTS idx_session_villages_session
       ON session_villages (session_plan_id)`,
    */
    // UPDATED CODE: Correct column name is session_id.
    `CREATE INDEX IF NOT EXISTS idx_session_villages_session
       ON session_villages (session_id)`,
  ];

  for (const stmt of statements) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (err: any) {
      // Log but don't abort startup — a failed index is not fatal.
      // The index may fail if the table column name differs slightly;
      // the app will still work, just slower for that path.
      console.warn(`[perf-indexes] Skipped (${err?.message ?? err}): ${stmt.split("\n")[0].trim()}`);
    }
  }
}
