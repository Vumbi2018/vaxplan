/**
 * Phase 4 — Demo operational data (users, vaccine requirements, session
 * plans, AND the Client Logbook / Defaulter List roster).
 *
 * Seeds a realistic set of mock users (one per role), vaccine requirements,
 * session plans (draft / pending / approved), monthly reports, and ~28 demo
 * clients per facility for the ZMB and SSD tenants. The client roster is
 * designed so the Client Logbook is populated AND the Defaulter List shows a
 * meaningful mix of mild (≥4w overdue), moderate (≥6w), and severe (≥8w)
 * cohorts across multiple antigens and facilities.
 *
 * Idempotent and tenant-scoped:
 *   - Users are upserted by email (unique).
 *   - vaccine_requirements rows are skipped when one already exists for
 *     (tenant, facility, vaccine, quarter, year).
 *   - session_plans rows are skipped when one already exists for
 *     (tenant, facility, name, quarter, year).
 *   - monthly_reports rows are skipped when one already exists for
 *     (tenant, facility, month, year).
 *   - Demo clients & client_vaccinations are skipped for any facility that
 *     already has a "Demo " client. This also means the in-quarter
 *     monthly_reports adjustment is only applied once.
 *
 * Run with:  tsx server/migrations/006-seed-demo-operational.ts
 * (Re-running is safe and a no-op for facilities that have already been
 * seeded; this is the single command to re-seed the demo Logbook +
 * Defaulter data for ZMB and SSD.)
 */

import { db } from "../db";
import { sql, eq, and, inArray } from "drizzle-orm";
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
  importedCoverage,
  microplans,
  stockTransactions,
  surveillanceCases,
} from "../../shared/schema";
import { hashPassword } from "../auth/passwordAuth";

type TenantCode = "ZMB" | "SSD" | "PNG" | "ZAF";

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
  { name: "BCG",        cohort: "under1",      dosesPerChild: 1, wastageRate: 50, dosesPerVial: 20 },
  { name: "OPV",        cohort: "under1",      dosesPerChild: 4, wastageRate: 25, dosesPerVial: 20 },
  { name: "Penta",      cohort: "under1",      dosesPerChild: 3, wastageRate: 10, dosesPerVial: 1  },
  { name: "PCV",        cohort: "under1",      dosesPerChild: 3, wastageRate: 11, dosesPerVial: 1  },
  { name: "Rotavirus",  cohort: "under1",      dosesPerChild: 3, wastageRate: 5,  dosesPerVial: 1  },
  { name: "IPV",        cohort: "under1",      dosesPerChild: 2, wastageRate: 5,  dosesPerVial: 5  },
  { name: "MR",         cohort: "schoolEntry", dosesPerChild: 2, wastageRate: 15, dosesPerVial: 10 },
  { name: "TT",         cohort: "pregnant",    dosesPerChild: 2, wastageRate: 10, dosesPerVial: 20 },
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

  const hash = await hashPassword("vaxplan2024");
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
      passwordHash: hash,
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
  BCG: 0.88,        // green
  OPV: 0.62,        // amber
  Penta: 0.74,      // amber
  PCV: 0.71,        // amber
  Rotavirus: 0.68,  // amber
  IPV: 0.58,        // amber
  MR: 0.42,         // red
  TT: 0.55,         // amber
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

/**
 * Backfill any VACCINES entries that are missing from existing
 * monthly_reports rows for the current quarter. Needed when new antigens
 * (e.g. PCV / Rotavirus / IPV) are added to the seed AFTER a tenant was
 * already seeded — `seedMonthlyReports` skips rows that already exist
 * for (facility, month, year), so the new vaccines never get written
 * without this step.
 *
 * Idempotent: only adds a vaccine key when it is absent from the row's
 * `immunizations` JSON. Re-running is a no-op once every row carries
 * every vaccine in VACCINES.
 */
async function backfillMissingVaccinesInMonthlyReports(
  tenantId: string,
  picks: FacilityPick[],
  demographics: { under1: number; pregnant: number; schoolEntry: number },
  catchmentByFacility: Map<number, number>,
): Promise<number> {
  if (picks.length === 0) return 0;

  const startMonth = (QUARTER - 1) * 3 + 1;
  const months = [startMonth, startMonth + 1, startMonth + 2];

  const facilityIds = picks.map((p) => p.facilityId);
  const reports = await db
    .select({
      id: monthlyReports.id,
      facilityId: monthlyReports.facilityId,
      month: monthlyReports.month,
      immunizations: monthlyReports.immunizations,
    })
    .from(monthlyReports)
    .where(
      and(
        eq(monthlyReports.tenantId, tenantId),
        eq(monthlyReports.year, YEAR),
        inArray(monthlyReports.facilityId, facilityIds),
        inArray(monthlyReports.month, months),
      ),
    );
  if (reports.length === 0) return 0;

  let updated = 0;
  for (const p of picks) {
    const catchmentPop = catchmentByFacility.get(p.facilityId);
    if (catchmentPop === undefined) continue;

    // Same totals/splits used by seedMonthlyReports so backfilled buckets
    // are consistent with what would have been written originally.
    const splits: Record<string, number[]> = {};
    for (const v of VACCINES) {
      const fraction = demographics[v.cohort];
      const targetPopulation = Math.max(1, Math.round((catchmentPop * fraction) / 4));
      const baseCoverage = DEMO_COVERAGE_FRACTIONS[v.name] ?? 0.5;
      const jitter = (((Math.sin(p.facilityId * 13 + v.name.length) + 1) / 2) - 0.5) * 0.14;
      const coverage = Math.max(0.05, Math.min(0.98, baseCoverage + jitter));
      const total = Math.round(targetPopulation * coverage);
      splits[v.name] = splitAcrossMonths(total, months.length, p.facilityId + v.name.length);
    }

    const facReports = reports.filter((r) => r.facilityId === p.facilityId);
    for (const r of facReports) {
      const mi = months.indexOf(r.month);
      if (mi < 0) continue;
      const imm = { ...((r.immunizations as Record<string, number>) ?? {}) };
      let changed = false;
      for (const v of VACCINES) {
        if (Object.prototype.hasOwnProperty.call(imm, v.name)) continue;
        const count = splits[v.name][mi] ?? 0;
        if (count <= 0) continue;
        imm[v.name] = count;
        changed = true;
      }
      if (!changed) continue;
      await db
        .update(monthlyReports)
        .set({ immunizations: imm })
        .where(eq(monthlyReports.id, r.id));
      updated++;
    }
  }
  return updated;
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

    // Each session_plan must belong to a parent microplan (NOT NULL FK).
    // Reuse the demo facility-routine microplan for this quarter, or create
    // one. Idempotent: re-running picks up the existing row.
    const microplanName = `${p.facilityName} — Demo Microplan Q${QUARTER} ${YEAR}`;
    const existingMicroplan = await db
      .select({ id: microplans.id })
      .from(microplans)
      .where(
        and(
          eq(microplans.tenantId, tenantId),
          eq(microplans.facilityId, p.facilityId),
          eq(microplans.name, microplanName),
          eq(microplans.year, YEAR),
          eq(microplans.quarter, QUARTER),
        ),
      )
      .limit(1);
    let microplanId: number;
    if (existingMicroplan.length > 0) {
      microplanId = existingMicroplan[0].id;
    } else {
      const [created] = await db
        .insert(microplans)
        .values({
          tenantId,
          facilityId: p.facilityId,
          name: microplanName,
          planType: "facility_routine",
          year: YEAR,
          quarter: QUARTER,
          status: "approved",
        })
        .returning({ id: microplans.id });
      microplanId = created.id;
    }

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
        microplanId,
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
  { name: "BCG",       targetGroup: "births",      doses: 1, recommendedAge: "At birth",            recommendedAgeWeeks: 0,  wastageFactor: "50.00", vialsPerDose: 20 },
  { name: "OPV",       targetGroup: "under1",      doses: 4, recommendedAge: "Birth, 6, 10, 14 wk", recommendedAgeWeeks: 6,  wastageFactor: "25.00", vialsPerDose: 20 },
  { name: "Penta",     targetGroup: "under1",      doses: 3, recommendedAge: "6, 10, 14 weeks",     recommendedAgeWeeks: 6,  wastageFactor: "10.00", vialsPerDose: 1  },
  { name: "PCV",       targetGroup: "under1",      doses: 3, recommendedAge: "6, 10, 14 weeks",     recommendedAgeWeeks: 6,  wastageFactor: "11.00", vialsPerDose: 1  },
  { name: "Rotavirus", targetGroup: "under1",      doses: 3, recommendedAge: "6, 10, 14 weeks",     recommendedAgeWeeks: 6,  wastageFactor: "5.00",  vialsPerDose: 1  },
  { name: "IPV",       targetGroup: "under1",      doses: 2, recommendedAge: "14 weeks & 9 months", recommendedAgeWeeks: 14, wastageFactor: "5.00",  vialsPerDose: 5  },
  { name: "MR",        targetGroup: "schoolEntry", doses: 2, recommendedAge: "9 & 18 months",       recommendedAgeWeeks: 39, wastageFactor: "15.00", vialsPerDose: 10 },
  { name: "TT",        targetGroup: "pregnant",    doses: 2, recommendedAge: "2nd & 3rd trimester", recommendedAgeWeeks: 0,  wastageFactor: "10.00", vialsPerDose: 20 },
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
 * Pick up to 5 village IDs per facility so demo clients can be rotated across
 * believable home villages. Preference order:
 *   1. Villages already assigned to the facility.
 *   2. Other villages in the same district.
 *   3. A freshly-created "Demo Catchment Village (...)" fallback so
 *      clients.village_id (NOT NULL) can always be anchored to a real row.
 */
const MAX_VILLAGES_PER_FACILITY = 5;
const MIN_VILLAGES_PER_FACILITY = 5;

/**
 * Realistic-sounding catchment village names rotated across demo facilities so
 * the Client Logbook's "village" column and Missed Communities map show
 * visibly varied, plausible names instead of "Demo Catchment Village 1/2/3…".
 * Names are intentionally suffixed with "(Demo)" so they cannot collide with
 * real catchment villages imported from country data, and so anyone browsing
 * the DB can see at a glance that the row is demo seed data.
 *
 * Pools are per-tenant so each country's demo map shows names that sound
 * local: Bemba / Nyanja / Tonga for ZMB, Dinka / Nuer / Bari for SSD,
 * Tok Pisin / Melanesian for PNG.
 */
const ZMB_DISTRICT_POOLS: Record<string, string[]> = {
  "solwezi": [
    "Kimasala", "Kyawama", "Kazomba", "Mujimanzovu", "Kasanji", 
    "Kapijimpanga", "Rodwell", "Jiwundu", "Shilenda", "Kabgayi",
    "Messengers", "Kambimba", "Mutanda", "Kazhiba", "Kimiteto"
  ],
  "chibombo": [
    "Chamakubi", "Kabangalala", "Liteta", "Keembe", "Ipongo", 
    "Chisamba", "Mwachisompola", "Chaminuka", "Kakoma", "Kabile", 
    "John Chinena", "Katuba", "Mungule"
  ],
  "luangwa": [
    "Kaunga", "Mboro", "Dzimi", "Chitope", "Soweto", 
    "Lunya", "Yapite", "Feira", "Katondwe", "Kabere", "Chidiza"
  ],
  "lusaka": [
    "Kalingalinga", "Chilenje", "Chelstone", "Bauleni", "Lilanda", 
    "Matero", "Chaisa", "Kanyama", "Misisi", "Mandevu", 
    "Ng'ombe", "George", "Kaunda Square", "Chainda", "Kabwata", 
    "Chawama", "Chipata", "Kamwala"
  ],
  "chongwe": [
    "Kanakantapa", "Palabana", "Lwimba", "Chalimbana", 
    "Bunda Bunda", "Ntandabale", "Silverest"
  ],
  "rufunsa": [
    "Rufunsa", "Shikabeta", "Chinyunyu", "Mpanshya", "Bunyete"
  ],
  "kaoma": [
    "Kaoma", "Mangango", "Shimbanje", "Mulamatila", "Kahare"
  ],
  "nkeyema": [
    "Nkeyema", "Luampa", "Kaoma", "Mangango"
  ],
  "choma": [
    "Macha", "Singani", "Choma Central", "Kamunza", "Kabanana", 
    "Sikalinda", "Mapanza", "Mbabala"
  ]
};

const ZMB_PROVINCE_POOLS: Record<string, string[]> = {
  "central": [
    "Chamakubi", "Kabangalala", "Liteta", "Keembe", "Ipongo", "Chisamba", 
    "Mwachisompola", "Chaminuka", "Kakoma", "Kabile", "John Chinena", "Katuba", 
    "Mungule", "Kabwe", "Katondo", "Bwacha", "Mulungushi", "Chimanama"
  ],
  "copperbelt": [
    "Chikola", "Mwansa", "Chambishi", "Nchanga", "Wusakile", "Mindolo", 
    "Chibuluma", "Kaniki", "Mpatamatu", "Twapia", "Chifubu", "Kabwe", "Lubuto"
  ],
  "eastern": [
    "Msekera", "Feni", "Chizongwe", "Kanjala", "Mchimadzi", "Kapata", 
    "Kalichero", "Sinda", "Chassa", "Nyimba", "Petauke", "Lundazi"
  ],
  "luapula": [
    "Mambilima", "Kashikishi", "Mbereshi", "Lubwe", "Samfya", "Mansa", 
    "Kawambwa", "Nchelenge", "Mwense", "Chifunabuli"
  ],
  "lusaka": [
    "Kalingalinga", "Chilenje", "Chelstone", "Bauleni", "Lilanda", "Matero", 
    "Chaisa", "Kanyama", "Misisi", "Mandevu", "Ng'ombe", "George", 
    "Kaunda Square", "Chainda", "Lwimba", "Kanakantapa", "Palabana", 
    "Rufunsa", "Shikabeta", "Chinyunyu", "Mpanshya"
  ],
  "muchinga": [
    "Chinsali", "Isoka", "Mpika", "Nakonde", "Muyombe", "Thendere", 
    "Mulilansolo", "Shiwang'andu"
  ],
  "northern": [
    "Kasama", "Mbala", "Luwingu", "Mporokoso", "Kaputa", "Senga Hill", 
    "Chilubi", "Mpulungu", "Nseluka"
  ],
  "north-western": [
    "Kimasala", "Kyawama", "Kazomba", "Mujimanzovu", "Kasanji", "Kapijimpanga", 
    "Rodwell", "Jiwundu", "Shilenda", "Kabgayi", "Kimiteto", "Mutanda", 
    "Solwezi", "Mwinilunga", "Kabompo", "Zambezi", "Kasempa", "Chavuma"
  ],
  "southern": [
    "Macha Mission", "Choma Central", "Singani", "Mapanza", "Mbabala", 
    "Monze", "Mazabuka", "Livingstone", "Kalomo", "Namwala", "Siavonga"
  ],
  "western": [
    "Kaoma", "Mangango", "Nkeyema", "Luampa", "Mongu", "Senanga", 
    "Sesheke", "Kalabo", "Lukulu", "Limulunga", "Nalikwanda"
  ]
};

const SSD_DISTRICT_POOLS: Record<string, string[]> = {
  "juba": [
    "Gumbo", "Munuki", "Kator", "Rejaf", "Lologo", "Nyokolon", "Atlabara", 
    "Hai Malakal", "Gudele", "Jebel", "Nyakuron", "Kondokoro", "Jebel Lado", 
    "Kworijik", "Bilnyang", "Rajaf West", "Kondokoro Island"
  ],
  "terekeka": [
    "Terekeka", "Mongalla", "Tali", "Tombek", "Reggo", "Muni"
  ],
  "lainya": [
    "Lainya", "Kenyi", "Mukaya", "Bereka", "Lokolo"
  ],
  "yei": [
    "Yei Boma", "Kaya Boma", "Lasu", "Lainya Boma", "Pukuka", "Tore"
  ],
  "kajo-keji": [
    "Kajo Keji", "Kangapo", "Lire", "Miri", "Jura"
  ],
  "morobo": [
    "Morobo", "Kaya", "Panyume", "Lujulo", "Gulumbi"
  ],
  "torit": [
    "Torit Hills", "Katire", "Kudo", "Imurok", "Hiyala"
  ],
  "magwi": [
    "Magwi Ridge", "Nimule Gate", "Pajok", "Lobone", "Obbo"
  ],
  "kapoeta south": [
    "Kapoeta South", "Kapoeta Town", "Machil", "Natinga"
  ],
  "budi": [
    "Chukudum", "Kimotong", "Lauro", "Napoti"
  ]
};

const PNG_DISTRICT_POOLS: Record<string, string[]> = {
  "national capital": [
    "Hanuabada", "Koki", "Gerehu", "Waigani", "Tokarara", "Morata", "Bomana", "Kila Kila", "Vabukori", "Pari", "Tatana", "Baruni", "Napa Napa", "Gordons", "Badili"
  ],
  "port moresby": [
    "Hanuabada", "Koki", "Gerehu", "Waigani", "Tokarara", "Morata", "Bomana", "Kila Kila", "Vabukori", "Pari", "Tatana", "Baruni", "Napa Napa", "Gordons", "Badili"
  ],
  "moresby south": [
    "Hanuabada", "Koki", "Gerehu", "Waigani", "Tokarara", "Morata", "Bomana", "Kila Kila", "Vabukori", "Pari", "Tatana", "Baruni", "Napa Napa", "Gordons", "Badili"
  ],
  "moresby north east": [
    "Hanuabada", "Koki", "Gerehu", "Waigani", "Tokarara", "Morata", "Bomana", "Kila Kila", "Vabukori", "Pari", "Tatana", "Baruni", "Napa Napa", "Gordons", "Badili"
  ],
  "moresby north west": [
    "Hanuabada", "Koki", "Gerehu", "Waigani", "Tokarara", "Morata", "Bomana", "Kila Kila", "Vabukori", "Pari", "Tatana", "Baruni", "Napa Napa", "Gordons", "Badili"
  ],
  "rigo": [
    "Hula", "Launakalana", "Vorakogena", "Maipiko", "Kwikila", "Gaba Gaba", "Boregaina", "Karekodobu", "Boku", "Dorom", "Dorobisoro", "Agitani", "Bondi"
  ],
  "abau": [
    "Iruna", "Magarida", "Aroana", "Boru", "Bailebo", "Baramata", "Lalaura", "Kinikalana", "Robinson River", "Maopa", "Kelekapana", "Cocoaland", "Merani", "Gohodae", "Manabo"
  ],
  "hiri": [
    "Tubuserea", "Barakau", "Boea", "Doe", "Efogi", "Gaire", "Gohoru", "Kailaki", "Kuriva", "Lealea", "Manumanu", "Menari"
  ],
  "kairuku-hiri": [
    "Tubuserea", "Barakau", "Boea", "Doe", "Efogi", "Gaire", "Gohoru", "Kailaki", "Kuriva", "Lealea", "Manumanu", "Menari"
  ],
  "kairuku": [
    "Agevairu", "Akufa", "Apanaipi", "Babiko", "Bereina", "Bitou", "Delena", "Doa", "Fane", "Inawi", "Kanosia", "Kivori Poe"
  ],
  "goilala": [
    "Apaeva", "Cocoalands", "Domara", "Gaiva", "Guari Maipai", "Ianu", "Kamulai", "Kodoge", "Koefa", "Lavavai", "Manabo", "Merani", "Moreguina", "Omu", "Ononge"
  ],
  "alotau": [
    "Yapoa", "East Cape", "Garuahi", "Taupota", "Aragip", "Bai'awa", "Biniguni", "Boilave", "Boinanai", "Bonabona", "Bonara"
  ],
  "samarai-murua": [
    "Nasikwabu", "Budibudi", "Guasopa", "Madau", "Iwa", "Awaibi", "Bedauna", "Dawson", "Eaus", "Ebora", "Ewena", "Gawa"
  ],
  "esa'ala": [
    "Bosalewa", "Ailuluai", "Basima", "Budoya", "Bwakera", "Darubia", "Dobu", "Fagalulu", "Galubwa", "Guleguleu", "Gwabewabi", "Kalokalo", "Kasikasi", "Salamo", "Sabo"
  ],
  "esaala": [
    "Bosalewa", "Ailuluai", "Basima", "Budoya", "Bwakera", "Darubia", "Dobu", "Fagalulu", "Galubwa", "Guleguleu", "Gwabewabi", "Kalokalo", "Kasikasi", "Salamo", "Sabo"
  ],
  "kiriwina-goodenough": [
    "Bunama", "Bwaruada", "Dawada", "Faiava", "Kaduwaga", "Kaibola", "Kaituvi", "Kelologea", "Kilia", "Kitava", "Kuruvitu", "Kuyawa", "Kwanaula", "Lauwela", "Lenasinasi"
  ],
  "wewak": [
    "Wewak Bend", "Kreer", "Moem", "Windji", "Yamil", "Passam"
  ],
  "mendi": [
    "Mendi Ridge", "Upper Mendi", "Karinz", "Lai Valley", "Tente"
  ],
  "goroka": [
    "Goroka Hills", "Kama", "Lufa", "Bena", "Asaro", "Unggai"
  ],
  "kundiawa": [
    "Kundiawa Pass", "Chuave", "Kerowagi", "Gembogl", "Sina Sina"
  ],
  "tari": [
    "Tari Valley", "Koroba", "Margarima", "Hulia", "Komo"
  ],
  "aitape": [
    "Aitape Coast", "Malol", "Sissano", "Pes", "Lumi"
  ],
  "vanimo": [
    "Vanimo Bay", "Lido", "Warapu", "Imonda", "Amanab"
  ],
  "lae": [
    "Lae Plain", "Taraka", "Eriku", "Malahang", "Butibam", "Simbang"
  ],
  "madang": [
    "Madang Reef", "Alexishafen", "Kalibobo", "Bilbil", "Karkar"
  ],
  "kavieng": [
    "Kavieng Point", "Tigak", "Utu", "New Hanover", "Fangalawa"
  ],
  "buka": [
    "Buka Crossing", "Sohano", "Kokopau", "Tinputz", "Wakunai"
  ]
};

const ZAF_PROVINCE_POOLS: Record<string, string[]> = {
  "gauteng": [
    "Soweto", "Tembisa", "Katlehong", "Soshanguve", "Mamelodi", "Sebokeng", 
    "Jabulani", "Orlando", "Meadowlands", "Nancefield", "Pimville", "Chiawelo", 
    "Dhlamini", "Zola", "Emdeni"
  ],
  "western cape": [
    "Khayelitsha", "Mitchells Plain", "Guguletu", "Nyanga", "Langa", "Delft"
  ],
  "kwazulu-natal": [
    "Umlazi", "KwaMashu", "Chatsworth", "Phoenix", "Inanda"
  ],
  "eastern cape": [
    "Ibhayi", "Mdantsane", "Motherwell", "Zwide"
  ],
  "free state": [
    "Thabong", "Botshabelo", "Mangaung"
  ],
  "limpopo": [
    "Mankweng", "Seshego", "Giyani"
  ]
};

const DEMO_VILLAGE_NAME_POOLS: Record<TenantCode, string[]> = {
  ZMB: [
    "Kimasala", "Kyawama", "Kazomba", "Chikola", "Mujimanzovu", "Kasanji", 
    "Kapijimpanga", "Rodwell", "Jiwundu", "Shilenda", "Kabgayi", "Chilanga", 
    "Katondo", "Kabuyu", "Chibote", "Mulenga", "Mwansa", "Chambishi", 
    "Kalingalinga", "Chilenje", "Chelstone", "Bauleni", "Lilanda", "Matero", 
    "Chaisa", "Kanyama", "Misisi", "Mandevu", "Ng'ombe", "George", 
    "Kaunda Square", "Chainda", "Lwimba", "Kanakantapa", "Palabana", 
    "Rufunsa", "Shikabeta", "Nkeyema", "Luampa", "Kaoma", "Mangango"
  ],
  SSD: [
    "Gumbo", "Munuki", "Kator", "Rejaf", "Lologo", "Nyokolon", "Atlabara", 
    "Hai Malakal", "Gudele", "Jebel", "Nyakuron", "Kondokoro", "Jebel Lado", 
    "Kworijik", "Bilnyang", "Rajaf West", "Kondokoro Island", "Mongalla", 
    "Terekeka", "Lainya", "Yei Boma", "Kaya Boma", "Kajo Keji", "Morobo", 
    "Torit Hills", "Magwi Ridge", "Nimule Gate", "Kapoeta South", "Chukudum"
  ],
  PNG: [
    "Hanuabada", "Koki", "Gerehu", "Waigani", "Tokarara", "Morata", "Sabo", 
    "Bomana", "Kila Kila", "Vabukori", "Pari", "Tatana", "Baruni", "Napa Napa", 
    "Laloki", "Sogeri", "Goldie", "Brown River", "Wewak Bend", "Mendi Ridge", 
    "Goroka Hills", "Kundiawa Pass", "Tari Valley", "Aitape Coast", 
    "Vanimo Bay", "Lae Plain", "Madang Reef", "Kavieng Point", "Buka Crossing"
  ],
  ZAF: [
    "Soweto", "Khayelitsha", "Mitchells Plain", "Tembisa", "Katlehong",
    "Umlazi", "Soshanguve", "Mamelodi", "Ibhayi", "Sebokeng",
    "Guguletu", "KwaMashu", "Mdantsane", "Klipspruit", "Thabong",
    "Mankweng", "Jabulani", "Orlando", "Meadowlands", "Nancefield",
    "Pimville", "Chiawelo", "Dhlamini", "Zola", "Emdeni",
  ],
};

function getDistrictAwareVillageName(
  tenantCode: TenantCode,
  districtName: string | null | undefined,
  provinceName: string | null | undefined,
  facilityId: number,
  slot: number
): string {
  const dist = (districtName ?? "").toLowerCase().trim();
  const prov = (provinceName ?? "").toLowerCase().trim();

  if (tenantCode === "ZMB") {
    for (const [key, names] of Object.entries(ZMB_DISTRICT_POOLS)) {
      if (dist.includes(key) || key.includes(dist)) {
        const idx = (facilityId * MIN_VILLAGES_PER_FACILITY + slot) % names.length;
        return names[idx];
      }
    }
    for (const [key, names] of Object.entries(ZMB_PROVINCE_POOLS)) {
      if (prov.includes(key) || key.includes(prov)) {
        const idx = (facilityId * MIN_VILLAGES_PER_FACILITY + slot) % names.length;
        return names[idx];
      }
    }
  }

  if (tenantCode === "SSD") {
    for (const [key, names] of Object.entries(SSD_DISTRICT_POOLS)) {
      if (dist.includes(key) || key.includes(dist)) {
        const idx = (facilityId * MIN_VILLAGES_PER_FACILITY + slot) % names.length;
        return names[idx];
      }
    }
  }

  if (tenantCode === "PNG") {
    for (const [key, names] of Object.entries(PNG_DISTRICT_POOLS)) {
      if (dist.includes(key) || key.includes(dist)) {
        const idx = (facilityId * MIN_VILLAGES_PER_FACILITY + slot) % names.length;
        return names[idx];
      }
    }
    // Dynamic fallback for missing PNG districts to prevent mixing locations
    return `${districtName || provinceName || "Demo"} Village ${slot + 1}`;
  }

  if (tenantCode === "ZAF") {
    for (const [key, names] of Object.entries(ZAF_PROVINCE_POOLS)) {
      if (prov.includes(key) || key.includes(prov)) {
        const idx = (facilityId * MIN_VILLAGES_PER_FACILITY + slot) % names.length;
        return names[idx];
      }
    }
  }

  // Fallback to legacy behavior
  const pool = DEMO_VILLAGE_NAME_POOLS[tenantCode] ?? DEMO_VILLAGE_NAME_POOLS.ZMB;
  const idx = (facilityId * MIN_VILLAGES_PER_FACILITY + slot) % pool.length;
  return pool[idx];
}

/**
 * Compute a clustered lat/lng offset from a facility location.
 * Uses a golden-angle spiral so successive villages spread out evenly
 * within ~1.5–5 km of the facility.
 */
function offsetCoord(
  baseLat: number,
  baseLng: number,
  index: number,
): { lat: number; lng: number; distanceKm: number } {
  const angle = (index * 137.508) * (Math.PI / 180);
  const distanceKm = 1.5 + (index % 4) * 1.2; // 1.5, 2.7, 3.9, 5.1, repeating
  const dLat = (distanceKm / 111) * Math.cos(angle);
  const cosLat = Math.cos((baseLat * Math.PI) / 180);
  const dLng = (distanceKm / (111 * Math.max(0.2, cosLat))) * Math.sin(angle);
  return { lat: baseLat + dLat, lng: baseLng + dLng, distanceKm };
}

async function pickVillagesPerFacility(
  tenantCode: TenantCode,
  tenantId: string,
  picks: FacilityPick[],
): Promise<Map<number, number[]>> {
  const out = new Map<number, number[]>();
  if (picks.length === 0) return out;

  // Retrieve existing villages in the database for the tenant
  const rows = await db
    .select({
      id: villages.id,
      name: villages.name,
      code: villages.code,
      districtId: villages.districtId,
      assignedFacilityId: villages.assignedFacilityId,
      latitude: villages.latitude,
      longitude: villages.longitude,
      transportMode: villages.transportMode,
      seasonalAccessibility: villages.seasonalAccessibility,
    })
    .from(villages)
    .where(eq(villages.tenantId, tenantId));

  // Fetch facility coords so demo villages can be anchored nearby on the map.
  const facilityIds = picks.map((p) => p.facilityId);
  const facilityRows = await db
    .select({
      id: facilities.id,
      latitude: facilities.latitude,
      longitude: facilities.longitude,
    })
    .from(facilities)
    .where(and(eq(facilities.tenantId, tenantId), inArray(facilities.id, facilityIds)));
  const facilityCoords = new Map<number, { lat: number; lng: number } | null>();
  for (const f of facilityRows) {
    if (f.latitude != null && f.longitude != null) {
      facilityCoords.set(f.id, { lat: Number(f.latitude), lng: Number(f.longitude) });
    } else {
      facilityCoords.set(f.id, null);
    }
  }

  for (let pi = 0; pi < picks.length; pi++) {
    const p = picks[pi];
    const pool: number[] = [];
    
    // Add existing real villages (COM- prefix) assigned to this facility
    for (const v of rows) {
      if (v.assignedFacilityId === p.facilityId && v.code?.startsWith("COM-")) {
        pool.push(v.id);
      }
    }

    // If we have real villages, we use them!
    if (pool.length > 0) {
      out.set(p.facilityId, pool);
      continue;
    }

    // Otherwise, check if we already have demo/missed villages assigned to this facility
    for (const v of rows) {
      if (v.assignedFacilityId === p.facilityId && (v.code?.startsWith("DEMO-") || v.code?.startsWith("VIL-") || v.code?.startsWith("MC-"))) {
        pool.push(v.id);
      }
    }

    const base = facilityCoords.get(p.facilityId) ?? null;

    let topUpIndex = 1;
    while (pool.length < MIN_VILLAGES_PER_FACILITY) {
      const slot = topUpIndex;
      const demoCode = `DEMO-${p.facilityId}-${slot}`;
      const demoName = getDistrictAwareVillageName(tenantCode, p.districtName, p.provinceName, p.facilityId, slot - 1);
      const coord = base ? offsetCoord(base.lat, base.lng, slot) : null;
      const isHardToReach = slot === MIN_VILLAGES_PER_FACILITY;
      const transportMode: "walking" | "road" | "boat" =
        slot <= 2 ? "walking" : "road";
      const seasonalAccessibility = isHardToReach ? "wet_season_only" : "year_round";
      
      const reused =
        rows.find((v) => v.code === demoCode && v.districtId === p.districtId) ??
        rows.find(
          (v) =>
            v.districtId === p.districtId &&
            (v.name === `Demo Catchment Village (${p.facilityName})` ||
              v.name === `Demo Catchment Village ${slot} (${p.facilityName})` ||
              v.name === `${demoName}`),
        );
      if (reused) {
        if (!pool.includes(reused.id)) pool.push(reused.id);
        const updates: Record<string, unknown> = {};
        if (reused.name !== demoName) updates.name = demoName;
        if (reused.code !== demoCode) updates.code = demoCode;
        if (coord && (reused.latitude == null || reused.longitude == null)) {
          updates.latitude = String(coord.lat.toFixed(7));
          updates.longitude = String(coord.lng.toFixed(7));
          updates.distanceToFacility = String(coord.distanceKm.toFixed(2));
          updates.isHardToReach = isHardToReach;
        }
        if (reused.transportMode == null) updates.transportMode = transportMode;
        if (reused.seasonalAccessibility == null)
          updates.seasonalAccessibility = seasonalAccessibility;
        if (Object.keys(updates).length > 0) {
          await db.update(villages).set(updates).where(eq(villages.id, reused.id));
          reused.name = demoName;
          reused.code = demoCode;
        }
      } else {
        const [created] = await db
          .insert(villages)
          .values({
            tenantId,
            name: demoName,
            code: demoCode,
            districtId: p.districtId,
            assignedFacilityId: p.facilityId,
            latitude: coord ? String(coord.lat.toFixed(7)) : null,
            longitude: coord ? String(coord.lng.toFixed(7)) : null,
            distanceToFacility: coord ? String(coord.distanceKm.toFixed(2)) : null,
            isHardToReach,
            transportMode,
            seasonalAccessibility,
          })
          .returning({ id: villages.id });
        pool.push(created.id);
        rows.push({
          id: created.id,
          name: demoName,
          code: demoCode,
          districtId: p.districtId,
          assignedFacilityId: p.facilityId,
          latitude: coord ? String(coord.lat.toFixed(7)) : null,
          longitude: coord ? String(coord.lng.toFixed(7)) : null,
          transportMode,
          seasonalAccessibility,
        });
      }
      topUpIndex += 1;
      if (topUpIndex > 20) break; // safety
    }
    out.set(p.facilityId, pool);
  }
  return out;
}

interface DemoClientSeed {
  slug: string;
  name: string;
  clientType: "child" | "pregnant_woman";
  gender: "male" | "female";
  /** Age in days; DOB = today - ageDays. */
  ageDays: number;
  parentName?: string;
  contactPhone?: string;
  villageIndex: number;
  /**
   * Vaccinations administered for this client. Each dose carries the display
   * vaccine name (e.g. "Penta 1", "OPV 0") AND the number of days after DOB
   * the dose was given. The admin date is derived as DOB + daysAfterDob.
   *
   * Vaccine name strings are chosen so:
   *   - `normAntigen()` (server/routes.ts) maps them to an RI code (PENTA_1,
   *     OPV_0, MR_1, BCG, …) for defaulter / dropout calculations.
   *   - `vaccineConfigKey()` below strips the dose number to find the matching
   *     vaccine_configurations row keyed by the short name ("Penta", "OPV", …).
   */
  vaccinations: Array<{ vaccineName: string; daysAfterDob: number }>;
}

/** Look up the vaccine_configurations short name for an antigen display name. */
function vaccineConfigKey(displayName: string): string {
  const u = displayName.toUpperCase().trim();
  if (u.startsWith("BCG")) return "BCG";
  if (u.startsWith("OPV")) return "OPV";
  if (u.startsWith("PENTA")) return "Penta";
  if (u.startsWith("PCV")) return "PCV";
  if (u.startsWith("ROTA")) return "Rotavirus";
  if (u.startsWith("IPV")) return "IPV";
  if (u.startsWith("MR") || u.startsWith("MEASLES")) return "MR";
  if (u.startsWith("TT") || u.startsWith("TD")) return "TT";
  return displayName;
}

// === Dose ladders, reused across cohorts so the data stays consistent. =====
// Each entry's `daysAfterDob` mirrors the WHO infant schedule + a small offset
// so the admin date falls a few days after the strict due-date.
const D_BIRTH: Array<{ vaccineName: string; daysAfterDob: number }> = [
  { vaccineName: "BCG", daysAfterDob: 1 },
  { vaccineName: "OPV 0", daysAfterDob: 1 },
];
const D_6W: Array<{ vaccineName: string; daysAfterDob: number }> = [
  { vaccineName: "OPV 1", daysAfterDob: 45 },
  { vaccineName: "Penta 1", daysAfterDob: 45 },
  { vaccineName: "PCV 1", daysAfterDob: 45 },
  { vaccineName: "Rota 1", daysAfterDob: 45 },
];
const D_10W: Array<{ vaccineName: string; daysAfterDob: number }> = [
  { vaccineName: "OPV 2", daysAfterDob: 73 },
  { vaccineName: "Penta 2", daysAfterDob: 73 },
  { vaccineName: "PCV 2", daysAfterDob: 73 },
  { vaccineName: "Rota 2", daysAfterDob: 73 },
];
const D_14W: Array<{ vaccineName: string; daysAfterDob: number }> = [
  { vaccineName: "OPV 3", daysAfterDob: 101 },
  { vaccineName: "Penta 3", daysAfterDob: 101 },
  { vaccineName: "PCV 3", daysAfterDob: 101 },
  { vaccineName: "Rota 3", daysAfterDob: 101 },
  { vaccineName: "IPV 1", daysAfterDob: 101 },
];
const D_9M: Array<{ vaccineName: string; daysAfterDob: number }> = [
  { vaccineName: "MR 1", daysAfterDob: 277 },
  { vaccineName: "IPV 2", daysAfterDob: 277 },
];

const CHILD_FIRST_NAMES = [
  "Amina", "Joseph", "Grace", "Kofi", "Lulu", "Moses", "Nia",
  "Tatu", "Eli", "Hawa", "Samuel", "Mercy", "Ezra", "Ada",
  "Jabari", "Zara", "Kweku", "Imani", "Jamal", "Naomi",
  "Tafadzwa", "Sipho", "Chipo", "Bongani", "Thandi",
];
const CHILD_LAST_NAMES = [
  "Banda", "Mwale", "Phiri", "Tembo", "Zulu", "Daka", "Nyirenda",
  "Mbewe", "Chanda", "Sakala", "Lungu", "Kalonga", "Mulenga",
  "Chileshe", "Mvula", "Bwalya", "Chola", "Kapata",
];
const MOTHER_NAMES = [
  "Mary Banda", "Ruth Mwale", "Esther Phiri", "Joyce Tembo",
  "Linda Zulu", "Hope Daka", "Agnes Mbewe", "Beatrice Lungu",
  "Faith Sakala", "Charity Mulenga", "Lucy Chanda", "Patricia Mvula",
  "Janet Chileshe", "Doris Bwalya", "Brenda Kapata",
];

interface CohortDef {
  slug: string;
  clientType: "child" | "pregnant_woman";
  gender: "male" | "female";
  ageDays: number;
  vaccinations: Array<{ vaccineName: string; daysAfterDob: number }>;
}

/**
 * Shared cohort blueprint applied to every demo facility. Together with
 * per-facility villages, names and phone numbers (built below), this yields
 * ~51 demo clients per facility — enough for a populated Client Logbook,
 * a Defaulter List that spans mild (≥4w overdue), moderate (≥6w) and severe
 * (≥8w) buckets across multiple antigens, AND a realistic eligible-age
 * (≥12 months) population that exercises the Zero-Dose, Under-Immunized
 * and DTP1→DTP3/MCV1 dropout indicators end-to-end.
 *
 * NOTE on monthly_reports impact: the seed only subtracts doses whose admin
 * date falls inside the *current quarter* (see seedDemoClients below). Most
 * cohorts here have older DOBs so their priming doses land in past quarters
 * and don't disturb the demo coverage rollup.
 */
const COHORTS: CohortDef[] = [
  // --- Up-to-date (5) -------------------------------------------------------
  { slug: "uptd-newborn", clientType: "child", gender: "female", ageDays: 5,
    vaccinations: [...D_BIRTH] },
  { slug: "uptd-8w", clientType: "child", gender: "male", ageDays: 56,
    vaccinations: [...D_BIRTH, ...D_6W] },
  { slug: "uptd-14w", clientType: "child", gender: "female", ageDays: 98,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W] },
  { slug: "uptd-5m", clientType: "child", gender: "male", ageDays: 150,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, ...D_14W] },
  { slug: "uptd-12m", clientType: "child", gender: "female", ageDays: 365,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, ...D_14W, ...D_9M] },

  // --- In-progress, still inside the 4-week grace (3) ----------------------
  { slug: "inpr-4w", clientType: "child", gender: "male", ageDays: 28,
    vaccinations: [...D_BIRTH] },
  { slug: "inpr-9w", clientType: "child", gender: "female", ageDays: 63,
    vaccinations: [...D_BIRTH, ...D_6W] },
  { slug: "inpr-13w", clientType: "child", gender: "male", ageDays: 91,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W] },

  // --- Mild defaulters: ~29-41 days overdue (6) -----------------------------
  { slug: "mild-bcg", clientType: "child", gender: "female", ageDays: 35,
    vaccinations: [] }, // BCG due day 0 → 35d overdue
  { slug: "mild-opv0", clientType: "child", gender: "male", ageDays: 35,
    vaccinations: [{ vaccineName: "BCG", daysAfterDob: 1 }] }, // OPV_0 due day 0 → 35d
  { slug: "mild-opv1", clientType: "child", gender: "female", ageDays: 75,
    vaccinations: [...D_BIRTH] }, // OPV_1 due day 42 → 33d overdue
  { slug: "mild-penta1", clientType: "child", gender: "male", ageDays: 75,
    vaccinations: [...D_BIRTH, { vaccineName: "OPV 1", daysAfterDob: 45 }] }, // Penta_1 due day 42 → 33d
  { slug: "mild-penta2", clientType: "child", gender: "female", ageDays: 105,
    vaccinations: [...D_BIRTH, ...D_6W, { vaccineName: "OPV 2", daysAfterDob: 73 }] }, // Penta_2 due 70 → 35d
  { slug: "mild-opv3", clientType: "child", gender: "male", ageDays: 135,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W] }, // OPV_3 due 98 → 37d overdue

  // --- Moderate defaulters: ~42-55 days overdue (5) ------------------------
  { slug: "mod-opv0", clientType: "child", gender: "female", ageDays: 50,
    vaccinations: [{ vaccineName: "BCG", daysAfterDob: 1 }] }, // OPV_0 → 50d overdue
  { slug: "mod-penta1", clientType: "child", gender: "male", ageDays: 90,
    vaccinations: [...D_BIRTH, { vaccineName: "OPV 1", daysAfterDob: 45 }] }, // Penta_1 due 42 → 48d
  { slug: "mod-penta2", clientType: "child", gender: "female", ageDays: 120,
    vaccinations: [...D_BIRTH, ...D_6W, { vaccineName: "OPV 2", daysAfterDob: 73 }] }, // Penta_2 → 50d
  { slug: "mod-penta3", clientType: "child", gender: "male", ageDays: 150,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, { vaccineName: "OPV 3", daysAfterDob: 101 }] }, // Penta_3 due 98 → 52d
  { slug: "mod-mr1", clientType: "child", gender: "female", ageDays: 320,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, ...D_14W] }, // MR_1 due 273 → 47d

  // --- Severe defaulters: ≥56 days overdue (6) -----------------------------
  { slug: "sev-bcg", clientType: "child", gender: "male", ageDays: 180,
    vaccinations: [] }, // BCG → 180d overdue
  { slug: "sev-opv0", clientType: "child", gender: "female", ageDays: 120,
    vaccinations: [{ vaccineName: "BCG", daysAfterDob: 1 }] }, // OPV_0 → 120d
  { slug: "sev-penta1", clientType: "child", gender: "male", ageDays: 140,
    vaccinations: [...D_BIRTH, { vaccineName: "OPV 1", daysAfterDob: 45 }] }, // Penta_1 → 98d
  { slug: "sev-penta3", clientType: "child", gender: "female", ageDays: 200,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, { vaccineName: "OPV 3", daysAfterDob: 101 }] }, // Penta_3 → 102d
  { slug: "sev-mr1", clientType: "child", gender: "male", ageDays: 450,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, ...D_14W] }, // MR_1 due 273 → 177d
  { slug: "sev-mr2", clientType: "child", gender: "female", ageDays: 900,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, ...D_14W, ...D_9M] }, // MR_2 due 546 → 354d

  // --- Eligible-age cohort (≥12 months) ====================================
  // The Zero-Dose, Under-Immunized and DTP1→DTP3/MCV1 tiles only count
  // children ≥12 months old. The defaulter cohorts above are mostly under
  // 12 months so they don't move those tiles at all. This block adds a
  // realistic eligible-age population with the distribution:
  //   ~70% complete through DTP3 + MCV1
  //   ~15% under-immunized (DTP1 but no DTP3)
  //   ~10% zero-dose (no DTP1)
  //   ~5%  mixed dropout (DTP1+DTP2 but no DTP3 / MCV1) — also flagged as
  //         under-immunized by the indicator since it lacks DTP3.
  // All priming doses land >6 months ago so monthly_reports stays stable
  // (the in-quarter adjustment in seedDemoClients still handles any overlap
  // safely by clamping to 0).

  // 14 complete (DTP3 + MCV1), ages 13–30 months
  { slug: "elig-cmp-01", clientType: "child", gender: "female", ageDays: 400,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, ...D_14W, ...D_9M] },
  { slug: "elig-cmp-02", clientType: "child", gender: "male", ageDays: 430,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, ...D_14W, ...D_9M] },
  { slug: "elig-cmp-03", clientType: "child", gender: "female", ageDays: 470,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, ...D_14W, ...D_9M] },
  { slug: "elig-cmp-04", clientType: "child", gender: "male", ageDays: 500,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, ...D_14W, ...D_9M] },
  { slug: "elig-cmp-05", clientType: "child", gender: "female", ageDays: 540,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, ...D_14W, ...D_9M] },
  { slug: "elig-cmp-06", clientType: "child", gender: "male", ageDays: 580,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, ...D_14W, ...D_9M] },
  { slug: "elig-cmp-07", clientType: "child", gender: "female", ageDays: 620,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, ...D_14W, ...D_9M] },
  { slug: "elig-cmp-08", clientType: "child", gender: "male", ageDays: 660,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, ...D_14W, ...D_9M] },
  { slug: "elig-cmp-09", clientType: "child", gender: "female", ageDays: 700,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, ...D_14W, ...D_9M] },
  { slug: "elig-cmp-10", clientType: "child", gender: "male", ageDays: 740,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, ...D_14W, ...D_9M] },
  { slug: "elig-cmp-11", clientType: "child", gender: "female", ageDays: 780,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, ...D_14W, ...D_9M] },
  { slug: "elig-cmp-12", clientType: "child", gender: "male", ageDays: 820,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, ...D_14W, ...D_9M] },
  { slug: "elig-cmp-13", clientType: "child", gender: "female", ageDays: 860,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, ...D_14W, ...D_9M] },
  { slug: "elig-cmp-14", clientType: "child", gender: "male", ageDays: 900,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, ...D_14W, ...D_9M] },

  // 3 under-immunized: DTP1 (Penta_1) administered but no DTP3, no MCV1
  { slug: "elig-ui-01", clientType: "child", gender: "male", ageDays: 410,
    vaccinations: [...D_BIRTH, ...D_6W] },
  { slug: "elig-ui-02", clientType: "child", gender: "female", ageDays: 520,
    vaccinations: [...D_BIRTH, ...D_6W] },
  { slug: "elig-ui-03", clientType: "child", gender: "male", ageDays: 640,
    vaccinations: [...D_BIRTH, ...D_6W] },

  // 2 zero-dose: no DTP1 ever administered (one truly empty, one BCG-only)
  { slug: "elig-zd-01", clientType: "child", gender: "female", ageDays: 460,
    vaccinations: [] },
  { slug: "elig-zd-02", clientType: "child", gender: "male", ageDays: 600,
    vaccinations: [{ vaccineName: "BCG", daysAfterDob: 1 }] },

  // 1 mixed dropout: DTP1 + DTP2 but no DTP3 / MCV1
  { slug: "elig-do-01", clientType: "child", gender: "female", ageDays: 560,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W] },

  // --- Pregnant women (3) ---------------------------------------------------
  { slug: "preg-td1", clientType: "pregnant_woman", gender: "female",
    ageDays: 365 * 25,
    vaccinations: [{ vaccineName: "TT 1", daysAfterDob: 365 * 25 - 35 }] },
  { slug: "preg-td2", clientType: "pregnant_woman", gender: "female",
    ageDays: 365 * 28,
    vaccinations: [
      { vaccineName: "TT 1", daysAfterDob: 365 * 28 - 95 },
      { vaccineName: "TT 2", daysAfterDob: 365 * 28 - 25 },
    ] },
  { slug: "preg-new", clientType: "pregnant_woman", gender: "female",
    ageDays: 365 * 22,
    vaccinations: [] },
];

function buildClientRoster(facilityIndex: number): DemoClientSeed[] {
  // Deterministic per facility so re-runs are idempotent.
  const pick = <T>(arr: T[], offset: number) => arr[(facilityIndex * 17 + offset) % arr.length];
  const childName = (i: number) =>
    `Demo ${pick(CHILD_FIRST_NAMES, i)} ${pick(CHILD_LAST_NAMES, i + 3)}`;
  const motherName = (i: number) => `Demo ${pick(MOTHER_NAMES, i)}`;
  const phoneFor = (i: number) => {
    // Deterministic, clearly-fake +000 demo numbers.
    const subscriber = ((facilityIndex * 1009 + i * 37) % 9000) + 1000;
    return `+000-${String(700 + (facilityIndex % 30)).padStart(3, "0")}-${subscriber}`;
  };

  return COHORTS.map((c, i) => {
    const isPregnant = c.clientType === "pregnant_woman";
    return {
      slug: c.slug,
      name: isPregnant ? motherName(i) : childName(i),
      clientType: c.clientType,
      gender: c.gender,
      ageDays: c.ageDays,
      parentName: isPregnant ? undefined : motherName(i + 5),
      contactPhone: phoneFor(i),
      villageIndex: i, // rotated across the facility's village pool
      vaccinations: c.vaccinations,
    };
  });
}

async function seedDemoClients(
  tenantId: string,
  picks: FacilityPick[],
  villagesByFacility: Map<number, number[]>,
  vaccineConfigByName: Map<string, number>,
): Promise<{ clientsInserted: number; vaccinationsInserted: number }> {
  if (picks.length === 0) return { clientsInserted: 0, vaccinationsInserted: 0 };

  const startMonth = (QUARTER - 1) * 3; // 0-indexed
  const quarterStart = new Date(Date.UTC(YEAR, startMonth, 1));
  const quarterEndExclusive = new Date(Date.UTC(YEAR, startMonth + 3, 1));
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const DAY_MS = 24 * 3600 * 1000;

  let clientsInserted = 0;
  let vaccinationsInserted = 0;

  for (let pi = 0; pi < picks.length; pi++) {
    const p = picks[pi];
    const villagePool = villagesByFacility.get(p.facilityId);
    if (!villagePool || villagePool.length === 0) {
      console.warn(`  [facility ${p.facilityId}] no village available — skipping demo clients.`);
      continue;
    }

    const roster = buildClientRoster(pi);

    // Idempotency: skip any roster entry whose generated name already exists
    // on this facility. This is per-client, not per-facility, so adding new
    // cohorts in later seed runs picks up only the new entries instead of
    // re-inserting every demo client. The monthly_reports adjustment below
    // only subtracts doses we actually inserted in *this* run, so it's a
    // true no-op when nothing new is added.
    const existing = await db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(and(eq(clients.tenantId, tenantId), eq(clients.facilityId, p.facilityId)));
    const existingNames = new Set(existing.map((r) => r.name));

    // Insert clients (skip any whose name happens to collide with a non-demo
    // row — extremely unlikely thanks to the "Demo " prefix, but defensive).
    const clientIdBySlug = new Map<string, string>();
    for (const c of roster) {
      if (existingNames.has(c.name)) continue;
      const dob = new Date(today.getTime() - c.ageDays * DAY_MS);
      const villageId = villagePool[c.villageIndex % villagePool.length];
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
          contactPhone: c.contactPhone ?? null,
          catchmentStatus: "catchment",
          contraindications: [],
          isRefusal: false,
          isCrossBorder: false,
        })
        .returning({ id: clients.id });
      clientIdBySlug.set(c.slug, row.id);
      clientsInserted++;
    }

    // Insert client_vaccinations and tally how many doses (per config-key)
    // landed *inside the current quarter* — only those need to be subtracted
    // from monthly_reports.immunizations to keep coverage totals consistent.
    const inQuarterByConfig: Record<string, number> = {};
    for (const c of roster) {
      const clientId = clientIdBySlug.get(c.slug);
      if (!clientId) continue;
      const dob = new Date(today.getTime() - c.ageDays * DAY_MS);
      for (const v of c.vaccinations) {
        const configKey = vaccineConfigKey(v.vaccineName);
        const configId = vaccineConfigByName.get(configKey);
        if (!configId) continue;
        const administered = new Date(dob.getTime() + v.daysAfterDob * DAY_MS);
        // Never insert a future-dated vaccination.
        if (administered > today) continue;
        await db.insert(clientVaccinations).values({
          tenantId,
          clientId,
          vaccineConfigId: configId,
          vaccineName: v.vaccineName,
          administeredDate: administered,
          batchNumber: `DEMO-${configKey}-${administered.getUTCFullYear()}`,
          vvmStatus: 1,
        });
        vaccinationsInserted++;
        if (administered >= quarterStart && administered < quarterEndExclusive) {
          inQuarterByConfig[configKey] = (inQuarterByConfig[configKey] ?? 0) + 1;
        }
      }
    }

    // Subtract in-quarter additions from monthly_reports so /api/coverage
    // doesn't double-count this quarter's roll-up. Spread across the quarter's
    // months and clamp each bucket at 0 so we never produce a negative.
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

    for (const [vaccineName, toRemove] of Object.entries(inQuarterByConfig)) {
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

/**
 * Seed village-level population_data rows so the Missed Communities scorer
 * (which reads populationData.villageId → under1Population) has registered
 * pop figures to compute unserved estimates from. Idempotent: skips any
 * (tenant, village, source='nso', year) row that already exists.
 */
async function seedVillagePopulation(
  tenantId: string,
  villagesByFacility: Map<number, number[]>,
  picks: FacilityPick[],
): Promise<number> {
  const villageIds = Array.from(new Set(Array.from(villagesByFacility.values()).flat()));
  if (villageIds.length === 0) return 0;

  const villageRows = await db
    .select({
      id: villages.id,
      districtId: villages.districtId,
      assignedFacilityId: villages.assignedFacilityId,
    })
    .from(villages)
    .where(and(eq(villages.tenantId, tenantId), inArray(villages.id, villageIds)));

  const provinceByDistrict = new Map<number, number>();
  for (const p of picks) provinceByDistrict.set(p.districtId, p.provinceId);

  const existing = await db
    .select({ villageId: populationData.villageId, year: populationData.year, source: populationData.source })
    .from(populationData)
    .where(and(eq(populationData.tenantId, tenantId), inArray(populationData.villageId, villageIds)));
  const existingKeys = new Set(existing.map((r) => `${r.villageId}|${r.source}|${r.year}`));

  let inserted = 0;
  for (let i = 0; i < villageRows.length; i++) {
    const v = villageRows[i];
    const key = `${v.id}|nso|${YEAR}`;
    if (existingKeys.has(key)) continue;
    // Deterministic per-village under-1 count between ~25 and ~150.
    const under1 = 25 + ((v.id * 37) % 126);
    const total = under1 * 28; // ~3.5% under-1 ratio
    await db.insert(populationData).values({
      tenantId,
      villageId: v.id,
      facilityId: v.assignedFacilityId ?? null,
      districtId: v.districtId,
      provinceId: provinceByDistrict.get(v.districtId) ?? null,
      source: "nso",
      year: YEAR,
      totalPopulation: total,
      under1Population: under1,
      under5Population: under1 * 5,
      confidenceScore: "80.00",
      approvalStatus: "approved",
    });
    inserted++;
  }
  return inserted;
}

/**
 * Seed imported_coverage rows for the Missed Communities page.
 * Writes deliberately under-target doses across the last 3 reporting periods
 * for the main RI antigens so the ranked list is non-trivial.
 *
 * Idempotent via the (tenant, facility, period, antigen, source='csv') unique
 * constraint — re-running upserts the same dose count.
 */
const COVERAGE_ANTIGENS = ["BCG", "PENTA1", "PENTA3", "MEASLES1", "MEASLES2", "OPV1", "OPV3"];

function lastNPeriods(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

async function seedImportedCoverage(
  tenantId: string,
  picks: FacilityPick[],
  villagesByFacility: Map<number, number[]>,
): Promise<number> {
  if (picks.length === 0) return 0;
  const periods = lastNPeriods(3);

  // Sum of registered under-1 across the facility's seeded villages.
  const villageIds = Array.from(new Set(Array.from(villagesByFacility.values()).flat()));
  const popRows = villageIds.length
    ? await db
        .select({ villageId: populationData.villageId, under1: populationData.under1Population })
        .from(populationData)
        .where(and(eq(populationData.tenantId, tenantId), inArray(populationData.villageId, villageIds)))
    : [];
  const popByVillage = new Map<number, number>();
  for (const r of popRows) {
    if (r.villageId == null) continue;
    const prev = popByVillage.get(r.villageId) ?? 0;
    if ((r.under1 ?? 0) > prev) popByVillage.set(r.villageId, r.under1 ?? 0);
  }

  // Per-facility coverage tier so the Missed Communities ranked list is
  // visibly differentiated: the first picked facility is clearly under-served
  // (~30%), the next is mid (~62%), and the last is well-covered (~92%).
  // This produces a clear story on the map: the under-served facility's
  // villages dominate the top of the ranking, while the well-covered
  // facility's villages drop off (and often score 0, so they're filtered out
  // by the scorer entirely).
  const FACILITY_COVERAGE_TIERS = [0.30, 0.62, 0.92];
  // Per-antigen adjustment so antigens with longer schedules (PENTA3, MR2)
  // look worse than first doses — matching the typical dropout pattern.
  const ANTIGEN_COVERAGE_ADJUST: Record<string, number> = {
    BCG: 0.05,
    OPV1: 0.02,
    PENTA1: 0.0,
    PENTA3: -0.12,
    MEASLES1: -0.05,
    MEASLES2: -0.18,
    OPV3: -0.10,
  };

  let inserted = 0;
  for (let pi = 0; pi < picks.length; pi++) {
    const p = picks[pi];
    const facVillages = villagesByFacility.get(p.facilityId) ?? [];
    const registeredUnder1 = facVillages.reduce((s, vid) => s + (popByVillage.get(vid) ?? 0), 0);
    if (registeredUnder1 === 0) continue;

    const tier = FACILITY_COVERAGE_TIERS[pi % FACILITY_COVERAGE_TIERS.length];

    for (let periodIdx = 0; periodIdx < periods.length; periodIdx++) {
      const period = periods[periodIdx];
      const rows: Array<typeof importedCoverage.$inferInsert> = [];
      for (let ai = 0; ai < COVERAGE_ANTIGENS.length; ai++) {
        const antigen = COVERAGE_ANTIGENS[ai];
        // Gentle period drift so trends look real across the last 3 months.
        const periodDrift = (periodIdx - 1) * 0.03;
        const adjust = ANTIGEN_COVERAGE_ADJUST[antigen] ?? 0;
        const coverage = Math.max(0.05, Math.min(0.98, tier + adjust + periodDrift));
        const doses = Math.max(1, Math.round(registeredUnder1 * coverage));
        rows.push({
          tenantId,
          facilityId: p.facilityId,
          period,
          antigen,
          dosesAdministered: doses,
          source: "csv",
          sourceRef: "demo-seed",
          importedByUserId: null,
        });
      }
      if (rows.length === 0) continue;
      await db
        .insert(importedCoverage)
        .values(rows)
        .onConflictDoUpdate({
          target: [
            importedCoverage.tenantId,
            importedCoverage.facilityId,
            importedCoverage.period,
            importedCoverage.antigen,
            importedCoverage.source,
          ],
          set: {
            dosesAdministered: sql`excluded.doses_administered`,
            sourceRef: sql`excluded.source_ref`,
            importedAt: sql`now()`,
          },
        });
      inserted += rows.length;
    }
  }
  return inserted;
}

/**
 * Fill monthly_reports.stockSummary for current-quarter rows that still have
 * an empty summary. Derives plausible opening/received/administered/wasted/
 * closing values from the row's seeded `immunizations` so dashboards line up
 * with administered doses. Idempotent: skips any row whose stockSummary is
 * already populated (non-empty object).
 *
 * Math per vaccine:
 *   administered = immunizations[v]   (already in the row)
 *   wasted       = round(administered * rate / (100 - rate))
 *   received     = ceil((administered + wasted) * 1.10)  (10% surplus)
 *   opening      = closing of previous month, or ~30% of received initially
 *   closing      = max(0, opening + received - administered - wasted)
 *   wastageRate  = round(wasted / (administered + wasted) * 100, 2)
 */
async function seedStockSummary(
  tenantId: string,
  picks: FacilityPick[],
): Promise<number> {
  if (picks.length === 0) return 0;
  const startMonth = (QUARTER - 1) * 3 + 1;
  const monthsInQuarter = [startMonth, startMonth + 1, startMonth + 2];
  const facilityIds = picks.map((p) => p.facilityId);

  const rows = await db
    .select({
      id: monthlyReports.id,
      facilityId: monthlyReports.facilityId,
      month: monthlyReports.month,
      year: monthlyReports.year,
      immunizations: monthlyReports.immunizations,
      stockSummary: monthlyReports.stockSummary,
    })
    .from(monthlyReports)
    .where(
      and(
        eq(monthlyReports.tenantId, tenantId),
        eq(monthlyReports.year, YEAR),
        inArray(monthlyReports.facilityId, facilityIds),
        inArray(monthlyReports.month, monthsInQuarter),
      ),
    );

  // Group by facility and order by month so we can carry closing → opening.
  type Row = (typeof rows)[number];
  const byFacility: Record<number, Row[]> = {};
  for (const r of rows) {
    const arr: Row[] = byFacility[r.facilityId] ?? [];
    arr.push(r);
    byFacility[r.facilityId] = arr;
  }

  let updated = 0;
  for (const facilityRows of Object.values(byFacility)) {
    facilityRows.sort((a: Row, b: Row) => a.month - b.month);
    const carryByVaccine: Record<string, number> = {};
    for (const r of facilityRows) {
      const existingSummary = (r.stockSummary ?? {}) as Record<string, unknown>;
      const alreadyFilled = Object.keys(existingSummary).length > 0;
      const imms = (r.immunizations ?? {}) as Record<string, number>;
      const summary: Record<string, {
        opening: number;
        received: number;
        administered: number;
        wasted: number;
        closing: number;
        wastageRate: number;
      }> = {};

      for (const v of VACCINES) {
        const administered = Number(imms[v.name] ?? 0);
        if (administered <= 0 && (carryByVaccine[v.name] ?? 0) <= 0) continue;
        const rate = v.wastageRate;
        const wasted = administered > 0
          ? Math.round((administered * rate) / Math.max(1, 100 - rate))
          : 0;
        const consumed = administered + wasted;
        const received = consumed > 0 ? Math.ceil(consumed * 1.10) : 0;
        const opening = carryByVaccine[v.name] ?? Math.ceil(received * 0.30);
        const closing = Math.max(0, opening + received - administered - wasted);
        const denom = administered + wasted;
        const wastageRate = denom > 0
          ? Math.round((wasted / denom) * 10000) / 100
          : 0;
        summary[v.name] = { opening, received, administered, wasted, closing, wastageRate };
        carryByVaccine[v.name] = closing;
      }

      if (alreadyFilled) continue;
      if (Object.keys(summary).length === 0) continue;
      await db
        .update(monthlyReports)
        .set({ stockSummary: summary })
        .where(eq(monthlyReports.id, r.id));
      updated++;
    }
  }
  return updated;
}

/**
 * Seed stock_transactions for the current quarter so the Stock Ledger view
 * shows real movement. For each picked facility and each demo vaccine:
 *   - one quarter-opening receipt from "National Vaccine Store"
 *   - one monthly issue to "Routine Sessions" representing doses consumed
 *   - one monthly issue to "Outreach Team" for ~25% of the routine amount
 * Idempotent: skips a facility entirely if any stock_transactions row
 * already exists for it.
 */
async function seedStockTransactions(
  tenantId: string,
  picks: FacilityPick[],
): Promise<number> {
  if (picks.length === 0) return 0;
  const startMonth = (QUARTER - 1) * 3 + 1; // 1-indexed
  const monthsInQuarter = [startMonth, startMonth + 1, startMonth + 2];
  const facilityIds = picks.map((p) => p.facilityId);

  const existing = await db
    .select({ facilityId: stockTransactions.facilityId })
    .from(stockTransactions)
    .where(
      and(
        eq(stockTransactions.tenantId, tenantId),
        inArray(stockTransactions.facilityId, facilityIds),
      ),
    );
  const seededFacilityIds = new Set(existing.map((r) => r.facilityId));

  // Pull this quarter's reports to drive issue quantities by administered doses.
  const reports = await db
    .select({
      facilityId: monthlyReports.facilityId,
      month: monthlyReports.month,
      immunizations: monthlyReports.immunizations,
    })
    .from(monthlyReports)
    .where(
      and(
        eq(monthlyReports.tenantId, tenantId),
        eq(monthlyReports.year, YEAR),
        inArray(monthlyReports.facilityId, facilityIds),
        inArray(monthlyReports.month, monthsInQuarter),
      ),
    );
  const immsByFacMonth = new Map<string, Record<string, number>>();
  for (const r of reports) {
    immsByFacMonth.set(
      `${r.facilityId}|${r.month}`,
      (r.immunizations ?? {}) as Record<string, number>,
    );
  }

  let inserted = 0;
  for (const p of picks) {
    if (seededFacilityIds.has(p.facilityId)) continue;

    // Quarter-opening receipts: sum all administered for the quarter, add the
    // wastage uplift and a 25% surplus, round up to whole vials.
    const quarterOpeningDate = new Date(Date.UTC(YEAR, startMonth - 1, 2));
    const expiryDate = new Date(Date.UTC(YEAR + 2, 0, 1));

    for (const v of VACCINES) {
      let quarterAdministered = 0;
      for (const m of monthsInQuarter) {
        const imm = immsByFacMonth.get(`${p.facilityId}|${m}`) ?? {};
        quarterAdministered += Number(imm[v.name] ?? 0);
      }
      const rate = v.wastageRate;
      const wastedTotal = quarterAdministered > 0
        ? Math.round((quarterAdministered * rate) / Math.max(1, 100 - rate))
        : 0;
      const consumed = quarterAdministered + wastedTotal;
      // 25% surplus, then round up to whole vials.
      const surplus = Math.ceil(consumed * 1.25);
      const receiptDoses = Math.max(
        v.dosesPerVial,
        Math.ceil(surplus / v.dosesPerVial) * v.dosesPerVial,
      );

      await db.insert(stockTransactions).values({
        tenantId,
        facilityId: p.facilityId,
        vaccineName: v.name,
        transactionType: "receipt",
        quantityDoses: receiptDoses,
        batchNumber: `DEMO-${v.name.toUpperCase()}-Q${QUARTER}${YEAR}`,
        expiryDate,
        vvmStatus: 1,
        supplierOrRecipient: "National Vaccine Store",
        transactionDate: quarterOpeningDate,
        notes: `Quarter-opening receipt seeded for demo.`,
      });
      inserted++;

      // Monthly issues — routine + outreach split.
      for (let mi = 0; mi < monthsInQuarter.length; mi++) {
        const m = monthsInQuarter[mi];
        const imm = immsByFacMonth.get(`${p.facilityId}|${m}`) ?? {};
        const monthAdmin = Number(imm[v.name] ?? 0);
        if (monthAdmin <= 0) continue;
        const monthWasted = Math.round((monthAdmin * rate) / Math.max(1, 100 - rate));
        const monthIssued = monthAdmin + monthWasted;
        const outreachShare = Math.round(monthIssued * 0.25);
        const routineShare = Math.max(0, monthIssued - outreachShare);

        // Issue date: middle of the month for routine, end for outreach.
        const routineDate = new Date(Date.UTC(YEAR, m - 1, 15));
        const outreachDate = new Date(Date.UTC(YEAR, m - 1, 25));

        if (routineShare > 0) {
          await db.insert(stockTransactions).values({
            tenantId,
            facilityId: p.facilityId,
            vaccineName: v.name,
            transactionType: "issue",
            quantityDoses: routineShare,
            batchNumber: `DEMO-${v.name.toUpperCase()}-Q${QUARTER}${YEAR}`,
            expiryDate,
            vvmStatus: 1,
            supplierOrRecipient: "Routine Sessions",
            transactionDate: routineDate,
            notes: `Issued to routine fixed sessions.`,
          });
          inserted++;
        }
        if (outreachShare > 0) {
          await db.insert(stockTransactions).values({
            tenantId,
            facilityId: p.facilityId,
            vaccineName: v.name,
            transactionType: "issue",
            quantityDoses: outreachShare,
            batchNumber: `DEMO-${v.name.toUpperCase()}-Q${QUARTER}${YEAR}`,
            expiryDate,
            vvmStatus: 1,
            supplierOrRecipient: "Outreach Team",
            transactionDate: outreachDate,
            notes: `Issued to outreach team for mobile sessions.`,
          });
          inserted++;
        }
      }
    }
  }
  return inserted;
}

/**
 * Seed surveillance cases for the VPD surveillance module map view.
 * Seeds a few cases with coordinates clustered around selected facilities.
 */
async function seedSurveillanceCases(
  tenantId: string,
  picks: FacilityPick[],
  villagesByFacility: Map<number, number[]>,
): Promise<number> {
  if (picks.length === 0) return 0;

  const existing = await db
    .select({ id: surveillanceCases.id })
    .from(surveillanceCases)
    .where(eq(surveillanceCases.tenantId, tenantId))
    .limit(1);

  if (existing.length > 0) return 0;

  let inserted = 0;
  const diseases = ["afp", "measles", "cholera"] as const;
  const names = [
    "John Mwansa", "Mary Tembo", "Joseph Phiri",
    "Chipo Mwanza", "Agness Banda", "Moses Mulenga",
    "Loveness Kabwe", "Kelvin Chanda", "Patricia Chihana"
  ];

  for (let pi = 0; pi < picks.length; pi++) {
    const p = picks[pi];
    const villagePool = villagesByFacility.get(p.facilityId) || [];

    // Query facility coordinates to jitter around
    const [fac] = await db
      .select({ latitude: facilities.latitude, longitude: facilities.longitude })
      .from(facilities)
      .where(eq(facilities.id, p.facilityId))
      .limit(1);

    if (!fac || !fac.latitude || !fac.longitude) continue;

    const lat = Number(fac.latitude);
    const lng = Number(fac.longitude);

    // Seed 2 suspected and 1 confirmed cases per facility
    const numCases = 3;
    for (let cIdx = 0; cIdx < numCases; cIdx++) {
      const name = names[(pi * 3 + cIdx) % names.length];
      const disease = diseases[(pi + cIdx) % diseases.length];
      const classification = cIdx === 0 ? "confirmed" : "suspected";
      const ageMonths = 12 + (cIdx * 15);

      // Jitter coordinates within a 1-2km range of the facility using the golden angle
      const angle = (cIdx * 120) * (Math.PI / 180);
      const r = 0.008 + (cIdx * 0.005);
      const caseLat = lat + r * Math.sin(angle);
      const caseLng = lng + r * Math.cos(angle);

      const villageId = villagePool.length > 0 ? villagePool[cIdx % villagePool.length] : null;

      await db.insert(surveillanceCases).values({
        tenantId,
        facilityId: p.facilityId,
        villageId,
        disease,
        patientName: `Demo Case ${name}`,
        patientAgeMonths: ageMonths,
        patientGender: cIdx % 2 === 0 ? "male" : "female",
        dateOfOnset: new Date(Date.now() - (3 + cIdx * 5) * 24 * 3600 * 1000),
        classification,
        gpsLatitude: String(caseLat),
        gpsLongitude: String(caseLng),
        status: cIdx === 0 ? "closed" : "open",
        clinicalNotes: `Suspected case reported in community catchment area. Rapid investigation conducted.`,
      });
      inserted++;
    }
  }
  return inserted;
}

/**
 * Top-level seed entrypoint. Safe to call repeatedly — every step is
 * idempotent and gracefully skips tenants/facilities that aren't seeded yet.
 * Returns silently (no process.exit) so it can be invoked from server startup.
 */

async function backfillPasswordHashes(): Promise<number> {
  const nullUsers = await db.select({ id: users.id })
    .from(users)
    .where(sql`${users.passwordHash} IS NULL`);
  if (nullUsers.length === 0) return 0;
  const hash = await hashPassword("vaxplan2024");
  await db.execute(sql`UPDATE users SET password_hash = ${hash} WHERE password_hash IS NULL`);
  return nullUsers.length;
}

export async function seedDemoOperational(): Promise<void> {
  for (const code of ["ZMB", "SSD", "PNG", "ZAF"] as TenantCode[]) {
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
    const mrb = await backfillMissingVaccinesInMonthlyReports(
      tenant.id,
      picks,
      demographics,
      catchmentByFacility,
    );
    const vaccineConfigByName = await ensureVaccineConfigs(tenant.id);
    const villagesByFacility = await pickVillagesPerFacility(code, tenant.id, picks);
    const vp = await seedVillagePopulation(tenant.id, villagesByFacility, picks);
    const ic = await seedImportedCoverage(tenant.id, picks, villagesByFacility);
    const { clientsInserted, vaccinationsInserted } = await seedDemoClients(
      tenant.id,
      picks,
      villagesByFacility,
      vaccineConfigByName,
    );
    // Stock seeders run AFTER seedDemoClients because that step adjusts
    // monthly_reports.immunizations; the stock summary derives from the
    // final administered counts.
    const ss = await seedStockSummary(tenant.id, picks);
    const st = await seedStockTransactions(tenant.id, picks);
    const sc = await seedSurveillanceCases(tenant.id, picks, villagesByFacility);
    console.log(
      `[${code}] picked ${picks.length} facilities • +${u} users • +${pop} facility-pop • +${vp} village-pop • +${vr} vaccine reqs • +${sp} session plans • +${mr} monthly reports (+${mrb} backfilled) • +${ic} imported-coverage rows • +${clientsInserted} demo clients • +${vaccinationsInserted} client vaccinations • +${ss} stock summaries • +${st} stock transactions • +${sc} surveillance cases`,
    );
  }
  const backfilled = await backfillPasswordHashes();
  if (backfilled > 0) {
    console.log(`[backfill] Set passwordHash for ${backfilled} users.`);
  }
}

async function runCli() {
  await seedDemoOperational();

  const summary = await db.execute(sql`
    SELECT
      t.code,
      (SELECT COUNT(*) FROM users                u WHERE u.tenant_id = t.id) AS users,
      (SELECT COUNT(*) FROM population_data      p WHERE p.tenant_id = t.id) AS population_rows,
      (SELECT COUNT(*) FROM vaccine_requirements v WHERE v.tenant_id = t.id) AS vaccine_requirements,
      (SELECT COUNT(*) FROM session_plans        s WHERE s.tenant_id = t.id) AS session_plans,
      (SELECT COUNT(*) FROM monthly_reports      m WHERE m.tenant_id = t.id) AS monthly_reports,
      (SELECT COUNT(*) FROM clients              c WHERE c.tenant_id = t.id) AS clients,
      (SELECT COUNT(*) FROM client_vaccinations  cv WHERE cv.tenant_id = t.id) AS client_vaccinations,
      (SELECT COUNT(*) FROM imported_coverage    ic WHERE ic.tenant_id = t.id) AS imported_coverage_rows,
      (SELECT COUNT(*) FROM stock_transactions   st WHERE st.tenant_id = t.id) AS stock_transactions,
      (SELECT COUNT(*) FROM monthly_reports      mr2 WHERE mr2.tenant_id = t.id AND mr2.stock_summary <> '{}'::jsonb) AS reports_with_stock,
      (SELECT COUNT(*) FROM surveillance_cases   sc WHERE sc.tenant_id = t.id) AS surveillance_cases
    FROM tenants t
    WHERE t.code IN ('ZMB','SSD','PNG')
    ORDER BY t.code;
  `);
  console.log("\nDemo operational data rollup:");
  console.table(summary.rows);
  console.log("Done.");
  process.exit(0);
}

// Only auto-run process.exit-style when invoked directly via `tsx`. When this
// module is imported (e.g. from server startup), exports are consumed and the
// CLI runner does not fire.
const isDirectCli = (() => {
  try {
    const invoked = process.argv[1] ?? "";
    return invoked.endsWith("006-seed-demo-operational.ts") ||
           invoked.endsWith("006-seed-demo-operational.js");
  } catch {
    return false;
  }
})();

if (isDirectCli) {
  runCli().catch((err) => {
    console.error("Demo seed failed:", err);
    process.exit(1);
  });
}
