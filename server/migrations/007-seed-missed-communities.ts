/**
 * Phase 5 — Demo Missed Communities seed.
 *
 * Scatters realistic "missed community" demo rows across every country we
 * support (PNG, ZMB, SSD) so the Missed Communities map + ranked list is
 * populated nationwide, not just at the three demo facilities seeded in
 * 006-seed-demo-operational.
 *
 * What it does, per tenant:
 *   1. Samples up to N facilities spread across as many distinct districts
 *      and provinces as possible (stratified — one facility per district
 *      first, then fills remaining slots).
 *   2. For each picked facility, creates 2–3 villages named
 *      "Demo Missed Village <facility> #i" with coordinates spiralled
 *      around the facility (1.5–6 km).
 *   3. Inserts village-level population_data (under-1 cohort) and
 *      htr_scores for variety.
 *   4. Inserts imported_coverage rows at the facility level for the current
 *      and previous YYYYMM periods with deliberately low doses (so the
 *      deterministic scorer surfaces these villages as missed).
 *
 * Idempotent: rerunning skips any facility whose marker village already
 * exists. Safe to call from a CLI or imported as a module.
 *
 * Run with:  tsx server/migrations/007-seed-missed-communities.ts
 */

import { db } from "../db";
import { sql, eq, and, inArray } from "drizzle-orm";
import {
  tenants,
  facilities,
  districts,
  villages,
  populationData,
  htrScores,
  importedCoverage,
} from "../../shared/schema";

type TenantCode = "PNG" | "ZMB" | "SSD";

const TENANT_CODES: TenantCode[] = ["PNG", "ZMB", "SSD"];

// Total demo facilities to scatter missed villages around, per tenant.
const FACILITIES_PER_TENANT = 30;

// Demo villages created per picked facility.
const VILLAGES_PER_FACILITY = 3;

// Antigens we surface low coverage for, mirroring the demo operational seed.
const ANTIGENS = ["BCG", "OPV", "Penta", "MR"];

// Doses per child by antigen — used to size facility "expected" doses so the
// missed-coverage gap is realistic.
const DOSES_PER_CHILD: Record<string, number> = {
  BCG: 1,
  OPV: 3,
  Penta: 3,
  MR: 1,
};

// Coverage fraction administered = 10–45% of "expected". Deliberately low so
// every demo village shows up as missed in the scorer.
function lowCoverageFraction(seed: number): number {
  const r = (Math.sin(seed * 41.13) + 1) / 2;
  return 0.1 + r * 0.35;
}

function offsetCoord(baseLat: number, baseLng: number, index: number) {
  const angle = (index * 137.508) * (Math.PI / 180);
  const distanceKm = 1.5 + (index % 5) * 1.1;
  const dLat = (distanceKm / 111) * Math.cos(angle);
  const cosLat = Math.cos((baseLat * Math.PI) / 180);
  const dLng = (distanceKm / (111 * Math.max(0.2, cosLat))) * Math.sin(angle);
  return { lat: baseLat + dLat, lng: baseLng + dLng, distanceKm };
}

function periodFor(yearMonth: Date): string {
  const y = yearMonth.getUTCFullYear();
  const m = String(yearMonth.getUTCMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

interface FacilityPick {
  facilityId: number;
  facilityName: string;
  districtId: number;
  districtName: string;
  provinceId: number;
  provinceName: string;
  latitude: number;
  longitude: number;
}

async function pickFacilitiesStratified(tenantId: string, target: number): Promise<FacilityPick[]> {
  const rows = await db.execute(sql`
    SELECT f.id AS facility_id,
           f.name AS facility_name,
           f.latitude::float AS latitude,
           f.longitude::float AS longitude,
           d.id AS district_id,
           d.name AS district_name,
           p.id AS province_id,
           p.name AS province_name
    FROM facilities f
    JOIN districts d ON d.id = f.district_id
    JOIN provinces p ON p.id = d.province_id
    WHERE f.tenant_id = ${tenantId}
      AND f.latitude IS NOT NULL
      AND f.longitude IS NOT NULL
      AND COALESCE(f.is_active, true) = true
    ORDER BY f.id
  `);

  const all = ((rows as any).rows ?? []) as Array<{
    facility_id: number; facility_name: string;
    latitude: number; longitude: number;
    district_id: number; district_name: string;
    province_id: number; province_name: string;
  }>;

  if (all.length === 0) return [];

  // Bucket by district, then round-robin so the picked set spans as many
  // districts (and provinces) as possible.
  const byDistrict = new Map<number, typeof all>();
  for (const f of all) {
    const arr = byDistrict.get(f.district_id) ?? [];
    arr.push(f);
    byDistrict.set(f.district_id, arr);
  }
  const districtsList = Array.from(byDistrict.entries());
  // Deterministic seed by facility id so the picks are stable across reruns.
  districtsList.sort((a, b) => a[0] - b[0]);

  const picks: FacilityPick[] = [];
  let round = 0;
  while (picks.length < target) {
    let added = 0;
    for (const [, fs] of districtsList) {
      if (round >= fs.length) continue;
      const f = fs[round];
      picks.push({
        facilityId: f.facility_id,
        facilityName: f.facility_name,
        latitude: f.latitude,
        longitude: f.longitude,
        districtId: f.district_id,
        districtName: f.district_name,
        provinceId: f.province_id,
        provinceName: f.province_name,
      });
      added++;
      if (picks.length >= target) break;
    }
    if (added === 0) break;
    round++;
  }
  return picks;
}

async function seedTenant(code: TenantCode): Promise<{
  facilitiesPicked: number;
  villagesInserted: number;
  populationInserted: number;
  htrInserted: number;
  coverageInserted: number;
}> {
  const tenantRows = await db.select().from(tenants).where(eq(tenants.code, code)).limit(1);
  const tenant = tenantRows[0];
  if (!tenant) {
    console.warn(`[${code}] tenant not found — skipping missed-community seed.`);
    return { facilitiesPicked: 0, villagesInserted: 0, populationInserted: 0, htrInserted: 0, coverageInserted: 0 };
  }

  const picks = await pickFacilitiesStratified(tenant.id, FACILITIES_PER_TENANT);
  if (picks.length === 0) {
    console.warn(`[${code}] no geocoded facilities — skipping missed-community seed.`);
    return { facilitiesPicked: 0, villagesInserted: 0, populationInserted: 0, htrInserted: 0, coverageInserted: 0 };
  }

  // Period set: previous + current YYYYMM.
  const now = new Date();
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const periods = [periodFor(prev), periodFor(now)];

  let villagesInserted = 0;
  let populationInserted = 0;
  let htrInserted = 0;
  let coverageInserted = 0;

  for (const p of picks) {
    // Skip facilities that already have a demo missed village (idempotency).
    const marker = await db
      .select({ id: villages.id })
      .from(villages)
      .where(
        and(
          eq(villages.tenantId, tenant.id),
          eq(villages.assignedFacilityId, p.facilityId),
          sql`${villages.name} LIKE 'Demo Missed Village%'`,
        ),
      )
      .limit(1);
    if (marker.length > 0) continue;

    const facilityVillageIds: number[] = [];
    let facilityUnder1Sum = 0;

    for (let i = 1; i <= VILLAGES_PER_FACILITY; i++) {
      const { lat, lng, distanceKm } = offsetCoord(p.latitude, p.longitude, i + p.facilityId);
      const name = `Demo Missed Village ${p.facilityName} #${i}`;
      const under1 = 25 + (i * 17 + (p.facilityId % 7) * 4);
      const totalPop = Math.round(under1 / 0.035);
      const isHtr = (i + p.facilityId) % 3 === 0;
      // terrain_difficulty is an integer 1–5 (1 = easy, 5 = very difficult).
      const terrain = isHtr ? 4 : (i % 2 === 0 ? 1 : 2);

      const [village] = await db
        .insert(villages)
        .values({
          tenantId: tenant.id,
          name,
          code: `DEMO-MC-${p.facilityId}-${i}`,
          districtId: p.districtId,
          assignedFacilityId: p.facilityId,
          latitude: lat.toFixed(7),
          longitude: lng.toFixed(7),
          distanceToFacility: distanceKm.toFixed(2),
          travelTimeMinutes: Math.round(distanceKm * 12),
          terrainDifficulty: terrain,
          isHardToReach: isHtr,
          seasonalAccessibility: isHtr ? "wet_season_only" : "year_round",
          transportMode: distanceKm > 4 ? "boat" : "walking",
          comments: "Seeded demo community for Missed Communities workspace.",
        })
        .returning({ id: villages.id });

      facilityVillageIds.push(village.id);
      villagesInserted++;
      facilityUnder1Sum += under1;

      await db.insert(populationData).values({
        tenantId: tenant.id,
        provinceId: p.provinceId,
        districtId: p.districtId,
        villageId: village.id,
        facilityId: p.facilityId,
        source: "nso",
        year: now.getUTCFullYear(),
        totalPopulation: totalPop,
        malePopulation: Math.round(totalPop * 0.51),
        femalePopulation: Math.round(totalPop * 0.49),
        under1Population: under1,
        under5Population: under1 * 5,
        pregnantWomen: Math.round(totalPop * 0.04),
        confidenceScore: "75.00",
        approvalStatus: "approved",
      });
      populationInserted++;

      const composite = Math.round(
        (isHtr ? 60 : 30) + (distanceKm * 4) + (((p.facilityId + i) % 5) * 3),
      );
      await db
        .insert(htrScores)
        .values({
          tenantId: tenant.id,
          villageId: village.id,
          distanceScore: String(Math.min(100, Math.round(distanceKm * 14))),
          terrainScore: isHtr ? "75" : "30",
          seasonalScore: isHtr ? "70" : "20",
          coverageScore: "65",
          insecurityScore: "10",
          compositeScore: String(Math.min(100, composite)),
          interventionPriority: composite > 70 ? "critical" : composite > 50 ? "high" : "moderate",
          comments: "Auto-scored demo HTR row.",
        })
        .onConflictDoNothing();
      htrInserted++;
    }

    // Facility-level imported_coverage for each antigen, deliberately low.
    for (const antigen of ANTIGENS) {
      const expected = facilityUnder1Sum * (DOSES_PER_CHILD[antigen] ?? 1);
      const frac = lowCoverageFraction(p.facilityId + antigen.length);
      const administered = Math.max(0, Math.round(expected * frac));

      for (const period of periods) {
        const existing = await db
          .select({ id: importedCoverage.id })
          .from(importedCoverage)
          .where(
            and(
              eq(importedCoverage.tenantId, tenant.id),
              eq(importedCoverage.facilityId, p.facilityId),
              eq(importedCoverage.period, period),
              eq(importedCoverage.antigen, antigen),
              eq(importedCoverage.source, "csv"),
            ),
          )
          .limit(1);
        if (existing.length > 0) continue;

        await db.insert(importedCoverage).values({
          tenantId: tenant.id,
          facilityId: p.facilityId,
          period,
          antigen,
          dosesAdministered: administered,
          source: "csv",
          sourceRef: `demo-missed-${p.facilityId}-${period}-${antigen}.csv`,
        });
        coverageInserted++;
      }
    }
  }

  return {
    facilitiesPicked: picks.length,
    villagesInserted,
    populationInserted,
    htrInserted,
    coverageInserted,
  };
}

export async function seedMissedCommunities(): Promise<void> {
  for (const code of TENANT_CODES) {
    const out = await seedTenant(code);
    console.log(
      `[${code}] picked ${out.facilitiesPicked} facilities • +${out.villagesInserted} villages • +${out.populationInserted} village-pop • +${out.htrInserted} HTR scores • +${out.coverageInserted} coverage rows`,
    );
  }
}

const isDirectCli = (() => {
  try {
    const invoked = process.argv[1] ?? "";
    return invoked.endsWith("007-seed-missed-communities.ts") ||
           invoked.endsWith("007-seed-missed-communities.js");
  } catch {
    return false;
  }
})();

if (isDirectCli) {
  seedMissedCommunities()
    .then(async () => {
      const summary = await db.execute(sql`
        SELECT t.code,
          (SELECT COUNT(*) FROM villages v WHERE v.tenant_id = t.id AND v.name LIKE 'Demo Missed Village%') AS demo_villages,
          (SELECT COUNT(DISTINCT v.district_id) FROM villages v WHERE v.tenant_id = t.id AND v.name LIKE 'Demo Missed Village%') AS districts_covered,
          (SELECT COUNT(*) FROM imported_coverage ic WHERE ic.tenant_id = t.id AND ic.source_ref LIKE 'demo-missed-%') AS coverage_rows
        FROM tenants t WHERE t.code IN ('PNG','ZMB','SSD') ORDER BY t.code;
      `);
      console.log("\nMissed-communities seed rollup:");
      console.table((summary as any).rows);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Missed-communities seed failed:", err);
      process.exit(1);
    });
}
