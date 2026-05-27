/**
 * Phase 1 — Multitenant backfill
 *
 * Idempotent: safe to run multiple times.
 *
 * What it does:
 *   1. Creates the PNG tenant (the existing data's home).
 *   2. Stamps every existing row in every tenant-scoped table with that tenant_id.
 *   3. Leaves tenant_id nullable for now. Phase 4 hardening will make it NOT NULL.
 *
 * Run with:  tsx server/migrations/001-multitenant-backfill.ts
 */

import { db } from "../db";
import { sql } from "drizzle-orm";
import { tenants } from "@shared/schema";
import { eq } from "drizzle-orm";

/*
// Original Code (hardcoded settings without demographics)
const PNG_TENANT = {
  code: "PNG",
  name: "Papua New Guinea National Department of Health",
  countryCode: "PNG",
  status: "active" as const,
  settings: {
    currency: "PGK",
    currencySymbol: "K",
    languages: ["en", "tpi"],
    defaultLanguage: "en",
    mapCenter: [-6.0, 145.0],
    mapZoom: 6,
    skipRegionLevel: false,
    adminLevelLabels: {
      level1: "Region",
      level2: "Province",
      level3: "District",
      level4: "LLG",
      level5: "Village",
    },
    epiSchedule: "PNG_2024",
    fiscalYearStart: "01-01",
  },
};
*/

// Updated Code: Added dynamic demographics configuration to enable multi-tenant vaccine forecasting calculations.
const PNG_TENANT = {
  code: "PNG",
  name: "Papua New Guinea National Department of Health",
  countryCode: "PNG",
  status: "active" as const,
  settings: {
    currency: "PGK",
    currencySymbol: "K",
    languages: ["en", "tpi"],
    defaultLanguage: "en",
    mapCenter: [-6.0, 145.0],
    mapZoom: 6,
    skipRegionLevel: false,
    adminLevelLabels: {
      level1: "Region",
      level2: "Province",
      level3: "District",
      level4: "LLG",
      level5: "Village",
    },
    epiSchedule: "PNG_2024",
    fiscalYearStart: "01-01",
    demographics: {
      births: 0.032,
      under1: 0.030,
      pregnant: 0.032,
      schoolEntry: 0.027,
      schoolExit: 0.022,
    },
  },
};

const TENANT_SCOPED_TABLES = [
  "users",
  "regions",
  "provinces",
  "districts",
  "llgs",
  "facilities",
  "villages",
  "population_data",
  "session_plans",
  "budget_items",
  "vaccine_requirements",
  "mobilization_activities",
  "approval_requests",
  "audit_logs",
  "htr_scores",
];

async function run() {
  console.log("=== Phase 1 multitenant backfill ===");

  // 1. Upsert PNG tenant
  const existing = await db.select().from(tenants).where(eq(tenants.code, PNG_TENANT.code));
  let tenantId: string;

  if (existing.length > 0) {
    tenantId = existing[0].id;
    console.log(`PNG tenant already exists: ${tenantId}`);
  } else {
    const [created] = await db.insert(tenants).values(PNG_TENANT).returning();
    tenantId = created.id;
    console.log(`Created PNG tenant: ${tenantId}`);
  }

  // 2. Backfill every tenant-scoped table
  let totalRows = 0;
  for (const table of TENANT_SCOPED_TABLES) {
    const result = await db.execute(
      sql.raw(
        `UPDATE ${table} SET tenant_id = '${tenantId}' WHERE tenant_id IS NULL`
      )
    );
    const rowCount = (result as any).rowCount ?? 0;
    totalRows += rowCount;
    console.log(`  ${table}: ${rowCount} rows backfilled`);
  }

  console.log(`\nDone. ${totalRows} rows stamped with tenant_id=${tenantId}.`);
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
