/**
 * Phase 4 — Papua New Guinea tenant bootstrap
 *
 * Loads data/png/facilities.csv (705 rows, 20 provinces, 68 districts, 147 LLGs)
 * derived from the National Statistics Office / UN-OCHA ROAP "Papua New Guinea —
 * Health Facilities" dataset (HDX id e5e8e04a-6d5b-41a2-b4fe-c8241bbdcd78,
 * national MFL of 705 facilities). Province → 4 official PNG regions
 * (Southern, Highlands, Momase, Islands).
 *
 * Idempotent: clears existing PNG facility / hierarchy rows for tenant code 'PNG'
 * before reseeding so re-runs converge. Province-level population_data is also
 * re-seeded from the NSO 2024 projection table.
 *
 * Run with:  tsx server/migrations/006-seed-png.ts
 *
 * Prereqs: 001-multitenant-backfill.ts (creates PNG tenant) and
 *          003-facility-external-ids.sql (adds external_ids column).
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
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const PNG_TENANT_SETTINGS = {
  currency: "PGK",
  currencySymbol: "K",
  languages: ["en", "tpi", "ho"],
  defaultLanguage: "en",
  mapCenter: [-6.0, 145.0] as [number, number],
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
  populationSources: [
    { code: "nso", label: "NSO 2024 Census Projection" },
    { code: "hmis", label: "HMIS Catchment Headcount" },
    { code: "worldpop", label: "WorldPop 2026 Gridded (100m)" },
    { code: "community_census", label: "Community / Ward CHW Census" },
  ],
};

// NSO-projected 2024 province populations (matches the table previously held in
// server/seed-census.ts so existing forecasting math keeps the same baseline).
const PNG_CENSUS_2024: { provinceName: string; population: number; growthRate: string }[] = [
  { provinceName: "Western", population: 300019, growthRate: "2.80" },
  { provinceName: "Gulf", population: 203545, growthRate: "2.50" },
  { provinceName: "Central", population: 373779, growthRate: "3.10" },
  { provinceName: "National Capital District", population: 756754, growthRate: "4.20" },
  { provinceName: "Milne Bay", population: 412158, growthRate: "2.40" },
  { provinceName: "Northern", population: 273950, growthRate: "2.30" },
  { provinceName: "Southern Highlands", population: 602085, growthRate: "3.00" },
  { provinceName: "Enga", population: 489971, growthRate: "2.90" },
  { provinceName: "Western Highlands", population: 462566, growthRate: "2.70" },
  { provinceName: "Chimbu", population: 458406, growthRate: "2.60" },
  { provinceName: "Eastern Highlands", population: 800072, growthRate: "3.20" },
  { provinceName: "Hela", population: 365806, growthRate: "3.50" },
  { provinceName: "Jiwaka", population: 455208, growthRate: "3.10" },
  { provinceName: "Morobe", population: 997545, growthRate: "3.30" },
  { provinceName: "Madang", population: 761154, growthRate: "2.80" },
  { provinceName: "East Sepik", population: 631791, growthRate: "2.50" },
  { provinceName: "West Sepik", population: 362721, growthRate: "2.40" },
  { provinceName: "Manus", population: 69560, growthRate: "2.20" },
  { provinceName: "New Ireland", population: 237780, growthRate: "2.60" },
  { provinceName: "East New Britain", population: 434757, growthRate: "2.70" },
  { provinceName: "West New Britain", population: 368643, growthRate: "3.00" },
  { provinceName: "Bougainville", population: 367093, growthRate: "2.80" },
];

// Stable 3-letter region codes for PNG's four official regions.
const REGION_CODES: Record<string, string> = {
  Southern: "STH",
  Highlands: "HLD",
  Momase: "MOM",
  Islands: "ISL",
};

interface PngRow {
  objectid: string;
  region: string;
  province: string;
  province_code: string;
  district: string;
  district_code: string;
  llg: string;
  llg_code: string;
  facility_name: string;
  facility_type: string;
  latitude: string;
  longitude: string;
}

function parseCsv(text: string): PngRow[] {
  const lines: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (const ch of text) {
    if (cur === "" && ch === "\r") continue;
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
        if (q && line[i + 1] === '"') { field += '"'; i++; }
        else q = !q;
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
      return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""])) as unknown as PngRow;
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
  console.log("=== Papua New Guinea Master Facility List Bootstrap ===\n");

  // 0. Ensure facilities.external_ids exists (matches 003-facility-external-ids.sql).
  await db.execute(sql`
    ALTER TABLE facilities ADD COLUMN IF NOT EXISTS external_ids jsonb DEFAULT '{}'::jsonb
  `);
  await db.execute(sql`
    UPDATE facilities SET external_ids = '{}'::jsonb WHERE external_ids IS NULL
  `);

  // 1. Resolve PNG tenant (must exist; 001-multitenant-backfill.ts creates it).
  const existingTenant = await db.select().from(tenants).where(eq(tenants.code, "PNG"));
  if (existingTenant.length === 0) {
    console.error("PNG tenant not found. Run 001-multitenant-backfill.ts first.");
    process.exit(1);
  }
  const tenantId = existingTenant[0].id;
  console.log(`PNG tenant: ${tenantId}`);

  // 2. Refresh tenant settings so demographics + populationSources stay in sync.
  await db.update(tenants).set({ settings: PNG_TENANT_SETTINGS }).where(eq(tenants.id, tenantId));

  // 3. Clear existing PNG hierarchy + facilities + population so seed is deterministic.
  console.log("Clearing existing PNG hierarchy / facilities / population…");
  await db.delete(populationData).where(eq(populationData.tenantId, tenantId));
  await db.delete(villages).where(eq(villages.tenantId, tenantId));
  await db.delete(facilities).where(eq(facilities.tenantId, tenantId));
  await db.delete(llgs).where(eq(llgs.tenantId, tenantId));
  await db.delete(districts).where(eq(districts.tenantId, tenantId));
  await db.delete(provinces).where(eq(provinces.tenantId, tenantId));
  await db.delete(regions).where(eq(regions.tenantId, tenantId));

  // 4. Load CSV.
  const csvPath = join(process.cwd(), "data", "png", "facilities.csv");
  if (!existsSync(csvPath)) {
    console.error(`CSV file not found at: ${csvPath}`);
    process.exit(1);
  }
  const rows = parseCsv(readFileSync(csvPath, "utf8"));
  console.log(`Loaded ${rows.length} facility rows from ${csvPath}\n`);

  // 5. Regions — PNG's 4 official regions, plus a fallback for any unmapped province.
  const regionIdByName = new Map<string, number>();
  const regionNames = Array.from(new Set(rows.map((r) => r.region || "Unknown")));
  for (const name of regionNames) {
    const code = REGION_CODES[name] || "UNK";
    const [reg] = await db.insert(regions).values({
      tenantId, name, code,
    } as typeof regions.$inferInsert).returning();
    regionIdByName.set(name, reg.id);
  }
  console.log(`Seeded ${regionIdByName.size} regions: ${[...regionIdByName.keys()].join(", ")}`);

  // 6. Provinces — keyed by NSO ADM1 code (e.g. "070").
  const provinceIdByCode = new Map<string, number>();
  const uniqueProvinces = new Map<string, { name: string; region: string }>();
  for (const r of rows) {
    if (!uniqueProvinces.has(r.province_code)) {
      uniqueProvinces.set(r.province_code, { name: r.province, region: r.region || "Unknown" });
    }
  }
  for (const [code, info] of uniqueProvinces) {
    const regionId = regionIdByName.get(info.region);
    const [p] = await db.insert(provinces).values({
      tenantId, name: info.name, code, regionId,
    } as typeof provinces.$inferInsert).returning();
    provinceIdByCode.set(code, p.id);
  }
  console.log(`Seeded ${provinceIdByCode.size} provinces.`);

  // 7. Districts — keyed by NSO ADM2 code (e.g. "0703").
  const districtIdByCode = new Map<string, number>();
  const uniqueDistricts = new Map<string, { name: string; provCode: string }>();
  for (const r of rows) {
    if (!uniqueDistricts.has(r.district_code)) {
      uniqueDistricts.set(r.district_code, { name: r.district, provCode: r.province_code });
    }
  }
  for (const [code, info] of uniqueDistricts) {
    const provId = provinceIdByCode.get(info.provCode);
    if (!provId) {
      console.warn(`District ${code} (${info.name}) has no province ${info.provCode}, skipping.`);
      continue;
    }
    const [d] = await db.insert(districts).values({
      tenantId, name: info.name, code, provinceId: provId,
    } as typeof districts.$inferInsert).returning();
    districtIdByCode.set(code, d.id);
  }
  console.log(`Seeded ${districtIdByCode.size} districts.`);

  // 8. LLGs — keyed by NSO ADM3 code (e.g. "070310").
  const llgIdByCode = new Map<string, number>();
  const uniqueLlgs = new Map<string, { name: string; distCode: string }>();
  for (const r of rows) {
    if (!r.llg_code) continue;
    if (!uniqueLlgs.has(r.llg_code)) {
      uniqueLlgs.set(r.llg_code, { name: r.llg, distCode: r.district_code });
    }
  }
  for (const [code, info] of uniqueLlgs) {
    const distId = districtIdByCode.get(info.distCode);
    if (!distId) continue;
    const [llg] = await db.insert(llgs).values({
      tenantId, name: info.name, code, districtId: distId,
    } as typeof llgs.$inferInsert).returning();
    llgIdByCode.set(code, llg.id);
  }
  console.log(`Seeded ${llgIdByCode.size} LLGs.`);

  // 9. Facilities — synthesize a stable HMIS code per row (the NSO source has no
  //    eNHIS code column, so we use OBJECTID + slugged name to stay unique and
  //    reproducible across re-runs).
  const facilityRows: (typeof facilities.$inferInsert)[] = [];
  const seenHmis = new Set<string>();
  let skippedNoDistrict = 0;

  for (const r of rows) {
    const distId = districtIdByCode.get(r.district_code);
    if (!distId) {
      skippedNoDistrict++;
      continue;
    }
    let hmis = `PNG-NSO-${r.objectid}-${slug(r.facility_name)}`.slice(0, 50);
    // Defensive uniqueness — the NSO file has 7 (LLG, name) collisions.
    let suffix = 1;
    while (seenHmis.has(hmis)) {
      hmis = `${hmis.slice(0, 47)}-${suffix++}`;
    }
    seenHmis.add(hmis);

    const lat = toNumOrNull(r.latitude);
    const lon = toNumOrNull(r.longitude);
    const llgId = llgIdByCode.get(r.llg_code);

    const externalIds: Record<string, string> = {
      nso_objectid: r.objectid,
      adm1_code: r.province_code,
      adm2_code: r.district_code,
    };
    if (r.llg_code) externalIds.adm3_code = r.llg_code;
    if (llgId) externalIds.llgId = String(llgId);

    facilityRows.push({
      tenantId,
      name: r.facility_name || "Unnamed Facility",
      hmisCode: hmis,
      facilityType: r.facility_type || "Unknown",
      operationalStatus: "Operational",
      districtId: distId,
      latitude: lat !== null ? String(lat) : null,
      longitude: lon !== null ? String(lon) : null,
      isActive: true,
      externalIds,
    });
  }

  if (skippedNoDistrict > 0) {
    console.warn(`Skipped ${skippedNoDistrict} facilities with no matching district.`);
  }
  console.log(`Inserting ${facilityRows.length} facilities in batches…`);
  const BATCH = 500;
  for (let i = 0; i < facilityRows.length; i += BATCH) {
    await db.insert(facilities).values(facilityRows.slice(i, i + BATCH));
  }

  // 10. Province-level population_data from NSO 2024 projection.
  const provNameToId = new Map<string, number>();
  const provRows = await db.select({ id: provinces.id, name: provinces.name })
    .from(provinces).where(eq(provinces.tenantId, tenantId));
  for (const p of provRows) provNameToId.set(p.name.toLowerCase(), p.id);

  const YEAR = 2024;
  const popRows: (typeof populationData.$inferInsert)[] = [];
  let matchedCensus = 0;
  for (const c of PNG_CENSUS_2024) {
    const provId = provNameToId.get(c.provinceName.toLowerCase());
    if (!provId) continue; // Hela / Jiwaka / Bougainville aren't in the 2000 NSO MFL — skip silently.
    matchedCensus++;
    popRows.push({
      tenantId,
      provinceId: provId,
      source: "nso",
      year: YEAR,
      totalPopulation: c.population,
      malePopulation: Math.round(c.population * 0.51),
      femalePopulation: Math.round(c.population * 0.49),
      under1Population: Math.round(c.population * 0.030),
      under5Population: Math.round(c.population * 0.14),
      pregnantWomen: Math.round(c.population * 0.032),
      growthRate: c.growthRate,
      confidenceScore: "95.00",
      approvalStatus: "approved",
    });
  }
  if (popRows.length > 0) {
    await db.insert(populationData).values(popRows);
  }
  console.log(`Seeded ${popRows.length} province-level population rows (matched ${matchedCensus} of ${PNG_CENSUS_2024.length} census entries).`);

  // 11. Rollup.
  const counts = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM regions             WHERE tenant_id = ${tenantId}) AS regions,
      (SELECT COUNT(*) FROM provinces           WHERE tenant_id = ${tenantId}) AS provinces,
      (SELECT COUNT(*) FROM districts           WHERE tenant_id = ${tenantId}) AS districts,
      (SELECT COUNT(*) FROM llgs                WHERE tenant_id = ${tenantId}) AS llgs,
      (SELECT COUNT(*) FROM facilities          WHERE tenant_id = ${tenantId}) AS facilities,
      (SELECT COUNT(*) FROM population_data     WHERE tenant_id = ${tenantId}) AS population_rows,
      (SELECT SUM(total_population)::bigint FROM population_data
       WHERE tenant_id = ${tenantId} AND source = 'nso') AS nso_total_population
  `);

  console.log("\n========================================================");
  console.log("PAPUA NEW GUINEA SEED COMPLETE!");
  console.table(counts.rows);
  console.log("========================================================\n");

  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
