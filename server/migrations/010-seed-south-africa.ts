/**
 * Phase 4 — South Africa (ZAF) tenant bootstrap (Task #266)
 *
 * Loads data/south_africa/facilities.csv (~4,303 rows, 9 provinces, ~52 district
 * municipalities + per-province "Unassigned" buckets) as a tenant alongside PNG,
 * Zambia and South Sudan. Idempotent: upsert tenant by code, skip-existing on
 * (tenant_id, code) for region/province/district and (tenant_id, hmis_code) for
 * facilities, so re-running never duplicates.
 *
 * The per-country CSV is produced by scripts/prep-south-africa.ts, which filters
 * the attached "Sub-Saharan public health facilities" dataset to South Africa
 * and derives each facility's district via a point-in-polygon spatial join
 * against GeoBoundaries ADM2 (the source only carries province / Admin1).
 *
 * Run with:  tsx server/migrations/010-seed-south-africa.ts
 *
 * Prereq: 003-facility-external-ids.sql (adds facilities.external_ids column)
 */

import { db } from "../db";
import { sql, eq, and } from "drizzle-orm";
import {
  tenants,
  regions,
  provinces,
  districts,
  facilities,
} from "@shared/schema";
import { readFileSync } from "fs";
import { join } from "path";

const ZAF_TENANT = {
  code: "ZAF",
  name: "Republic of South Africa National Department of Health",
  countryCode: "ZAF",
  status: "active" as const,
  settings: {
    currency: "ZAR",
    currencySymbol: "R",
    languages: ["en", "zu", "xh", "af", "st"],
    defaultLanguage: "en",
    mapCenter: [-29.0, 24.5] as [number, number],
    mapZoom: 5,
    skipRegionLevel: true, // South Africa goes straight from country → province
    adminLevelLabels: {
      level1: "Region",
      level2: "Province",
      level3: "District",
      level4: "Sub-district",
      level5: "Ward",
    },
    epiSchedule: "ZAF_2024",
    fiscalYearStart: "04-01", // South African fiscal year starts 1 April
    demographics: {
      births: 0.020,
      under1: 0.019,
      pregnant: 0.021,
      schoolEntry: 0.018,
      schoolExit: 0.016,
    },
  },
};

interface ZafRow {
  province: string;
  district: string;
  name: string;
  facility_type: string;
  ownership: string;
  latitude: string;
  longitude: string;
  ll_source: string;
  fid: string;
}

// Lightweight CSV parser that handles quoted fields.
function parseCsv(text: string): ZafRow[] {
  const lines: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes;
    if (ch === "\n" && !inQuotes) {
      lines.push(cur);
      cur = "";
    } else if (ch !== "\r") {
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
  return lines
    .slice(1)
    .filter((l) => l.trim().length > 0)
    .map((l) => {
      const cells = splitLine(l);
      return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""])) as unknown as ZafRow;
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

// Official South African province codes (all distinct, ≤3 chars).
function provinceCode(name: string): string {
  const map: Record<string, string> = {
    "Eastern Cape": "EC",
    "Free State": "FS",
    Gauteng: "GP",
    "KwaZulu-Natal": "KZN",
    Limpopo: "LP",
    Mpumalanga: "MP",
    "North West": "NW",
    "Northern Cape": "NC",
    "Western Cape": "WC",
  };
  return map[name] || slug(name).toUpperCase().slice(0, 3);
}

// Map source ownership values to the app's agency naming.
function agencyOf(ownership: string): string | null {
  const map: Record<string, string> = {
    MoH: "Government",
    "Local authority": "Local Authority",
    "Private not for profit": "Private Not For Profit",
  };
  return map[ownership] || ownership || null;
}

async function run() {
  console.log("=== South Africa tenant bootstrap ===\n");

  // 0. Ensure external_ids column exists (idempotent).
  await db.execute(sql`
    ALTER TABLE facilities ADD COLUMN IF NOT EXISTS external_ids jsonb DEFAULT '{}'::jsonb
  `);
  await db.execute(sql`
    UPDATE facilities SET external_ids = '{}'::jsonb WHERE external_ids IS NULL
  `);

  // 1. Upsert ZAF tenant (refresh settings on every run to keep them in sync).
  const existingTenant = await db.select().from(tenants).where(eq(tenants.code, ZAF_TENANT.code));
  let tenantId: string;
  if (existingTenant.length > 0) {
    tenantId = existingTenant[0].id;
    await db.update(tenants)
      .set({ name: ZAF_TENANT.name, status: ZAF_TENANT.status, settings: ZAF_TENANT.settings, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId));
    console.log(`South Africa tenant already exists (settings refreshed): ${tenantId}`);
  } else {
    const [created] = await db.insert(tenants).values(ZAF_TENANT).returning();
    tenantId = created.id;
    console.log(`Created South Africa tenant: ${tenantId}`);
  }

  // 2. Load + parse CSV.
  const csvPath = join(process.cwd(), "data", "south_africa", "facilities.csv");
  const rows = parseCsv(readFileSync(csvPath, "utf8"));
  console.log(`Loaded ${rows.length} rows from ${csvPath}\n`);

  // 3. Single national region (skipRegionLevel keeps the schema uniform).
  let region = (await db.select().from(regions).where(
    and(eq(regions.tenantId, tenantId), eq(regions.code, "ZAF")),
  ))[0];
  if (!region) {
    [region] = await db.insert(regions).values({
      tenantId, name: "South Africa", code: "ZAF",
    } as typeof regions.$inferInsert).returning();
    console.log(`Created national region: id=${region.id}`);
  }

  // 4. Provinces — 9 unique.
  const provinceNames = (Array.from(new Set(rows.map((r) => r.province))) as string[]).sort();
  const provinceIdByName = new Map<string, number>();
  for (const name of provinceNames) {
    const code = provinceCode(name);
    let p = (await db.select().from(provinces).where(
      and(eq(provinces.tenantId, tenantId), eq(provinces.code, code)),
    ))[0];
    if (!p) {
      [p] = await db.insert(provinces).values({
        tenantId, name, code, regionId: region.id,
      } as typeof provinces.$inferInsert).returning();
    }
    provinceIdByName.set(name, p.id);
  }
  console.log(`Provinces: ${provinceIdByName.size}`);

  // 5. Districts — unique (province, district) pairs. district codes are
  // varchar(10); SA metros collide on a 6-char slug (several "City of …"), so
  // dedupe by appending a counter while staying within 10 chars.
  const districtKey = (r: ZafRow) => `${r.province}|${r.district}`;
  const districtPairs = (Array.from(new Set(rows.map(districtKey))) as string[]).sort();
  const districtIdByKey = new Map<string, number>();
  const usedCodes = new Set<string>(
    (await db.select({ code: districts.code }).from(districts).where(eq(districts.tenantId, tenantId))).map((d) => d.code),
  );

  const makeDistrictCode = (provName: string, distName: string): string => {
    const prov = provinceCode(provName);
    const base = `${prov}-${slug(distName).toUpperCase().replace(/-/g, "").slice(0, 10 - prov.length - 1)}`;
    if (!usedCodes.has(base)) {
      usedCodes.add(base);
      return base;
    }
    for (let i = 1; i < 100; i++) {
      const suffix = String(i);
      const trimmed = base.slice(0, 10 - suffix.length);
      const candidate = `${trimmed}${suffix}`;
      if (!usedCodes.has(candidate)) {
        usedCodes.add(candidate);
        return candidate;
      }
    }
    throw new Error(`Could not derive a unique district code for ${provName}/${distName}`);
  };

  for (const key of districtPairs) {
    const [provName, distName] = key.split("|");
    const provId = provinceIdByName.get(provName)!;
    // Skip-existing by name within the province (re-run safety).
    const existing = (await db.select().from(districts).where(
      and(eq(districts.tenantId, tenantId), eq(districts.provinceId, provId), eq(districts.name, distName)),
    ))[0];
    if (existing) {
      districtIdByKey.set(key, existing.id);
      continue;
    }
    const code = makeDistrictCode(provName, distName);
    const [d] = await db.insert(districts).values({
      tenantId, name: distName, code, provinceId: provId,
    } as typeof districts.$inferInsert).returning();
    districtIdByKey.set(key, d.id);
  }
  console.log(`Districts: ${districtIdByKey.size}`);

  // 6. Facilities. hmis_code synthesized from the GIS FID (source has no HMIS
  // codes); fall back to a name-based code if FID is missing.
  const existingHmis = new Set<string>(
    (await db.select({ hmisCode: facilities.hmisCode })
      .from(facilities)
      .where(eq(facilities.tenantId, tenantId))).map((r) => r.hmisCode),
  );

  type FacInsert = typeof facilities.$inferInsert;
  const facilityRows: FacInsert[] = [];

  for (const r of rows) {
    let hmis = r.fid ? `ZAF-${r.fid}` : `ZAF-SYN-${slug(r.province)}-${slug(r.name)}`;
    hmis = hmis.slice(0, 50);
    if (existingHmis.has(hmis)) continue;
    existingHmis.add(hmis);

    const distId = districtIdByKey.get(districtKey(r))!;
    const lat = toNumOrNull(r.latitude);
    const lon = toNumOrNull(r.longitude);

    const externalIds: Record<string, string> = {};
    if (r.fid) externalIds.gis_fid = r.fid;
    if (r.ll_source) externalIds.coordinate_source = r.ll_source;

    facilityRows.push({
      tenantId,
      name: r.name,
      hmisCode: hmis,
      facilityType: r.facility_type || "Unknown",
      agencyName: agencyOf(r.ownership),
      operationalStatus: null,
      districtId: distId,
      latitude: lat !== null ? String(lat) : null,
      longitude: lon !== null ? String(lon) : null,
      isActive: true,
      externalIds,
    });
  }

  console.log(`Inserting ${facilityRows.length} new facilities (skipped ${rows.length - facilityRows.length} already present)…`);
  const BATCH = 500;
  for (let i = 0; i < facilityRows.length; i += BATCH) {
    await db.insert(facilities).values(facilityRows.slice(i, i + BATCH));
  }

  // 7. Summary.
  const counts = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM regions    WHERE tenant_id = ${tenantId}) AS regions,
      (SELECT COUNT(*) FROM provinces  WHERE tenant_id = ${tenantId}) AS provinces,
      (SELECT COUNT(*) FROM districts  WHERE tenant_id = ${tenantId}) AS districts,
      (SELECT COUNT(*) FROM facilities WHERE tenant_id = ${tenantId}) AS facilities,
      (SELECT COUNT(*) FROM facilities WHERE tenant_id = ${tenantId} AND latitude IS NOT NULL) AS located_facilities
  `);
  console.log("\nSouth Africa tenant rollup:");
  console.table(counts.rows);
  console.log("\nDone.");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
