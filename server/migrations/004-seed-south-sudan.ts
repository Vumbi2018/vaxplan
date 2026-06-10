/**
 * Phase 4 — South Sudan tenant bootstrap
 *
 * Loads data/south_sudan/facilities.csv (1,984 rows, 12 states/admin areas, 79 counties, 500+ payams)
 * Idempotent: clears old South Sudan records for tenant SSD first to prevent duplicates,
 * then seeds the real-world administrative hierarchy and facility network.
 *
 * Data source: South Sudan Ministry of Health master facility list (2026),
 * including DHIS2 UIDs, operational statuses, coordinates, and types.
 *
 * Run with:  tsx server/migrations/004-seed-south-sudan.ts
 */

import { db } from "../db";
import { sql, eq, and } from "drizzle-orm";
import {
  tenants,
  regions,
  provinces,
  districts,
  llgs,
  facilities,
  populationData,
  villages,
} from "../../shared/schema";
import { readFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const SSD_TENANT = {
  code: "SSD",
  name: "Republic of South Sudan Ministry of Health",
  countryCode: "SSD",
  status: "active" as const,
  settings: {
    currency: "SSP",
    currencySymbol: "£",
    languages: ["en", "ar"],
    defaultLanguage: "en",
    mapCenter: [7.87, 29.69] as [number, number],
    mapZoom: 6,
    epiSchedule: "SSD_2024",
    fiscalYearStart: "01-01",
    demographics: {
      births: 0.042,       // ~4.2% crude birth rate — one of the highest globally (WHO 2023)
      under1: 0.040,       // ~4.0% under-1 cohort (UNICEF SS 2023)
      pregnant: 0.045,     // ~4.5% pregnant women (high MMR context, priority EPI group)
      schoolEntry: 0.036,  // school-entry cohort (6-year-olds) — low enrollment context
      schoolExit: 0.030,   // school-exit cohort (12-year-olds)
    },
    adminLevelLabels: {
      level1: "State",     // 10 Administrative States + 3 Administrative Areas
      level2: "County",    // 78+ Counties (OCHA 2023)
      level3: "Payam",     // Sub-county administrative unit
      level4: "Boma",      // Village-cluster / lowest administrative unit
    },
    populationSources: [
      { code: "nbs", label: "NBS Census (2008 projected)" },
      { code: "unicef", label: "UNICEF / WHO Estimates" },
      { code: "worldpop", label: "WorldPop Gridded" },
      { code: "survey", label: "MICS / SMART Survey" },
      { code: "community_census", label: "Community CHW Census" },
    ],
  },
};

const SSD_CENSUS_2026 = [
  { stateName: "Central Equatoria", population: 1500000, growthRate: "2.80" },
  { stateName: "Eastern Equatoria", population: 1100000, growthRate: "2.50" },
  { stateName: "Western Equatoria", population: 1000000, growthRate: "2.40" },
  { stateName: "Jonglei", population: 1800000, growthRate: "3.10" },
  { stateName: "Unity", population: 1000000, growthRate: "2.90" },
  { stateName: "Upper Nile", population: 1300000, growthRate: "2.70" },
  { stateName: "Lakes", population: 1200000, growthRate: "2.60" },
  { stateName: "Warrap", population: 1300000, growthRate: "2.80" },
  { stateName: "Western Bahr el Ghazal", population: 600000, growthRate: "2.30" },
  { stateName: "Northern Bahr el Ghazal", population: 1000000, growthRate: "2.50" },
  { stateName: "Ruweng Admin", population: 250000, growthRate: "2.60" },
  { stateName: "Abyei Admin", population: 150000, growthRate: "2.20" },
];

interface SouthSudanRow {
  state: string;
  state_code: string;
  county: string;
  county_code: string;
  payam: string;
  payam_code: string;
  site: string;
  site_dhis2_id: string;
  site_dhis2_name: string;
  latitude: string;
  longitude: string;
  facility_type: string;
  func_status: string;
}

// Lightweight CSV parser that handles quoted fields.
function parseCsv(text: string): SouthSudanRow[] {
  const lines: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (const ch of text) {
    if (cur === "" && ch === "\r") continue; // strip lead cr
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

  return lines.slice(1)
    .filter((l) => l.trim().length > 0)
    .map((l) => {
      const cells = splitLine(l);
      // Explicit positional mapping based on headers:
      // state,state_code,county,county_code,payam,,payam_code,site,site_dhis2_id,site_dhis2_name,latitude,longitude,facility_type,,func_status
      return {
        state: cells[0] ?? "",
        state_code: cells[1] ?? "",
        county: cells[2] ?? "",
        county_code: cells[3] ?? "",
        payam: cells[4] ?? "",
        payam_code: cells[6] ?? "",
        site: cells[7] ?? "",
        site_dhis2_id: cells[8] ?? "",
        site_dhis2_name: cells[9] ?? "",
        latitude: cells[10] ?? "",
        longitude: cells[11] ?? "",
        facility_type: cells[12] ?? "",
        func_status: cells[14] ?? "",
      };
    });
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

function toNumOrNull(v: string): number | null {
  if (!v || v.trim() === "" || v === "NA") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function run() {
  console.log("=== South Sudan 2026 Master Facility List Bootstrap ===\n");

  // 1. Resolve or Create Tenant
  const existingTenant = await db.select().from(tenants).where(eq(tenants.code, SSD_TENANT.code));
  let tenantId: string;
  if (existingTenant.length > 0) {
    tenantId = existingTenant[0].id;
    console.log(`SSD Tenant already exists: ${tenantId}`);
    
    // Clear old administrative settings and cascade children to ensure clean, high-fidelity seeding
    console.log("Clearing old South Sudan administrative hierarchy and facilities…");
    await db.delete(populationData).where(eq(populationData.tenantId, tenantId));
    await db.delete(villages).where(eq(villages.tenantId, tenantId));
    await db.delete(facilities).where(eq(facilities.tenantId, tenantId));
    await db.delete(llgs).where(eq(llgs.tenantId, tenantId));
    await db.delete(districts).where(eq(districts.tenantId, tenantId));
    await db.delete(provinces).where(eq(provinces.tenantId, tenantId));
    await db.delete(regions).where(eq(regions.tenantId, tenantId));
    
    // Update settings to keep them completely updated
    await db.update(tenants).set({ settings: SSD_TENANT.settings }).where(eq(tenants.id, tenantId));
    console.log("Cleared old entities and updated settings.");
  } else {
    const [created] = await db.insert(tenants).values(SSD_TENANT).returning();
    tenantId = created.id;
    console.log(`Created South Sudan tenant: ${tenantId}`);
  }

  // 2. Load + Parse CSV
  const csvPath = join(process.cwd(), "data", "south_sudan", "facilities.csv");
  if (!existsSync(csvPath)) {
    console.error(`CSV file not found at: ${csvPath}. Please copy it to this path first.`);
    process.exit(1);
  }
  
  const rawCsvText = readFileSync(csvPath, "utf8");
  const rows = parseCsv(rawCsvText);
  console.log(`Loaded ${rows.length} facilities rows from ${csvPath}\n`);

  // 3. Seed Single National Region
  const [region] = await db.insert(regions).values({
    tenantId,
    name: "South Sudan",
    code: "SSD",
  } as typeof regions.$inferInsert).returning();
  console.log(`Created national region: id=${region.id}`);

  // 4. States (Provinces) — extract unique states from CSV
  const provinceMap = new Map<string, number>(); // state_code -> province DB id
  const uniqueStates = Array.from(new Map(rows.map(r => [r.state_code.trim(), r.state.trim()])).entries());
  
  console.log("Seeding states…");
  for (const [code, name] of uniqueStates) {
    if (!code || !name) continue;
    const [prov] = await db.insert(provinces).values({
      tenantId,
      name,
      code,
      regionId: region.id,
    } as typeof provinces.$inferInsert).returning();
    provinceMap.set(code, prov.id);
  }
  console.log(`Seeded ${provinceMap.size} unique States / Administrative Areas.`);

  // 5. Counties (Districts) — extract unique counties from CSV
  const districtMap = new Map<string, number>(); // county_code -> district DB id
  const uniqueCounties = Array.from(
    new Map(rows.map(r => [r.county_code.trim(), { name: r.county.trim(), stateCode: r.state_code.trim() }])).entries()
  );

  console.log("Seeding counties…");
  for (const [code, info] of uniqueCounties) {
    if (!code || !info.name) continue;
    const provId = provinceMap.get(info.stateCode);
    if (!provId) {
      console.warn(`Warning: Province key ${info.stateCode} not found for county ${info.name}`);
      continue;
    }
    const [dist] = await db.insert(districts).values({
      tenantId,
      name: info.name,
      code,
      provinceId: provId,
    } as typeof districts.$inferInsert).returning();
    districtMap.set(code, dist.id);
  }
  console.log(`Seeded ${districtMap.size} unique Counties.`);

  // 6. Payams (LLGs) — extract unique payams from CSV
  const llgMap = new Map<string, number>(); // payam_code -> llg DB id
  const uniquePayams = Array.from(
    new Map(rows.map(r => [r.payam_code.trim(), { name: r.payam.trim(), countyCode: r.county_code.trim() }])).entries()
  );

  console.log("Seeding payams…");
  for (const [code, info] of uniquePayams) {
    if (!code || !info.name) continue;
    const distId = districtMap.get(info.countyCode);
    if (!distId) {
      console.warn(`Warning: County key ${info.countyCode} not found for payam ${info.name}`);
      continue;
    }
    const [llg] = await db.insert(llgs).values({
      tenantId,
      name: info.name,
      code,
      districtId: distId,
    } as typeof llgs.$inferInsert).returning();
    llgMap.set(code, llg.id);
  }
  console.log(`Seeded ${llgMap.size} unique Payams.`);

  // 7. Facilities — 1,984 rows
  const facilityRows: (typeof facilities.$inferInsert)[] = [];
  const existingHmis = new Set<string>();

  for (const r of rows) {
    const dhisId = r.site_dhis2_id.trim();
    let hmis = dhisId;
    if (!hmis || hmis === "NA") {
      hmis = `SSD-SYN-${r.state_code}-${r.county_code}-${slug(r.site)}`.slice(0, 50);
    }
    if (existingHmis.has(hmis)) {
      continue;
    }
    existingHmis.add(hmis);

    const distId = districtMap.get(r.county_code.trim());
    if (!distId) {
      console.warn(`Warning: Missing county ID mapping for county code: ${r.county_code}`);
      continue;
    }
    
    const lat = toNumOrNull(r.latitude);
    const lon = toNumOrNull(r.longitude);

    // Original Code:
    // const externalIds: Record<string, string> = {};
    // if (dhisId && dhisId !== "NA") externalIds.dhis2_uid = dhisId;
    // if (r.site_dhis2_name) externalIds.dhis2_name = r.site_dhis2_name;

    // Updated Code:
    // We added O(1) payam code lookup mapping and write the generated llgId directly to externalIds.llgId
    // to enable type-safe Level 3 geographic (Payam/LLG) filtering on facilities list and map markers.
    const externalIds: Record<string, string> = {};
    if (dhisId && dhisId !== "NA") externalIds.dhis2_uid = dhisId;
    if (r.site_dhis2_name) externalIds.dhis2_name = r.site_dhis2_name;
    const payamId = llgMap.get(r.payam_code.trim());
    if (payamId) {
      externalIds.llgId = String(payamId);
    }

    facilityRows.push({
      tenantId,
      name: r.site,
      hmisCode: hmis,
      facilityType: r.facility_type || "Unknown",
      operationalStatus: r.func_status === "1" ? "Operational" : "Non-Operational",
      districtId: distId,
      latitude: lat !== null ? String(lat) : null,
      longitude: lon !== null ? String(lon) : null,
      isActive: r.func_status === "1",
      externalIds,
    });
  }

  console.log(`Inserting ${facilityRows.length} facilities in batched chunks…`);
  const BATCH = 500;
  for (let i = 0; i < facilityRows.length; i += BATCH) {
    await db.insert(facilities).values(facilityRows.slice(i, i + BATCH));
  }
  console.log(`Successfully seeded ${facilityRows.length} facilities.`);

  // 8. Population Data
  console.log("Seeding baseline 2026 demographics populations for South Sudan states…");
  const popRows: (typeof populationData.$inferInsert)[] = [];
  const YEAR = 2026;

  for (const census of SSD_CENSUS_2026) {
    const matchingProv = await db.select()
      .from(provinces)
      .where(and(eq(provinces.tenantId, tenantId), eq(provinces.name, census.stateName)));
      
    if (matchingProv.length > 0) {
      const provId = matchingProv[0].id;
      popRows.push({
        tenantId,
        provinceId: provId,
        source: "nso",
        year: YEAR,
        totalPopulation: census.population,
        malePopulation: Math.round(census.population * 0.51),
        femalePopulation: Math.round(census.population * 0.49),
        under1Population: Math.round(census.population * 0.04),      // ~4.0% cohort
        under5Population: Math.round(census.population * 0.16),      // ~16.0% cohort
        pregnantWomen: Math.round(census.population * 0.045),         // ~4.5% cohort
        growthRate: census.growthRate,
        confidenceScore: "90.00",
        approvalStatus: "approved",
      });
    }
  }

  if (popRows.length > 0) {
    await db.insert(populationData).values(popRows);
    console.log(`Successfully seeded ${popRows.length} state-level population targets.`);
  }

  // 9. Rollup Verification Counts
  const counts = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM regions             WHERE tenant_id = ${tenantId}) AS regions,
      (SELECT COUNT(*) FROM provinces           WHERE tenant_id = ${tenantId}) AS states,
      (SELECT COUNT(*) FROM districts           WHERE tenant_id = ${tenantId}) AS counties,
      (SELECT COUNT(*) FROM llgs                WHERE tenant_id = ${tenantId}) AS payams,
      (SELECT COUNT(*) FROM facilities          WHERE tenant_id = ${tenantId}) AS facilities,
      (SELECT COUNT(*) FROM population_data     WHERE tenant_id = ${tenantId}) AS population_rows,
      (SELECT SUM(total_population)::bigint FROM population_data
       WHERE tenant_id = ${tenantId} AND source = 'nso') AS total_population_target
  `);
  
  console.log("\n========================================================");
  console.log("SOUTH SUDAN MIGRATION SEED COMPLETE!");
  console.table(counts.rows);
  console.log("========================================================\n");
  
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
