import { readFileSync } from "fs";
import { join } from "path";
import { and, eq, inArray } from "drizzle-orm";
import { db, pool } from "../db";
import { sendEmail } from "../services/mailer";
import {
  tenants,
  users,
  facilities,
  districts,
  supervisionVisits,
  type Tenant,
  type User,
  type SupervisionVisit,
} from "@shared/schema";

// Roles that receive the weekly digest. National admins get it tenant-wide
// so they can see the long tail of overdue facilities across districts.
const DIGEST_ROLES = new Set([
  "district_manager",
  "provincial_coordinator",
  "national_admin",
]);

const OVERDUE_DAYS = 90;
const LOW_SCORE_PCT = 60;

let migrationPromise: Promise<void> | null = null;

/**
 * Idempotently apply the `users.notification_prefs` column the first time the
 * digest module is used so opt-out works in environments without a wired-up
 * migration runner (mirrors the population-refresh approach).
 */
export async function ensureSupervisionDigestMigration(): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = (async () => {
      const sqlPath = join(
        process.cwd(),
        "server",
        "migrations",
        "009-user-notification-prefs.sql",
      );
      const sqlText = readFileSync(sqlPath, "utf8");
      const client = await pool.connect();
      try {
        await client.query(sqlText);
      } finally {
        client.release();
      }
    })().catch((err) => {
      migrationPromise = null;
      throw err;
    });
  }
  return migrationPromise;
}

export type OverdueFacility = {
  facilityId: number;
  facilityName: string;
  districtId: number | null;
  provinceId: number | null;
  lastVisitDate: string | null;
  lastScore: number | null;
  daysSinceLast: number | null;
  reason: "never_visited" | "stale_visit" | "low_score";
};

type FacilityRow = {
  id: number;
  name: string;
  districtId: number;
  provinceId: number | null;
};

/**
 * Returns the list of facilities that match the "red band" rules used on
 * /supervision (no visit ever, last visit > 90 days ago, or last score < 60%).
 * Scoping rules:
 *   - explicit facility/district/province lists narrow the set
 *   - an empty scope means "tenant-wide" (national_admin behaviour)
 */
export async function computeOverdueFacilities(
  tenantId: string,
  scope: {
    facilityIds?: number[];
    districtIds?: number[];
    provinceIds?: number[];
  } = {},
  now: Date = new Date(),
): Promise<OverdueFacility[]> {
  const distRows = await db
    .select({ id: districts.id, provinceId: districts.provinceId })
    .from(districts)
    .where(eq(districts.tenantId, tenantId));
  const distProvince = new Map<number, number | null>(
    distRows.map((d) => [d.id, d.provinceId ?? null]),
  );

  const facRows = await db
    .select({
      id: facilities.id,
      name: facilities.name,
      districtId: facilities.districtId,
    })
    .from(facilities)
    .where(eq(facilities.tenantId, tenantId));

  const enriched: FacilityRow[] = facRows.map((f) => ({
    id: f.id,
    name: f.name,
    districtId: f.districtId,
    provinceId: distProvince.get(f.districtId) ?? null,
  }));

  const facilityIdSet = scope.facilityIds?.length ? new Set(scope.facilityIds) : null;
  const districtIdSet = scope.districtIds?.length ? new Set(scope.districtIds) : null;
  const provinceIdSet = scope.provinceIds?.length ? new Set(scope.provinceIds) : null;

  const inScope = (f: FacilityRow): boolean => {
    if (facilityIdSet && !facilityIdSet.has(f.id)) return false;
    if (districtIdSet && !districtIdSet.has(f.districtId)) return false;
    if (provinceIdSet && (f.provinceId == null || !provinceIdSet.has(f.provinceId))) return false;
    return true;
  };

  const scoped = enriched.filter(inScope);
  if (scoped.length === 0) return [];

  const scopedIds = scoped.map((f) => f.id);

  // Pull *all* conducted visits in scope so we can pick the most recent per
  // facility. The list is bounded by # facilities × visits/facility, which is
  // small in practice and avoids N+1 subqueries.
  const visits: Pick<
    SupervisionVisit,
    "facilityId" | "conductedDate" | "scheduledDate" | "score" | "status"
  >[] = await db
    .select({
      facilityId: supervisionVisits.facilityId,
      conductedDate: supervisionVisits.conductedDate,
      scheduledDate: supervisionVisits.scheduledDate,
      score: supervisionVisits.score,
      status: supervisionVisits.status,
    })
    .from(supervisionVisits)
    .where(
      and(
        eq(supervisionVisits.tenantId, tenantId),
        eq(supervisionVisits.status, "conducted"),
        inArray(supervisionVisits.facilityId, scopedIds),
      ),
    );

  const lastByFac = new Map<number, { date: Date; score: number | null }>();
  for (const v of visits) {
    const d = (v.conductedDate ?? v.scheduledDate) as Date | null;
    if (!d) continue;
    const existing = lastByFac.get(v.facilityId);
    if (!existing || d.getTime() > existing.date.getTime()) {
      lastByFac.set(v.facilityId, { date: d, score: v.score ?? null });
    }
  }

  const out: OverdueFacility[] = [];
  for (const f of scoped) {
    const last = lastByFac.get(f.id);
    if (!last) {
      out.push({
        facilityId: f.id,
        facilityName: f.name,
        districtId: f.districtId,
        provinceId: f.provinceId,
        lastVisitDate: null,
        lastScore: null,
        daysSinceLast: null,
        reason: "never_visited",
      });
      continue;
    }
    const daysSinceLast = Math.floor((now.getTime() - last.date.getTime()) / 86_400_000);
    const stale = daysSinceLast > OVERDUE_DAYS;
    const lowScore = last.score !== null && last.score < LOW_SCORE_PCT;
    if (stale || lowScore) {
      out.push({
        facilityId: f.id,
        facilityName: f.name,
        districtId: f.districtId,
        provinceId: f.provinceId,
        lastVisitDate: last.date.toISOString(),
        lastScore: last.score,
        daysSinceLast,
        reason: stale ? "stale_visit" : "low_score",
      });
    }
  }

  // Sort: never-visited first, then longest-overdue first.
  out.sort((a, b) => {
    const aDays = a.daysSinceLast ?? Number.MAX_SAFE_INTEGER;
    const bDays = b.daysSinceLast ?? Number.MAX_SAFE_INTEGER;
    return bDays - aDays;
  });
  return out;
}

function appBaseUrl(): string {
  return (
    process.env.APP_BASE_URL ||
    (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "") ||
    ""
  );
}

export function renderDigestText(
  recipient: User,
  tenant: Tenant,
  overdue: OverdueFacility[],
  now: Date = new Date(),
): { subject: string; body: string; deepLink: string } {
  const base = appBaseUrl();
  const deepLink = base ? `${base}/supervision` : "/supervision";
  const greetingName = recipient.firstName?.trim() || recipient.email || "Manager";
  const dateLabel = now.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (overdue.length === 0) {
    return {
      subject: `[${tenant.name}] Supervision: no overdue facilities this week`,
      body: [
        `Hello ${greetingName},`,
        ``,
        `Weekly supervision digest — ${dateLabel}.`,
        ``,
        `Good news: no facilities in your scope are overdue for a supervisory visit.`,
        ``,
        `Open the supervision heatmap: ${deepLink}`,
        ``,
        `— VaxPlan`,
      ].join("\n"),
      deepLink,
    };
  }

  const lines = overdue.map((f, i) => {
    const last = f.lastVisitDate
      ? new Date(f.lastVisitDate).toLocaleDateString()
      : "never";
    const score = f.lastScore != null ? `${f.lastScore}%` : "n/a";
    const days = f.daysSinceLast != null ? `${f.daysSinceLast}d ago` : "no visit on record";
    const why =
      f.reason === "never_visited"
        ? "no visit recorded"
        : f.reason === "low_score"
          ? `last score ${score} below ${LOW_SCORE_PCT}%`
          : `last visit ${days} (> ${OVERDUE_DAYS}d)`;
    return `${i + 1}. ${f.facilityName} — last visit: ${last}, last score: ${score} (${why})`;
  });

  return {
    subject: `[${tenant.name}] Supervision digest: ${overdue.length} facility(ies) overdue`,
    body: [
      `Hello ${greetingName},`,
      ``,
      `Weekly supervision digest — ${dateLabel}.`,
      ``,
      `The following ${overdue.length} facility(ies) in your scope are overdue for a supervisory visit (no visit in the last ${OVERDUE_DAYS} days, or last score below ${LOW_SCORE_PCT}%):`,
      ``,
      ...lines,
      ``,
      `Schedule the next visits here: ${deepLink}`,
      ``,
      `You can opt out of this digest from Settings → Notifications.`,
      ``,
      `— VaxPlan`,
    ].join("\n"),
    deepLink,
  };
}

export type DigestSendResult = {
  tenantId: string;
  tenantName: string;
  recipients: number;
  delivered: number;
  skippedOptOut: number;
  skippedNoEmail: number;
  totalOverdue: number;
  errors: string[];
};

/**
 * Resolve a recipient's digest scope from their user row, ROLE-CAPPED exactly
 * like `resolveRoleScopeIds` in server/routes.ts so the email can never show a
 * facility the user couldn't see in-app:
 *   - facility_clerk / facility_in_charge → their own facility only. Their
 *     legacy districtId/provinceId columns hold the facility's hierarchy *path*
 *     (not an access grant), so we deliberately ignore them — otherwise a clerk
 *     would receive overdue alerts for their whole district/province.
 *   - district_manager → their district(s) (+ any explicit facility grants).
 *   - provincial_coordinator → their province(s) (+ explicit district/facility).
 *   - national_admin / gis_specialist → tenant-wide.
 *   - any other role → legacy precedence (explicit multi-scope, else the most
 *     specific legacy column).
 *
 * `isScopedRole` marks the four hierarchical roles, which must fail CLOSED when
 * no area resolves (empty scope would otherwise be read as tenant-wide by
 * computeOverdueFacilities). `hasAny` reports whether any concrete grant exists.
 */
export function resolveUserScope(user: User): {
  facilityIds: number[];
  districtIds: number[];
  provinceIds: number[];
  isNational: boolean;
  isScopedRole: boolean;
  hasAny: boolean;
} {
  const scope = (user.dataAccessScope ?? {}) as {
    provinces?: number[];
    districts?: number[];
    facilities?: number[];
  };
  const sFac = Array.isArray(scope.facilities) ? scope.facilities.map(Number) : [];
  const sDist = Array.isArray(scope.districts) ? scope.districts.map(Number) : [];
  const sProv = Array.isArray(scope.provinces) ? scope.provinces.map(Number) : [];

  const roleList: string[] = [
    user.role,
    ...(Array.isArray(user.roles) ? (user.roles as string[]) : []),
  ].filter(Boolean) as string[];
  const has = (r: string) => roleList.includes(r);

  const isNational = has("national_admin") || has("gis_specialist");
  if (isNational) {
    return {
      facilityIds: [],
      districtIds: [],
      provinceIds: [],
      isNational: true,
      isScopedRole: false,
      hasAny: false,
    };
  }

  let provinceIds: number[] = [];
  let districtIds: number[] = [];
  let facilityIds: number[] = [];
  let isScopedRole = false;

  if (has("provincial_coordinator")) {
    isScopedRole = true;
    provinceIds = sProv.length ? sProv : user.provinceId ? [Number(user.provinceId)] : [];
    districtIds = sDist;
    facilityIds = sFac;
  } else if (has("district_manager")) {
    isScopedRole = true;
    districtIds = sDist.length ? sDist : user.districtId ? [Number(user.districtId)] : [];
    facilityIds = sFac; // honour any extra cross-district facility grants
  } else if (has("facility_clerk") || has("facility_in_charge")) {
    isScopedRole = true;
    facilityIds = sFac.length ? sFac : user.facilityId ? [Number(user.facilityId)] : [];
  } else {
    // Unknown / custom role: legacy precedence — explicit multi-scope union,
    // else the most-specific legacy column. Not a scoped role, so an empty
    // result means tenant-wide.
    if (sFac.length || sDist.length || sProv.length) {
      provinceIds = sProv;
      districtIds = sDist;
      facilityIds = sFac;
    } else if (user.facilityId) {
      facilityIds = [Number(user.facilityId)];
    } else if (user.districtId) {
      districtIds = [Number(user.districtId)];
    } else if (user.provinceId) {
      provinceIds = [Number(user.provinceId)];
    }
  }

  const dedupe = (xs: number[]): number[] => Array.from(new Set<number>(xs));
  const hasAny =
    provinceIds.length > 0 || districtIds.length > 0 || facilityIds.length > 0;
  return {
    facilityIds: dedupe(facilityIds),
    districtIds: dedupe(districtIds),
    provinceIds: dedupe(provinceIds),
    isNational: false,
    isScopedRole,
    hasAny,
  };
}

function isOptedIn(user: User): boolean {
  const prefs = (user.notificationPrefs ?? {}) as Record<string, unknown>;
  // Default is opt-in: only an explicit false suppresses delivery.
  return prefs.supervisionDigest !== false;
}

export async function runSupervisionDigestForTenant(
  tenantId: string,
  options: { dryRun?: boolean; now?: Date } = {},
): Promise<DigestSendResult> {
  await ensureSupervisionDigestMigration();
  const now = options.now ?? new Date();
  const dryRun = options.dryRun ?? false;

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  if (!tenant) {
    return {
      tenantId,
      tenantName: "(unknown)",
      recipients: 0,
      delivered: 0,
      skippedOptOut: 0,
      skippedNoEmail: 0,
      totalOverdue: 0,
      errors: [`tenant ${tenantId} not found`],
    };
  }

  const tenantUsers = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)));

  const recipients = tenantUsers.filter((u) => {
    const roles = [u.role, ...((Array.isArray(u.roles) ? u.roles : []) as string[])];
    return roles.some((r) => DIGEST_ROLES.has(r));
  });

  const errors: string[] = [];
  let delivered = 0;
  let skippedOptOut = 0;
  let skippedNoEmail = 0;
  let totalOverdue = 0;

  for (const recipient of recipients) {
    if (!isOptedIn(recipient)) {
      skippedOptOut++;
      continue;
    }
    if (!recipient.email) {
      skippedNoEmail++;
      continue;
    }
    try {
      const scope = resolveUserScope(recipient);
      // Fail CLOSED: a hierarchical role that resolves to no area must get an
      // empty list, never the tenant-wide fallback that an empty scope object
      // would trigger inside computeOverdueFacilities.
      const overdue =
        scope.isScopedRole && !scope.hasAny
          ? []
          : await computeOverdueFacilities(
              tenantId,
              scope.isNational ? {} : scope,
              now,
            );
      totalOverdue += overdue.length;
      // Skip "all clear" emails to district/provincial managers — they don't
      // need a no-op message every week. National admins still get the
      // confirmation so they know the digest ran.
      if (overdue.length === 0 && !scope.isNational) continue;
      const { subject, body } = renderDigestText(recipient, tenant, overdue, now);
      if (dryRun) {
        delivered++;
        continue;
      }
      const result = await sendEmail({
        tenant,
        to: recipient.email,
        subject,
        text: body,
      });
      if (result.ok) {
        delivered++;
      } else {
        errors.push(`${recipient.email}: ${result.detail ?? "delivery failed"}`);
      }
      // Persist an audit-log entry so the digest is queryable later.
      try {
        await pool.query(
          `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, new_value)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
          [
            tenantId,
            recipient.id,
            "supervision_digest_sent",
            "user",
            null,
            JSON.stringify({
              email: recipient.email,
              overdueCount: overdue.length,
              channel: result.channel,
              ok: result.ok,
              sentAt: now.toISOString(),
            }),
          ],
        );
      } catch (auditErr: any) {
        console.error("[supervision-digest] audit log failed:", auditErr?.message ?? auditErr);
      }
    } catch (err: any) {
      errors.push(`${recipient.email ?? recipient.id}: ${err?.message ?? String(err)}`);
    }
  }

  return {
    tenantId,
    tenantName: tenant.name,
    recipients: recipients.length,
    delivered,
    skippedOptOut,
    skippedNoEmail,
    totalOverdue,
    errors,
  };
}

export async function runSupervisionDigest(options: { dryRun?: boolean; now?: Date } = {}): Promise<
  DigestSendResult[]
> {
  await ensureSupervisionDigestMigration();
  const active = await db.select().from(tenants).where(eq(tenants.status, "active"));
  const results: DigestSendResult[] = [];
  for (const t of active) {
    try {
      results.push(await runSupervisionDigestForTenant(t.id, options));
    } catch (err: any) {
      results.push({
        tenantId: t.id,
        tenantName: t.name,
        recipients: 0,
        delivered: 0,
        skippedOptOut: 0,
        skippedNoEmail: 0,
        totalOverdue: 0,
        errors: [err?.message ?? String(err)],
      });
    }
  }
  const totals = results.reduce(
    (acc, r) => {
      acc.delivered += r.delivered;
      acc.overdue += r.totalOverdue;
      acc.errors += r.errors.length;
      return acc;
    },
    { delivered: 0, overdue: 0, errors: 0 },
  );
  console.log(
    `[supervision-digest] cycle done — tenants=${results.length} delivered=${totals.delivered} overdueFacilities=${totals.overdue} errors=${totals.errors}`,
  );
  return results;
}

let schedulerHandle: NodeJS.Timeout | null = null;
let lastRunDayKey: string | null = null;

function dayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

function shouldRunNow(now: Date): boolean {
  // Monday in UTC. Configurable hour via SUPERVISION_DIGEST_HOUR_UTC (default 7).
  const targetHour = parseInt(process.env.SUPERVISION_DIGEST_HOUR_UTC || "7", 10);
  if (now.getUTCDay() !== 1) return false;
  if (now.getUTCHours() < targetHour) return false;
  return lastRunDayKey !== dayKey(now);
}

/**
 * Polls every hour and fires the digest once on Monday after the configured
 * hour (UTC). Set SUPERVISION_DIGEST_INTERVAL_MINUTES=0 to disable, or set it
 * to a small value in tests to force a faster cadence.
 */
export function startSupervisionDigestScheduler(): void {
  if (schedulerHandle) return;
  const raw = process.env.SUPERVISION_DIGEST_INTERVAL_MINUTES;
  const minutes = raw ? parseFloat(raw) : 60;
  if (!Number.isFinite(minutes) || minutes <= 0) {
    console.log("[supervision-digest] scheduler disabled (SUPERVISION_DIGEST_INTERVAL_MINUTES <= 0)");
    return;
  }
  const intervalMs = Math.max(60_000, Math.round(minutes * 60_000));
  console.log(
    `[supervision-digest] scheduler enabled — polling every ${minutes}m, firing weekly on Mondays`,
  );

  const tick = () => {
    const now = new Date();
    if (!shouldRunNow(now)) return;
    lastRunDayKey = dayKey(now);
    runSupervisionDigest({ now }).catch((err) => {
      console.error("[supervision-digest] weekly run threw:", err);
    });
  };

  setTimeout(tick, 45_000);
  schedulerHandle = setInterval(tick, intervalMs);
}

export function stopSupervisionDigestScheduler(): void {
  if (schedulerHandle) {
    clearInterval(schedulerHandle);
    schedulerHandle = null;
    lastRunDayKey = null;
  }
}
