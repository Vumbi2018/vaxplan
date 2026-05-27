/**
 * Phase 4 — Zambia tenant bootstrap
 *
 * Loads data/zambia/facilities.csv (2,828 rows, 10 provinces, 116 districts)
 * as a second tenant alongside PNG. Idempotent: re-runs upsert by tenant code
 * and skip-existing on (tenant_id, code) and (tenant_id, hmis_code).
 *
 * Data source: Zambia Ministry of Health master facility list, including
 * DHIS2 UIDs and SmartCare GUIDs (preserved in facilities.external_ids jsonb).
 *
 * Run with:  tsx server/migrations/003-seed-zambia.ts
 *
 * Prereq: 003-facility-external-ids.sql (adds external_ids column)
 */

import { db } from "../db";
import { sql, eq, and } from "drizzle-orm";
import {
  tenants,
  regions,
  provinces,
  districts,
  facilities,
  populationData,
} from "@shared/schema";
import { readFileSync } from "fs";
import { join } from "path";

/*
// Original Code (hardcoded settings without demographics)
const ZAMBIA_TENANT = {
  code: "ZMB",
  name: "Republic of Zambia Ministry of Health",
  countryCode: "ZMB",
  status: "active" as const,
  settings: {
    currency: "ZMW",
    currencySymbol: "K",
    languages: ["en", "ny", "bem", "ton"],
    defaultLanguage: "en",
    mapCenter: [-13.13, 27.85] as [number, number],
    mapZoom: 6,
    skipRegionLevel: true, // Zambia goes straight from country → province
    adminLevelLabels: {
      level1: "Region",
      level2: "Province",
      level3: "District",
      level4: "Constituency",
      level5: "Ward",
    },
    epiSchedule: "ZMB_2024",
    fiscalYearStart: "01-01",
  },
};
*/

// Updated Code: Added dynamic demographics configuration to enable multi-tenant vaccine forecasting calculations.
const ZAMBIA_TENANT = {
  code: "ZMB",
  name: "Republic of Zambia Ministry of Health",
  countryCode: "ZMB",
  status: "active" as const,
  settings: {
    currency: "ZMW",
    currencySymbol: "K",
    languages: ["en", "ny", "bem", "ton"],
    defaultLanguage: "en",
    mapCenter: [-13.13, 27.85] as [number, number],
    mapZoom: 6,
    skipRegionLevel: true, // Zambia goes straight from country → province
    adminLevelLabels: {
      level1: "Region",
      level2: "Province",
      level3: "District",
      level4: "Constituency",
      level5: "Ward",
    },
    epiSchedule: "ZMB_2024",
    fiscalYearStart: "01-01",
    demographics: {
      births: 0.038,
      under1: 0.035,
      pregnant: 0.040,
      schoolEntry: 0.032,
      schoolExit: 0.028,
    },
  },
};

interface ZambiaRow {
  province: string;
  district: string;
  name: string;
  HMIS_code: string;
  DHIS2_UID: string;
  smartcare_GUID: string;
  eLMIS_ID: string;
  iHRIS_ID: string;
  location: string;
  ownership: string;
  facility_type: string;
  longitude: string;
  latitude: string;
  catchment_population_head_count: string;
  catchment_population_cso: string;
  operation_status: string;
}

// Lightweight CSV parser that handles quoted fields.
function parseCsv(text: string): ZambiaRow[] {
  const lines: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes;
    if (ch === "\n" && !inQuotes) {
      lines.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.length) lines.push(cur);

  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let field = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (q && line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          q = !q;
        }
      } else if (c === "," && !q) {
        out.push(field);
        field = "";
      } else {
        field += c;
      }
    }
    out.push(field);
    return out.map((f) => f.trim());
  };

  const headers = splitLine(lines[0]);
  return lines.slice(1)
    .filter((l) => l.trim().length > 0)
    .map((l) => {
      const cells = splitLine(l);
      return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""])) as unknown as ZambiaRow;
    });
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

function toNumOrNull(v: string): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function provinceCode(name: string): string {
  // Stable 3-letter province code. Tenant scoping in the composite unique
  // means we don't need a country prefix here.
  const map: Record<string, string> = {
    Central: "CEN", Copperbelt: "COP", Eastern: "EAS", Luapula: "LUA",
    Lusaka: "LUS", Muchinga: "MUC", Northern: "NOR", "North-Western": "NWE",
    Southern: "SOU", Western: "WES",
  };
  return map[name] || slug(name).toUpperCase().slice(0, 3);
}

async function run() {
  console.log("=== Zambia tenant bootstrap ===\n");

  // 0. Apply external_ids column migration (idempotent).
  console.log("Applying facilities.external_ids column…");
  await db.execute(sql`
    ALTER TABLE facilities ADD COLUMN IF NOT EXISTS external_ids jsonb DEFAULT '{}'::jsonb
  `);
  await db.execute(sql`
    UPDATE facilities SET external_ids = '{}'::jsonb WHERE external_ids IS NULL
  `);

  // 1. Upsert Zambia tenant.
  const existingTenant = await db.select().from(tenants).where(eq(tenants.code, ZAMBIA_TENANT.code));
  let tenantId: string;
  if (existingTenant.length > 0) {
    tenantId = existingTenant[0].id;
    console.log(`Zambia tenant already exists: ${tenantId}`);
  } else {
    const [created] = await db.insert(tenants).values(ZAMBIA_TENANT).returning();
    tenantId = created.id;
    console.log(`Created Zambia tenant: ${tenantId}`);
  }

  // 2. Load + parse CSV.
  const csvPath = join(process.cwd(), "data", "zambia", "facilities.csv");
  const rows = parseCsv(readFileSync(csvPath, "utf8"));
  console.log(`Loaded ${rows.length} rows from ${csvPath}\n`);

  // 3. Single national region (Zambia has no PNG-style "region" tier; this keeps the schema uniform).
  let region = (await db.select().from(regions).where(
    and(eq(regions.tenantId, tenantId), eq(regions.code, "ZMB"))
  ))[0];
  if (!region) {
    [region] = await db.insert(regions).values({
      tenantId, name: "Zambia", code: "ZMB",
    } as typeof regions.$inferInsert).returning();
    console.log(`Created national region: id=${region.id}`);
  }

  // 4. Provinces — 10 unique.
  const provinceNames = Array.from(new Set(rows.map((r) => r.province))).sort();
  const provinceIdByName = new Map<string, number>();
  for (const name of provinceNames) {
    const code = provinceCode(name);
    let p = (await db.select().from(provinces).where(
      and(eq(provinces.tenantId, tenantId), eq(provinces.code, code))
    ))[0];
    if (!p) {
      [p] = await db.insert(provinces).values({
        tenantId, name, code, regionId: region.id,
      } as typeof provinces.$inferInsert).returning();
    }
    provinceIdByName.set(name, p.id);
  }
  console.log(`Provinces: ${provinceIdByName.size}`);

  // 5. Districts — 116 unique (province, district) pairs.
  const districtKey = (r: ZambiaRow) => `${r.province}|${r.district}`;
  const districtPairs = Array.from(new Set(rows.map(districtKey))).sort();
  const districtIdByKey = new Map<string, number>();
  for (const key of districtPairs) {
    const [provName, distName] = key.split("|");
    const provId = provinceIdByName.get(provName)!;
    // varchar(10): "{prov-3}-{dist-6}" = 10 chars max.
    const code = `${provinceCode(provName)}-${slug(distName).toUpperCase().slice(0, 6)}`;
    let d = (await db.select().from(districts).where(
      and(eq(districts.tenantId, tenantId), eq(districts.code, code))
    ))[0];
    if (!d) {
      [d] = await db.insert(districts).values({
        tenantId, name: distName, code, provinceId: provId,
      } as typeof districts.$inferInsert).returning();
    }
    districtIdByKey.set(key, d.id);
  }
  console.log(`Districts: ${districtIdByKey.size}`);

  // 6. Facilities — 2,828. Build hmis code: use HMIS_code if present, else synthesize.
  // Bulk insert in batches; skip rows whose hmis_code is already present for the tenant.
  const existingHmis = new Set<string>(
    (await db.select({ hmisCode: facilities.hmisCode })
      .from(facilities)
      .where(eq(facilities.tenantId, tenantId))).map((r) => r.hmisCode)
  );

  const ownershipMap: Record<string, string> = {
    GRZ: "Government", Military: "Military", NGO: "NGO",
    Private: "Private", Police: "Police",
  };

  type FacInsert = typeof facilities.$inferInsert;
  const facilityRows: FacInsert[] = [];
  const facilityKey: string[] = []; // parallel array: hmisCode for population join

  for (const r of rows) {
    let hmis = r.HMIS_code?.trim();
    if (!hmis) {
      hmis = `ZMB-SYN-${slug(r.province)}-${slug(r.district)}-${slug(r.name)}`.slice(0, 50);
    }
    if (existingHmis.has(hmis)) {
      facilityKey.push(hmis); // still need to associate population
      continue;
    }
    existingHmis.add(hmis);

    const distId = districtIdByKey.get(districtKey(r))!;
    const lon = toNumOrNull(r.longitude);
    const lat = toNumOrNull(r.latitude);

    const externalIds: Record<string, string> = {};
    if (r.DHIS2_UID) externalIds.dhis2_uid = r.DHIS2_UID;
    if (r.smartcare_GUID) externalIds.smartcare_guid = r.smartcare_GUID;
    if (r.eLMIS_ID) externalIds.elmis_id = r.eLMIS_ID;
    if (r.iHRIS_ID) externalIds.ihris_id = r.iHRIS_ID;

    facilityRows.push({
      tenantId,
      name: r.name,
      hmisCode: hmis,
      facilityType: r.facility_type || "Unknown",
      agencyName: ownershipMap[r.ownership] || r.ownership || null,
      operationalStatus: r.operation_status || null,
      districtId: distId,
      latitude: lat !== null ? String(lat) : null,
      longitude: lon !== null ? String(lon) : null,
      isActive: r.operation_status === "Operational",
      externalIds,
    });
    facilityKey.push(hmis);
  }

  // Batched insert.
  console.log(`Inserting ${facilityRows.length} new facilities (skipped ${rows.length - facilityRows.length} already present)…`);
  const BATCH = 500;
  for (let i = 0; i < facilityRows.length; i += BATCH) {
    await db.insert(facilities).values(facilityRows.slice(i, i + BATCH));
  }

  // Re-read facility ids by hmis_code so we can attach population_data.
  const allFacilities = await db.select({ id: facilities.id, hmisCode: facilities.hmisCode, districtId: facilities.districtId })
    .from(facilities)
    .where(eq(facilities.tenantId, tenantId));
  const facIdByHmis = new Map(allFacilities.map((f) => [f.hmisCode, f]));

  // 7. Population data — one row per facility per source (CSO + HMIS head count).
  // Skip if a row already exists for this (tenant, facility, source, year).
  const YEAR = 2024;
  const popRows: (typeof populationData.$inferInsert)[] = [];

  // Pre-load existing pop keys to dedupe.
  const existingPop = await db.execute(sql`
    SELECT facility_id, source, year FROM population_data WHERE tenant_id = ${tenantId}
  `);
  const existingPopKeys = new Set(
    (existingPop.rows as any[]).map((r) => `${r.facility_id}|${r.source}|${r.year}`)
  );

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fac = facIdByHmis.get(facilityKey[i]);
    if (!fac) continue;
    const cso = toNumOrNull(r.catchment_population_cso);
    const hc = toNumOrNull(r.catchment_population_head_count);
    if (cso !== null && cso > 0 && !existingPopKeys.has(`${fac.id}|nso|${YEAR}`)) {
      popRows.push({
        tenantId, facilityId: fac.id, districtId: fac.districtId,
        source: "nso", year: YEAR, totalPopulation: cso,
        approvalStatus: "approved",
      });
      existingPopKeys.add(`${fac.id}|nso|${YEAR}`);
    }
    if (hc !== null && hc > 0 && !existingPopKeys.has(`${fac.id}|hmis|${YEAR}`)) {
      popRows.push({
        tenantId, facilityId: fac.id, districtId: fac.districtId,
        source: "hmis", year: YEAR, totalPopulation: hc,
        approvalStatus: "approved",
      });
      existingPopKeys.add(`${fac.id}|hmis|${YEAR}`);
    }
  }

  console.log(`Inserting ${popRows.length} population rows…`);
  for (let i = 0; i < popRows.length; i += BATCH) {
    await db.insert(populationData).values(popRows.slice(i, i + BATCH));
  }

  // 8. Summary.
  const counts = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM regions             WHERE tenant_id = ${tenantId}) AS regions,
      (SELECT COUNT(*) FROM provinces           WHERE tenant_id = ${tenantId}) AS provinces,
      (SELECT COUNT(*) FROM districts           WHERE tenant_id = ${tenantId}) AS districts,
      (SELECT COUNT(*) FROM facilities          WHERE tenant_id = ${tenantId}) AS facilities,
      (SELECT COUNT(*) FROM population_data     WHERE tenant_id = ${tenantId}) AS population_rows,
      (SELECT SUM(total_population)::bigint FROM population_data
       WHERE tenant_id = ${tenantId} AND source = 'nso') AS cso_population
  `);
  console.log("\nZambia tenant rollup:");
  console.table(counts.rows);
  console.log("\nDone.");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
