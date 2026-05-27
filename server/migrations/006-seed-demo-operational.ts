/**
 * Phase 4 — Demo operational data (users, vaccine requirements, session plans)
 *
 * Seeds a small, realistic set of mock users (one per role), vaccine
 * requirements, and session plans (in draft/pending/approved states) for the
 * ZMB and SSD tenants so microplan authoring, approval workflows, and
 * dashboards can be demoed end-to-end.
 *
 * Idempotent and tenant-scoped:
 *   - Users are upserted by email (unique).
 *   - vaccine_requirements rows are skipped when one already exists for
 *     (tenant, facility, vaccine, quarter, year).
 *   - session_plans rows are skipped when one already exists for
 *     (tenant, facility, name, quarter, year).
 *   - monthly_reports rows are skipped when one already exists for
 *     (tenant, facility, month, year).
 *
 * Run with:  tsx server/migrations/006-seed-demo-operational.ts
 */

import { db } from "../db";
import { sql, eq, and } from "drizzle-orm";
import {
  tenants,
  users,
  facilities,
  districts,
  provinces,
  vaccineRequirements,
  sessionPlans,
  populationData,
  monthlyReports,
} from "../../shared/schema";

type TenantCode = "ZMB" | "SSD";

interface FacilityPick {
  facilityId: number;
  facilityName: string;
  districtId: number;
  districtName: string;
  provinceId: number;
  provinceName: string;
}

const FACILITIES_PER_TENANT = 3;
const YEAR = new Date().getUTCFullYear();
const QUARTER = Math.floor(new Date().getUTCMonth() / 3) + 1;

const VACCINES: Array<{
  name: string;
  cohort: "under1" | "schoolEntry" | "pregnant";
  dosesPerChild: number;
  wastageRate: number; // percent
  dosesPerVial: number;
}> = [
  { name: "BCG",     cohort: "under1",      dosesPerChild: 1, wastageRate: 50, dosesPerVial: 20 },
  { name: "OPV",     cohort: "under1",      dosesPerChild: 4, wastageRate: 25, dosesPerVial: 20 },
  { name: "Penta",   cohort: "under1",      dosesPerChild: 3, wastageRate: 10, dosesPerVial: 1  },
  { name: "MR",      cohort: "schoolEntry", dosesPerChild: 2, wastageRate: 15, dosesPerVial: 10 },
  { name: "TT",      cohort: "pregnant",    dosesPerChild: 2, wastageRate: 10, dosesPerVial: 20 },
];

interface DemoSessionTemplate {
  suffix: string;
  sessionType: "static" | "mobile" | "outreach";
  approvalStatus: "draft" | "pending" | "approved";
  status: string;
  transportMode: "walking" | "road" | "boat" | "air";
  estimatedDuration: number;
  /**
   * Fraction of the facility's under-1 cohort this session targets.
   * The actual target population is derived per-facility from
   * population_data so dashboards stay consistent.
   */
  under1Fraction: number;
  notes: string;
  daysFromNow: number;
}

const SESSION_TEMPLATES: DemoSessionTemplate[] = [
  {
    suffix: "Routine Fixed Session",
    sessionType: "static",
    approvalStatus: "approved",
    status: "planned",
    transportMode: "walking",
    estimatedDuration: 240,
    under1Fraction: 0.25,
    notes: "Weekly routine immunization at the static post.",
    daysFromNow: 7,
  },
  {
    suffix: "Outreach Visit",
    sessionType: "outreach",
    approvalStatus: "pending",
    status: "planned",
    transportMode: "road",
    estimatedDuration: 360,
    under1Fraction: 0.15,
    notes: "Outreach to nearby village cluster; awaiting district sign-off.",
    daysFromNow: 14,
  },
  {
    suffix: "Mobile Catch-Up",
    sessionType: "mobile",
    approvalStatus: "draft",
    status: "planned",
    transportMode: "road",
    estimatedDuration: 480,
    under1Fraction: 0.35,
    notes: "Draft mobile catch-up plan for unreached children.",
    daysFromNow: 21,
  },
];

/**
 * Demo catchment populations assigned per facility position so that each
 * picked facility has a distinct, realistic head count. Used when no
 * existing population_data row is present for the (tenant, facility, year).
 */
const DEMO_CATCHMENTS = [4200, 6800, 9500, 3100, 7400, 5200];

async function pickFacilities(tenantId: string): Promise<FacilityPick[]> {
  const rows = await db
    .select({
      facilityId: facilities.id,
      facilityName: facilities.name,
      districtId: districts.id,
      districtName: districts.name,
      provinceId: provinces.id,
      provinceName: provinces.name,
    })
    .from(facilities)
    .innerJoin(districts, eq(districts.id, facilities.districtId))
    .innerJoin(provinces, eq(provinces.id, districts.provinceId))
    .where(and(eq(facilities.tenantId, tenantId), eq(facilities.isActive, true)))
    .orderBy(facilities.id)
    .limit(FACILITIES_PER_TENANT);
  return rows;
}

function emailFor(tenantCode: TenantCode, slug: string): string {
  return `demo+${slug}@${tenantCode.toLowerCase()}.vaxplan.test`;
}

interface UserSeed {
  slug: string;
  firstName: string;
  lastName: string;
  role:
    | "facility_clerk"
    | "facility_in_charge"
    | "district_manager"
    | "provincial_coordinator"
    | "national_admin";
  facilityId?: number;
  districtId?: number;
  provinceId?: number;
}

async function seedUsers(
  tenantCode: TenantCode,
  tenantId: string,
  picks: FacilityPick[],
): Promise<number> {
  if (picks.length === 0) return 0;
  const anchor = picks[0];

  const seeds: UserSeed[] = [
    {
      slug: "national-admin",
      firstName: "Nadia",
      lastName: "National",
      role: "national_admin",
    },
    {
      slug: `prov-${anchor.provinceId}`,
      firstName: "Priya",
      lastName: "Provincial",
      role: "provincial_coordinator",
      provinceId: anchor.provinceId,
    },
    {
      slug: `dist-${anchor.districtId}`,
      firstName: "Derek",
      lastName: "District",
      role: "district_manager",
      provinceId: anchor.provinceId,
      districtId: anchor.districtId,
    },
  ];

  picks.forEach((p, i) => {
    seeds.push({
      slug: `incharge-${p.facilityId}`,
      firstName: `Ingrid${i + 1}`,
      lastName: "InCharge",
      role: "facility_in_charge",
      provinceId: p.provinceId,
      districtId: p.districtId,
      facilityId: p.facilityId,
    });
    seeds.push({
      slug: `clerk-${p.facilityId}`,
      firstName: `Carla${i + 1}`,
      lastName: "Clerk",
      role: "facility_clerk",
      provinceId: p.provinceId,
      districtId: p.districtId,
      facilityId: p.facilityId,
    });
  });

  let inserted = 0;
  for (const s of seeds) {
    const email = emailFor(tenantCode, s.slug);
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) continue;
    await db.insert(users).values({
      tenantId,
      email,
      firstName: s.firstName,
      lastName: s.lastName,
      role: s.role,
      roles: [s.role],
      permissions: [],
      dataAccessScope: {
        provinces: s.provinceId ? [s.provinceId] : [],
        districts: s.districtId ? [s.districtId] : [],
        facilities: s.facilityId ? [s.facilityId] : [],
      },
      facilityId: s.facilityId ?? null,
      districtId: s.districtId ?? null,
      provinceId: s.provinceId ?? null,
      isActive: true,
    });
    inserted++;
  }
  return inserted;
}

async function seedPopulationData(
  tenantId: string,
  picks: FacilityPick[],
  demographics: { under1: number; pregnant: number; schoolEntry: number },
): Promise<{ inserted: number; catchmentByFacility: Map<number, number> }> {
  const catchmentByFacility = new Map<number, number>();
  if (picks.length === 0) return { inserted: 0, catchmentByFacility };

  const existing = await db
    .select({
      facilityId: populationData.facilityId,
      source: populationData.source,
      year: populationData.year,
      totalPopulation: populationData.totalPopulation,
    })
    .from(populationData)
    .where(eq(populationData.tenantId, tenantId));
  const existingByFacility = new Map<number, number>();
  const existingKeys = new Set<string>();
  for (const r of existing) {
    if (r.facilityId != null) {
      existingKeys.add(`${r.facilityId}|${r.source}|${r.year}`);
      // Prefer an `nso` row for the current year, otherwise fall back to any
      // existing row so vaccine requirements still match real numbers.
      if (r.year === YEAR && (r.source === "nso" || !existingByFacility.has(r.facilityId))) {
        existingByFacility.set(r.facilityId, r.totalPopulation);
      }
    }
  }

  let inserted = 0;
  for (let i = 0; i < picks.length; i++) {
    const p = picks[i];
    const reused = existingByFacility.get(p.facilityId);
    if (reused !== undefined) {
      catchmentByFacility.set(p.facilityId, reused);
      continue;
    }
    const total = DEMO_CATCHMENTS[i % DEMO_CATCHMENTS.length];
    catchmentByFacility.set(p.facilityId, total);
    const key = `${p.facilityId}|nso|${YEAR}`;
    if (existingKeys.has(key)) continue;
    await db.insert(populationData).values({
      tenantId,
      facilityId: p.facilityId,
      districtId: p.districtId,
      provinceId: p.provinceId,
      source: "nso",
      year: YEAR,
      totalPopulation: total,
      malePopulation: Math.round(total * 0.51),
      femalePopulation: Math.round(total * 0.49),
      under1Population: Math.round(total * demographics.under1),
      under5Population: Math.round(total * Math.max(demographics.under1 * 5, 0.16)),
      pregnantWomen: Math.round(total * demographics.pregnant),
      schoolEntry: Math.round(total * demographics.schoolEntry),
      confidenceScore: "85.00",
      approvalStatus: "approved",
    });
    existingKeys.add(key);
    inserted++;
  }
  return { inserted, catchmentByFacility };
}

async function seedVaccineRequirements(
  tenantId: string,
  picks: FacilityPick[],
  demographics: { under1: number; pregnant: number; schoolEntry: number },
  catchmentByFacility: Map<number, number>,
): Promise<number> {
  if (picks.length === 0) return 0;

  const existing = await db
    .select({
      facilityId: vaccineRequirements.facilityId,
      vaccineName: vaccineRequirements.vaccineName,
      quarter: vaccineRequirements.quarter,
      year: vaccineRequirements.year,
    })
    .from(vaccineRequirements)
    .where(eq(vaccineRequirements.tenantId, tenantId));
  const existingKeys = new Set(
    existing.map((r) => `${r.facilityId}|${r.vaccineName}|${r.quarter}|${r.year}`),
  );

  let inserted = 0;
  for (const p of picks) {
    const catchmentPop = catchmentByFacility.get(p.facilityId);
    if (catchmentPop === undefined) continue;
    for (const v of VACCINES) {
      const key = `${p.facilityId}|${v.name}|${QUARTER}|${YEAR}`;
      if (existingKeys.has(key)) continue;
      const fraction = demographics[v.cohort];
      const targetPopulation = Math.max(1, Math.round((catchmentPop * fraction) / 4)); // per quarter
      const dosesRequired = targetPopulation * v.dosesPerChild;
      const dosesWithWastage = Math.ceil(dosesRequired / (1 - v.wastageRate / 100));
      const vialsRequired = Math.ceil(dosesWithWastage / v.dosesPerVial);
      await db.insert(vaccineRequirements).values({
        tenantId,
        facilityId: p.facilityId,
        vaccineName: v.name,
        targetPopulation,
        dosesRequired,
        wastageRate: String(v.wastageRate),
        dosesWithWastage,
        vialsRequired,
        quarter: QUARTER,
        year: YEAR,
      });
      inserted++;
    }
  }
  return inserted;
}

/**
 * Coverage targets per vaccine for the demo. Coverage = administered ÷ target.
 * Chosen so each dashboard color band (red <50, amber 50–80, green ≥80)
 * is represented for every demo facility.
 *
 * The keys MUST match the vaccine names used in `VACCINES` above so the
 * /api/coverage rollup matches administered doses to the matching
 * vaccine_requirements row.
 */
const DEMO_COVERAGE_FRACTIONS: Record<string, number> = {
  BCG: 0.88,   // green
  OPV: 0.62,   // amber
  Penta: 0.74, // amber
  MR: 0.42,    // red
  TT: 0.55,    // amber
};

/**
 * Split a total count of doses across N months with a mild front/back skew
 * so monthly figures look organic rather than uniform.
 */
function splitAcrossMonths(total: number, months: number, seed: number): number[] {
  if (months <= 0) return [];
  if (total <= 0) return Array(months).fill(0);
  const weights: number[] = [];
  for (let i = 0; i < months; i++) {
    // deterministic pseudo-random weight in [0.7, 1.3]
    const r = ((Math.sin(seed * 17 + i * 31) + 1) / 2) * 0.6 + 0.7;
    weights.push(r);
  }
  const sum = weights.reduce((a, b) => a + b, 0);
  const out = weights.map((w) => Math.round((w / sum) * total));
  // Correct rounding drift on the last bucket.
  const drift = total - out.reduce((a, b) => a + b, 0);
  out[out.length - 1] += drift;
  return out.map((v) => Math.max(0, v));
}

async function seedMonthlyReports(
  tenantId: string,
  picks: FacilityPick[],
  demographics: { under1: number; pregnant: number; schoolEntry: number },
  catchmentByFacility: Map<number, number>,
): Promise<number> {
  if (picks.length === 0) return 0;

  const startMonth = (QUARTER - 1) * 3 + 1; // 1-indexed: Q1->1, Q2->4, Q3->7, Q4->10
  const months = [startMonth, startMonth + 1, startMonth + 2];

  const existing = await db
    .select({
      facilityId: monthlyReports.facilityId,
      month: monthlyReports.month,
      year: monthlyReports.year,
    })
    .from(monthlyReports)
    .where(eq(monthlyReports.tenantId, tenantId));
  const existingKeys = new Set(
    existing.map((r) => `${r.facilityId}|${r.month}|${r.year}`),
  );

  let inserted = 0;
  for (let pi = 0; pi < picks.length; pi++) {
    const p = picks[pi];
    const catchmentPop = catchmentByFacility.get(p.facilityId);
    if (catchmentPop === undefined) continue;

    // Per-vaccine total administered for the whole quarter (matches the
    // /api/coverage formula: target = round(catchment * fraction / 4)).
    const totalsByVaccine: Record<string, number> = {};
    for (const v of VACCINES) {
      const fraction = demographics[v.cohort];
      const targetPopulation = Math.max(1, Math.round((catchmentPop * fraction) / 4));
      const baseCoverage = DEMO_COVERAGE_FRACTIONS[v.name] ?? 0.5;
      // Per-facility jitter in [-0.07, +0.07] so facilities differ slightly.
      const jitter = (((Math.sin(p.facilityId * 13 + v.name.length) + 1) / 2) - 0.5) * 0.14;
      const coverage = Math.max(0.05, Math.min(0.98, baseCoverage + jitter));
      totalsByVaccine[v.name] = Math.round(targetPopulation * coverage);
    }

    const splits: Record<string, number[]> = {};
    for (const [name, total] of Object.entries(totalsByVaccine)) {
      splits[name] = splitAcrossMonths(total, months.length, p.facilityId + name.length);
    }

    for (let mi = 0; mi < months.length; mi++) {
      const month = months[mi];
      const key = `${p.facilityId}|${month}|${YEAR}`;
      if (existingKeys.has(key)) continue;

      const immunizations: Record<string, number> = {};
      for (const v of VACCINES) {
        const count = splits[v.name][mi] ?? 0;
        if (count <= 0) continue;
        immunizations[v.name] = count;
      }

      await db.insert(monthlyReports).values({
        tenantId,
        facilityId: p.facilityId,
        month,
        year: YEAR,
        immunizations,
        stockSummary: {},
        surveillance: {},
        approvalStatus: "approved",
      });
      existingKeys.add(key);
      inserted++;
    }
  }
  return inserted;
}

async function seedSessionPlans(
  tenantId: string,
  picks: FacilityPick[],
  demographics: { under1: number; pregnant: number; schoolEntry: number },
  catchmentByFacility: Map<number, number>,
): Promise<number> {
  if (picks.length === 0) return 0;

  const existing = await db
    .select({
      facilityId: sessionPlans.facilityId,
      name: sessionPlans.name,
      quarter: sessionPlans.quarter,
      year: sessionPlans.year,
    })
    .from(sessionPlans)
    .where(eq(sessionPlans.tenantId, tenantId));
  const existingKeys = new Set(
    existing.map((r) => `${r.facilityId}|${r.name}|${r.quarter}|${r.year}`),
  );

  let inserted = 0;
  for (const p of picks) {
    const catchmentPop = catchmentByFacility.get(p.facilityId);
    if (catchmentPop === undefined) continue;
    // Per-quarter under-1 cohort served by this facility.
    const quarterlyUnder1 = (catchmentPop * demographics.under1) / 4;
    for (const tpl of SESSION_TEMPLATES) {
      const name = `${p.facilityName} — ${tpl.suffix} Q${QUARTER} ${YEAR}`;
      const key = `${p.facilityId}|${name}|${QUARTER}|${YEAR}`;
      if (existingKeys.has(key)) continue;
      const scheduled = new Date();
      scheduled.setUTCDate(scheduled.getUTCDate() + tpl.daysFromNow);
      const targetPopulation = Math.max(1, Math.round(quarterlyUnder1 * tpl.under1Fraction));
      await db.insert(sessionPlans).values({
        tenantId,
        facilityId: p.facilityId,
        name,
        sessionType: tpl.sessionType,
        quarter: QUARTER,
        year: YEAR,
        scheduledDate: scheduled,
        transportMode: tpl.transportMode,
        estimatedDuration: tpl.estimatedDuration,
        targetPopulation,
        status: tpl.status,
        approvalStatus: tpl.approvalStatus,
        notes: tpl.notes,
        planType: "routine",
      });
      inserted++;
    }
  }
  return inserted;
}

async function run() {
  for (const code of ["ZMB", "SSD"] as TenantCode[]) {
    const rows = await db.select().from(tenants).where(eq(tenants.code, code)).limit(1);
    const tenant = rows[0];
    if (!tenant) {
      console.warn(`[${code}] tenant not found — skipping demo seed.`);
      continue;
    }
    const settings = (tenant.settings as any) || {};
    const demographics = settings.demographics ?? {
      under1: 0.035,
      pregnant: 0.04,
      schoolEntry: 0.03,
    };

    const picks = await pickFacilities(tenant.id);
    if (picks.length === 0) {
      console.warn(`[${code}] no facilities found — skipping demo seed.`);
      continue;
    }

    const u = await seedUsers(code, tenant.id, picks);
    const { inserted: pop, catchmentByFacility } = await seedPopulationData(
      tenant.id,
      picks,
      demographics,
    );
    const vr = await seedVaccineRequirements(tenant.id, picks, demographics, catchmentByFacility);
    const sp = await seedSessionPlans(tenant.id, picks, demographics, catchmentByFacility);
    const mr = await seedMonthlyReports(tenant.id, picks, demographics, catchmentByFacility);
    console.log(
      `[${code}] picked ${picks.length} facilities • +${u} users • +${pop} population rows • +${vr} vaccine requirements • +${sp} session plans • +${mr} monthly reports`,
    );
  }

  const summary = await db.execute(sql`
    SELECT
      t.code,
      (SELECT COUNT(*) FROM users               u WHERE u.tenant_id = t.id) AS users,
      (SELECT COUNT(*) FROM population_data     p WHERE p.tenant_id = t.id) AS population_rows,
      (SELECT COUNT(*) FROM vaccine_requirements v WHERE v.tenant_id = t.id) AS vaccine_requirements,
      (SELECT COUNT(*) FROM session_plans       s WHERE s.tenant_id = t.id) AS session_plans,
      (SELECT COUNT(*) FROM monthly_reports     m WHERE m.tenant_id = t.id) AS monthly_reports
    FROM tenants t
    WHERE t.code IN ('ZMB','SSD')
    ORDER BY t.code;
  `);
  console.log("\nDemo operational data rollup:");
  console.table(summary.rows);
  console.log("Done.");
  process.exit(0);
}

run().catch((err) => {
  console.error("Demo seed failed:", err);
  process.exit(1);
});
