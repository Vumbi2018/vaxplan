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
  villages,
  vaccineRequirements,
  vaccineConfigurations,
  sessionPlans,
  populationData,
  monthlyReports,
  clients,
  clientVaccinations,
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

/**
 * Default vaccine_configurations for the demo tenants. Names MUST match the
 * `VACCINES` table above so client_vaccinations rows roll up to the same
 * vaccine_requirements row used by /api/coverage.
 */
const VACCINE_CONFIG_DEFAULTS: Array<{
  name: string;
  targetGroup: "under1" | "births" | "pregnant" | "schoolEntry";
  doses: number;
  recommendedAge: string;
  recommendedAgeWeeks: number;
  wastageFactor: string;
  vialsPerDose: number;
}> = [
  { name: "BCG",   targetGroup: "births",      doses: 1, recommendedAge: "At birth",            recommendedAgeWeeks: 0,  wastageFactor: "50.00", vialsPerDose: 20 },
  { name: "OPV",   targetGroup: "under1",      doses: 4, recommendedAge: "Birth, 6, 10, 14 wk", recommendedAgeWeeks: 6,  wastageFactor: "25.00", vialsPerDose: 20 },
  { name: "Penta", targetGroup: "under1",      doses: 3, recommendedAge: "6, 10, 14 weeks",     recommendedAgeWeeks: 6,  wastageFactor: "10.00", vialsPerDose: 1  },
  { name: "MR",    targetGroup: "schoolEntry", doses: 2, recommendedAge: "9 & 18 months",       recommendedAgeWeeks: 39, wastageFactor: "15.00", vialsPerDose: 10 },
  { name: "TT",    targetGroup: "pregnant",    doses: 2, recommendedAge: "2nd & 3rd trimester", recommendedAgeWeeks: 0,  wastageFactor: "10.00", vialsPerDose: 20 },
];

async function ensureVaccineConfigs(tenantId: string): Promise<Map<string, number>> {
  const existing = await db
    .select({ id: vaccineConfigurations.id, name: vaccineConfigurations.name })
    .from(vaccineConfigurations)
    .where(eq(vaccineConfigurations.tenantId, tenantId));
  const byName = new Map<string, number>();
  for (const r of existing) byName.set(r.name, r.id);

  for (const cfg of VACCINE_CONFIG_DEFAULTS) {
    if (byName.has(cfg.name)) continue;
    const [row] = await db
      .insert(vaccineConfigurations)
      .values({
        tenantId,
        name: cfg.name,
        targetGroup: cfg.targetGroup,
        doses: cfg.doses,
        recommendedAge: cfg.recommendedAge,
        recommendedAgeWeeks: cfg.recommendedAgeWeeks,
        wastageFactor: cfg.wastageFactor,
        vialsPerDose: cfg.vialsPerDose,
        isActive: true,
      })
      .returning({ id: vaccineConfigurations.id });
    byName.set(cfg.name, row.id);
  }
  return byName;
}

/**
 * Pick one village per facility — prefer a village already assigned to the
 * facility, otherwise fall back to any village in the same district. If no
 * village exists for the district, create a "Demo Catchment Village" so
 * clients can be anchored to a real row (clients.village_id is NOT NULL).
 */
async function pickVillagePerFacility(
  tenantId: string,
  picks: FacilityPick[],
): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  if (picks.length === 0) return out;

  const rows = await db
    .select({
      id: villages.id,
      name: villages.name,
      districtId: villages.districtId,
      assignedFacilityId: villages.assignedFacilityId,
    })
    .from(villages)
    .where(eq(villages.tenantId, tenantId));

  for (const p of picks) {
    const assigned = rows.find((v) => v.assignedFacilityId === p.facilityId);
    if (assigned) {
      out.set(p.facilityId, assigned.id);
      continue;
    }
    const sameDistrict = rows.find((v) => v.districtId === p.districtId);
    if (sameDistrict) {
      out.set(p.facilityId, sameDistrict.id);
      continue;
    }
    const demoName = `Demo Catchment Village (${p.facilityName})`;
    const reused = rows.find(
      (v) => v.name === demoName && v.districtId === p.districtId,
    );
    if (reused) {
      out.set(p.facilityId, reused.id);
      continue;
    }
    const [created] = await db
      .insert(villages)
      .values({
        tenantId,
        name: demoName,
        code: `DEMO-${p.facilityId}`,
        districtId: p.districtId,
        assignedFacilityId: p.facilityId,
      })
      .returning({ id: villages.id });
    out.set(p.facilityId, created.id);
    rows.push({
      id: created.id,
      name: demoName,
      districtId: p.districtId,
      assignedFacilityId: p.facilityId,
    });
  }
  return out;
}

interface DemoClientSeed {
  slug: string;
  name: string;
  clientType: "child" | "pregnant_woman";
  gender: "male" | "female";
  ageMonths: number; // months for child; gestational age slot for pregnant
  parentName?: string;
  /** Vaccinations administered this quarter as offsets in days from quarterEnd. */
  vaccinations: Array<{ vaccineName: string; daysBeforeQuarterEnd: number }>;
}

/**
 * Demo client roster per facility. Vaccination counts (totals across all
 * facilities) — small enough to keep monthly_reports adjustments non-negative:
 *   BCG: 2 • OPV: 3 • Penta: 3 • MR: 2 • TT: 2
 */
const CHILD_FIRST_NAMES = ["Amina", "Joseph", "Grace", "Kofi", "Lulu", "Moses", "Nia"];
const CHILD_LAST_NAMES = ["Banda", "Mwale", "Phiri", "Tembo", "Zulu", "Daka", "Nyirenda"];
const MOTHER_NAMES = ["Mary Banda", "Ruth Mwale", "Esther Phiri", "Joyce Tembo", "Linda Zulu", "Hope Daka"];

function buildClientRoster(facilityIndex: number, quarterStart: Date): DemoClientSeed[] {
  // Deterministic per facility so re-runs are idempotent.
  const pick = <T>(arr: T[], offset: number) => arr[(facilityIndex * 7 + offset) % arr.length];
  const childName = (i: number) =>
    `Demo ${pick(CHILD_FIRST_NAMES, i)} ${pick(CHILD_LAST_NAMES, i + 3)}`;
  const motherName = (i: number) => `Demo ${pick(MOTHER_NAMES, i)}`;

  // Reference points within the quarter for vaccination dates.
  // (quarterStart is day 0; we use daysBeforeQuarterEnd ~= 1-80.)
  return [
    {
      slug: "child-1",
      name: childName(0),
      clientType: "child",
      gender: "female",
      ageMonths: 3,
      parentName: motherName(0),
      vaccinations: [
        { vaccineName: "BCG", daysBeforeQuarterEnd: 70 },
        { vaccineName: "OPV", daysBeforeQuarterEnd: 40 },
        { vaccineName: "Penta", daysBeforeQuarterEnd: 40 },
      ],
    },
    {
      slug: "child-2",
      name: childName(1),
      clientType: "child",
      gender: "male",
      ageMonths: 7,
      parentName: motherName(1),
      vaccinations: [
        { vaccineName: "OPV", daysBeforeQuarterEnd: 35 },
        { vaccineName: "Penta", daysBeforeQuarterEnd: 35 },
      ],
    },
    {
      slug: "child-3",
      name: childName(2),
      clientType: "child",
      gender: "female",
      ageMonths: 10,
      parentName: motherName(2),
      vaccinations: [
        { vaccineName: "MR", daysBeforeQuarterEnd: 20 },
      ],
    },
    {
      slug: "child-4",
      name: childName(3),
      clientType: "child",
      gender: "male",
      ageMonths: 1,
      parentName: motherName(3),
      vaccinations: [
        { vaccineName: "BCG", daysBeforeQuarterEnd: 25 },
        { vaccineName: "OPV", daysBeforeQuarterEnd: 25 },
      ],
    },
    {
      slug: "child-5",
      name: childName(4),
      clientType: "child",
      gender: "female",
      ageMonths: 14,
      parentName: motherName(4),
      vaccinations: [
        { vaccineName: "MR", daysBeforeQuarterEnd: 50 },
        { vaccineName: "Penta", daysBeforeQuarterEnd: 60 },
      ],
    },
    {
      slug: "pregnant-1",
      name: motherName(5),
      clientType: "pregnant_woman",
      gender: "female",
      ageMonths: 12 * 26, // ~26 years old, gestational tracked elsewhere
      vaccinations: [
        { vaccineName: "TT", daysBeforeQuarterEnd: 30 },
      ],
    },
    {
      slug: "pregnant-2",
      name: motherName(2),
      clientType: "pregnant_woman",
      gender: "female",
      ageMonths: 12 * 22,
      vaccinations: [
        { vaccineName: "TT", daysBeforeQuarterEnd: 10 },
      ],
    },
  ];
  void quarterStart;
}

async function seedDemoClients(
  tenantId: string,
  picks: FacilityPick[],
  villageByFacility: Map<number, number>,
  vaccineConfigByName: Map<string, number>,
): Promise<{ clientsInserted: number; vaccinationsInserted: number }> {
  if (picks.length === 0) return { clientsInserted: 0, vaccinationsInserted: 0 };

  const startMonth = (QUARTER - 1) * 3; // 0-indexed
  const quarterStart = new Date(Date.UTC(YEAR, startMonth, 1));
  const quarterEnd = new Date(Date.UTC(YEAR, startMonth + 3, 0)); // last day of quarter

  let clientsInserted = 0;
  let vaccinationsInserted = 0;

  for (let pi = 0; pi < picks.length; pi++) {
    const p = picks[pi];
    const villageId = villageByFacility.get(p.facilityId);
    if (villageId === undefined) {
      console.warn(`  [facility ${p.facilityId}] no village available — skipping demo clients.`);
      continue;
    }

    const roster = buildClientRoster(pi, quarterStart);

    // Per-vaccine totals we will insert as client_vaccinations.
    const addedByVaccine: Record<string, number> = {};
    for (const c of roster) {
      for (const v of c.vaccinations) {
        addedByVaccine[v.vaccineName] = (addedByVaccine[v.vaccineName] ?? 0) + 1;
      }
    }

    // Idempotency: if any demo client already exists for this facility, skip
    // both client and vaccination inserts (and skip monthly_reports adjustment)
    // so re-running the seed does nothing.
    const existing = await db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(and(eq(clients.tenantId, tenantId), eq(clients.facilityId, p.facilityId)));
    const existingNames = new Set(existing.map((r) => r.name));
    const anyDemoExists = existing.some((r) => r.name.startsWith("Demo "));
    if (anyDemoExists) continue;

    // Insert clients (skip names already present in case of partial reuse).
    const clientIdBySlug = new Map<string, string>();
    for (const c of roster) {
      if (existingNames.has(c.name)) continue;
      const dob = new Date(quarterEnd);
      dob.setUTCMonth(dob.getUTCMonth() - c.ageMonths);
      const [row] = await db
        .insert(clients)
        .values({
          tenantId,
          facilityId: p.facilityId,
          villageId,
          name: c.name,
          clientType: c.clientType,
          dateOfBirth: dob,
          gender: c.gender,
          parentName: c.parentName ?? null,
          catchmentStatus: "catchment",
          contraindications: [],
          isRefusal: false,
          isCrossBorder: false,
        })
        .returning({ id: clients.id });
      clientIdBySlug.set(c.slug, row.id);
      clientsInserted++;
    }

    // Insert client_vaccinations.
    for (const c of roster) {
      const clientId = clientIdBySlug.get(c.slug);
      if (!clientId) continue;
      for (const v of c.vaccinations) {
        const configId = vaccineConfigByName.get(v.vaccineName);
        if (!configId) continue;
        const administered = new Date(quarterEnd);
        administered.setUTCDate(administered.getUTCDate() - v.daysBeforeQuarterEnd);
        await db.insert(clientVaccinations).values({
          tenantId,
          clientId,
          vaccineConfigId: configId,
          vaccineName: v.vaccineName,
          administeredDate: administered,
          batchNumber: `DEMO-${v.vaccineName}-${YEAR}Q${QUARTER}`,
          vvmStatus: 1,
        });
        vaccinationsInserted++;
      }
    }

    // Subtract added vaccination counts from monthly_reports so the per-vaccine
    // totals shown by /api/coverage stay roughly constant. Spread the
    // subtraction across the quarter's three months, clamping each bucket at 0.
    const months = [startMonth + 1, startMonth + 2, startMonth + 3];
    const reports = await db
      .select({
        id: monthlyReports.id,
        month: monthlyReports.month,
        immunizations: monthlyReports.immunizations,
      })
      .from(monthlyReports)
      .where(
        and(
          eq(monthlyReports.tenantId, tenantId),
          eq(monthlyReports.facilityId, p.facilityId),
          eq(monthlyReports.year, YEAR),
        ),
      );
    const reportByMonth = new Map<number, { id: number; imm: Record<string, number> }>();
    for (const r of reports) {
      if (!months.includes(r.month)) continue;
      reportByMonth.set(r.month, {
        id: r.id,
        imm: { ...((r.immunizations as Record<string, number>) ?? {}) },
      });
    }

    for (const [vaccineName, toRemove] of Object.entries(addedByVaccine)) {
      let remaining = toRemove;
      for (const m of months) {
        if (remaining <= 0) break;
        const rep = reportByMonth.get(m);
        if (!rep) continue;
        const current = Number(rep.imm[vaccineName] ?? 0);
        if (current <= 0) continue;
        const take = Math.min(current, remaining);
        rep.imm[vaccineName] = current - take;
        remaining -= take;
      }
    }

    const updates: Array<{ id: number; imm: Record<string, number> }> = Array.from(reportByMonth.values());
    for (const { id, imm } of updates) {
      await db
        .update(monthlyReports)
        .set({ immunizations: imm })
        .where(eq(monthlyReports.id, id));
    }
  }

  return { clientsInserted, vaccinationsInserted };
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
    const vaccineConfigByName = await ensureVaccineConfigs(tenant.id);
    const villageByFacility = await pickVillagePerFacility(tenant.id, picks);
    const { clientsInserted, vaccinationsInserted } = await seedDemoClients(
      tenant.id,
      picks,
      villageByFacility,
      vaccineConfigByName,
    );
    console.log(
      `[${code}] picked ${picks.length} facilities • +${u} users • +${pop} population rows • +${vr} vaccine requirements • +${sp} session plans • +${mr} monthly reports • +${clientsInserted} demo clients • +${vaccinationsInserted} client vaccinations`,
    );
  }

  const summary = await db.execute(sql`
    SELECT
      t.code,
      (SELECT COUNT(*) FROM users               u WHERE u.tenant_id = t.id) AS users,
      (SELECT COUNT(*) FROM population_data     p WHERE p.tenant_id = t.id) AS population_rows,
      (SELECT COUNT(*) FROM vaccine_requirements v WHERE v.tenant_id = t.id) AS vaccine_requirements,
      (SELECT COUNT(*) FROM session_plans       s WHERE s.tenant_id = t.id) AS session_plans,
      (SELECT COUNT(*) FROM monthly_reports     m WHERE m.tenant_id = t.id) AS monthly_reports,
      (SELECT COUNT(*) FROM clients              c WHERE c.tenant_id = t.id) AS clients,
      (SELECT COUNT(*) FROM client_vaccinations  cv WHERE cv.tenant_id = t.id) AS client_vaccinations
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
