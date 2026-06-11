/**
 * Regression guard for the planning lead-time timezone bug.
 *
 * Background: the "Create Derived Session Plan" dialog submits the picked date
 * as a UTC calendar date (`YYYY-MM-DDT00:00:00.000Z`) and defaults to UTC
 * today + 7. The server's `validatePlanningLeadTimeAndNoConflict` enforces a
 * ">= 7 days in advance" rule. It MUST do that arithmetic in UTC.
 *
 * If the server ever reverts to local/server-time calendar math
 * (`getFullYear()/getMonth()/getDate()` on a UTC-midnight timestamp), a server
 * running in any negative-offset timezone reads that UTC midnight as the
 * *previous* calendar day's evening, shifting the input back a day. The valid
 * `today + 7` default then computes as 6 days out and is wrongly rejected with
 * "must be scheduled at least 7 days in advance" — a timezone gap that blocks
 * legitimate users. This test runs the validator under several simulated server
 * timezones (positive- and negative-offset) and proves:
 *
 *   1. The default (UTC today + 7) is never rejected for lead time.
 *   2. UTC today + 6 IS rejected for lead time (the rule still bites).
 *   3. Two different community sessions from the same facility on the same day
 *      are NOT flagged as a conflict (correct: teams can serve different villages
 *      on the same calendar day).
 *   4. Two day-plan entries WITHIN THE SAME session that share the same
 *      sessionDate ARE flagged as a conflict.
 *
 * Requires a Postgres test DB with at least one tenant + facility seeded
 * (TEST_DATABASE_URL or DATABASE_URL).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { db, pool } from "../db";
import { validatePlanningLeadTimeAndNoConflict } from "../routes";
import { tenants, facilities, microplans, sessionPlans, sessionDayPlans } from "@shared/schema";

const LEAD_TIME_MSG = /at least 7 days in advance/i;

// Format a Date as a UTC calendar day string, then build the exact payload the
// client sends: UTC midnight of that day.
function utcDayOffset(days: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
}

let tenantId: string;
let facilityId: number;
let microplanId: number;
const originalTz = process.env.TZ;

// A day far enough out (> 7 days) for the day-plan duplicate test.
const DAY_CONFLICT_OFFSET_DAYS = 52;
const dayConflictDateStr = utcDayOffset(DAY_CONFLICT_OFFSET_DAYS);
const dayConflictMidnight = new Date(dayConflictDateStr);
// Parent session date kept well clear of the day-plan conflict date.
const DAY_PARENT_OFFSET_DAYS = 60;
const dayParentMidnight = new Date(utcDayOffset(DAY_PARENT_OFFSET_DAYS));

beforeAll(async () => {
  // Pin to PNG if present (local-dev seed), else any active tenant.
  const [png] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.code, "PNG"))
    .limit(1);
  if (png) {
    tenantId = png.id;
  } else {
    const [any] = await db.select({ id: tenants.id }).from(tenants).limit(1);
    if (!any) {
      throw new Error(
        "No tenants in test DB. Run the country bootstrap seeds before running this test.",
      );
    }
    tenantId = any.id;
  }

  const [fac] = await db
    .select({ id: facilities.id })
    .from(facilities)
    .where(eq(facilities.tenantId, tenantId))
    .limit(1);
  if (!fac) {
    throw new Error(
      `No facility for tenant ${tenantId} in test DB. Run the country bootstrap seeds first.`,
    );
  }
  facilityId = fac.id;

  // A dedicated parent microplan so the conflict session is fully self-contained
  // and cleaned up afterwards (no mutation of seed rows).
  const [mp] = await db
    .insert(microplans)
    .values({
      tenantId,
      facilityId,
      name: "TZ lead-time regression microplan",
      planType: "facility_routine",
      year: new Date().getUTCFullYear(),
      quarter: 1,
    } as any)
    .returning({ id: microplans.id });
  microplanId = mp.id;
});

afterAll(async () => {
  process.env.TZ = originalTz;
  try {
    if (microplanId) {
      // session_plans FK has onDelete cascade from microplans; delete plan rows
      // explicitly first to be safe, then the microplan.
      await db
        .delete(sessionPlans)
        .where(eq(sessionPlans.microplanId, microplanId))
        .catch(() => {});
      await db.delete(microplans).where(eq(microplans.id, microplanId)).catch(() => {});
    }
  } finally {
    await pool.end().catch(() => {});
  }
});

describe("planning lead-time is timezone-robust (UTC calendar-day arithmetic)", () => {
  // Negative-offset (UTC-...) zones are where the bug bit: UTC midnight reads as
  // the previous local day. Positive-offset zones are the mirror case.
  const SERVER_TIMEZONES = [
    "UTC",
    "America/New_York", // negative offset (UTC-4/-5)
    "America/Los_Angeles", // larger negative offset (UTC-7/-8)
    "Pacific/Kiritimati", // large positive offset (UTC+14)
    "Asia/Kolkata", // positive, half-hour offset (UTC+5:30)
  ] as const;

  for (const tz of SERVER_TIMEZONES) {
    describe(`server timezone ${tz}`, () => {
      it("accepts the default UTC today + 7 (never rejected for lead time)", async () => {
        process.env.TZ = tz;
        const result = await validatePlanningLeadTimeAndNoConflict(
          tenantId,
          facilityId,
          utcDayOffset(7),
        );
        // The default date must pass the >= 7 day rule. A conflict (different
        // failure) would be a test-data problem, so assert specifically that it
        // is NOT the lead-time rejection.
        expect(
          result.message ?? "",
          `Default UTC today+7 was rejected for lead time under TZ=${tz}. ` +
            `This is the timezone gap the test guards: the server is doing ` +
            `local-time calendar math on a UTC-midnight date and shifting it ` +
            `back a day. message=${result.message}`,
        ).not.toMatch(LEAD_TIME_MSG);
      });

      it("rejects UTC today + 6 for lead time", async () => {
        process.env.TZ = tz;
        const result = await validatePlanningLeadTimeAndNoConflict(
          tenantId,
          facilityId,
          utcDayOffset(6),
        );
        expect(result.isValid).toBe(false);
        expect(
          result.message,
          `UTC today+6 should fail the >= 7 day rule under TZ=${tz}. ` +
            `message=${result.message}`,
        ).toMatch(LEAD_TIME_MSG);
      });

      it("does NOT block a second session at the same facility on the same day (different community)", async () => {
        // Two separate community/outreach sessions from the same facility on the
        // same calendar day is a VALID scenario (one team to Village A, another
        // to Village B). The validator must not block this.
        process.env.TZ = tz;

        // Seed a first session on a future date.
        const futureDate = new Date(utcDayOffset(45));
        await db.insert(sessionPlans).values({
          tenantId,
          facilityId,
          microplanId,
          name: "Village A outreach session",
          sessionType: "mobile",
          quarter: 1,
          year: futureDate.getUTCFullYear(),
          scheduledDate: futureDate,
        } as any);

        // A second session on the SAME day must be accepted.
        const result = await validatePlanningLeadTimeAndNoConflict(
          tenantId,
          facilityId,
          utcDayOffset(45),
        );
        expect(
          result.isValid,
          `Scheduling a second community session at the same facility on the ` +
            `same day must NOT be blocked (TZ=${tz}). Different sessions serve ` +
            `different communities. message=${result.message}`,
        ).toBe(true);
      });
    });
  }
});

// The same validator backs the multi-day itinerary / session-day-plan endpoints
// (POST /api/sessions/:sessionId/days, PATCH /api/sessions/days/:id), which
// submit a per-day `sessionDate`. That conflict branch matches against the
// `session_day_plans.session_date` `timestamp` column. Within the SAME session
// itinerary, two day-plan rows must not share the same sessionDate.
describe("itinerary day-plan conflict is timezone-robust (sessionDayPlans.sessionDate)", () => {
  const SERVER_TIMEZONES = [
    "UTC",
    "America/New_York", // negative offset (UTC-4/-5)
    "America/Los_Angeles", // larger negative offset (UTC-7/-8)
    "Pacific/Kiritimati", // large positive offset (UTC+14)
    "Asia/Kolkata", // positive, half-hour offset (UTC+5:30)
  ] as const;

  let parentSessionId: number;
  let existingDayPlanId: number;

  beforeAll(async () => {
    // A parent session on a DIFFERENT day so the lead-time check passes and the
    // day-plan conflict branch is the thing under test. Insert under UTC so the
    // stored timestamp lands on the intended UTC calendar day.
    const prevTz = process.env.TZ;
    process.env.TZ = "UTC";
    try {
      const [parent] = await db
        .insert(sessionPlans)
        .values({
          tenantId,
          facilityId,
          microplanId,
          name: "TZ regression day-plan parent session",
          sessionType: "mobile",
          quarter: 1,
          year: dayParentMidnight.getUTCFullYear(),
          scheduledDate: dayParentMidnight,
        } as any)
        .returning({ id: sessionPlans.id });

      parentSessionId = parent.id;

      // Seed one itinerary day (Day 1) on the dedicated day-plan conflict date.
      const [dayPlan] = await db.insert(sessionDayPlans).values({
        tenantId,
        sessionPlanId: parent.id,
        dayNumber: 1,
        sessionDate: dayConflictMidnight,
        communitiesVisited: [],
        targetPopulation: 50,
      } as any).returning({ id: sessionDayPlans.id });

      existingDayPlanId = dayPlan.id;
    } finally {
      process.env.TZ = prevTz;
    }
  });

  for (const tz of SERVER_TIMEZONES) {
    it(`flags a same-UTC-day itinerary day conflict WITHIN the same session under TZ=${tz}`, async () => {
      process.env.TZ = tz;
      // Simulate editing a DIFFERENT day-plan row (excludeDayPlanId set) so
      // the validator looks for sibling conflicts within the parent session.
      // We pass a fictional ID that doesn't exist; the validator will still
      // look up the parent via excludeDayPlanId from the seeded row. To
      // properly exercise the branch we need a second day-plan to conflict
      // against: pass the existing row's ID as excludeDayPlanId so the query
      // finds the seeded Day 1 as the conflicting sibling.
      //
      // Simpler: seed a second day-plan row, then use ITS id as excludeDayPlanId
      // and set sessionDate = dayConflictMidnight (same as Day 1).
      const [secondDay] = await db.insert(sessionDayPlans).values({
        tenantId,
        sessionPlanId: parentSessionId,
        dayNumber: 2,
        sessionDate: new Date(utcDayOffset(DAY_PARENT_OFFSET_DAYS + 1)), // a different date initially
        communitiesVisited: [],
        targetPopulation: 30,
      } as any).returning({ id: sessionDayPlans.id });

      // Now try to reschedule Day 2 to the same date as Day 1 — should conflict.
      const result = await validatePlanningLeadTimeAndNoConflict(
        tenantId,
        facilityId,
        dayConflictDateStr,
        undefined,
        secondDay.id, // excludeDayPlanId = Day 2 being edited
      );

      // Clean up the temporary second day-plan.
      await db.delete(sessionDayPlans).where(eq(sessionDayPlans.id, secondDay.id)).catch(() => {});

      expect(
        result.isValid,
        `Day 2 of an itinerary must not be rescheduled to the same date as Day 1 ` +
          `(TZ=${tz}). message=${result.message}`,
      ).toBe(false);
      expect(result.message).toMatch(/itinerary/i);
    });
  }
});
