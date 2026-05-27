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
  targetPopulation: number;
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
    targetPopulation: 45,
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
    targetPopulation: 30,
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
    targetPopulation: 60,
    notes: "Draft mobile catch-up plan for unreached children.",
    daysFromNow: 21,
  },
];

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

async function seedVaccineRequirements(
  tenantId: string,
  picks: FacilityPick[],
  demographics: { under1: number; pregnant: number; schoolEntry: number },
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

  const catchmentPop = 5000; // Demo head count when real population_data is absent.
  let inserted = 0;
  for (const p of picks) {
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

async function seedSessionPlans(
  tenantId: string,
  picks: FacilityPick[],
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
    for (const tpl of SESSION_TEMPLATES) {
      const name = `${p.facilityName} — ${tpl.suffix} Q${QUARTER} ${YEAR}`;
      const key = `${p.facilityId}|${name}|${QUARTER}|${YEAR}`;
      if (existingKeys.has(key)) continue;
      const scheduled = new Date();
      scheduled.setUTCDate(scheduled.getUTCDate() + tpl.daysFromNow);
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
        targetPopulation: tpl.targetPopulation,
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
    const vr = await seedVaccineRequirements(tenant.id, picks, demographics);
    const sp = await seedSessionPlans(tenant.id, picks);
    console.log(
      `[${code}] picked ${picks.length} facilities • +${u} users • +${vr} vaccine requirements • +${sp} session plans`,
    );
  }

  const summary = await db.execute(sql`
    SELECT
      t.code,
      (SELECT COUNT(*) FROM users               u WHERE u.tenant_id = t.id) AS users,
      (SELECT COUNT(*) FROM vaccine_requirements v WHERE v.tenant_id = t.id) AS vaccine_requirements,
      (SELECT COUNT(*) FROM session_plans       s WHERE s.tenant_id = t.id) AS session_plans
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
