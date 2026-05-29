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
 *   3. A same-day double-booking is detected on the intended UTC calendar day.
 *
 * Requires a Postgres test DB with at least one tenant + facility seeded
 * (TEST_DATABASE_URL or DATABASE_URL).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { db, pool } from "../db";
import { validatePlanningLeadTimeAndNoConflict } from "../routes";
import { tenants, facilities, microplans, sessionPlans } from "@shared/schema";

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

// Conflict day chosen far enough out (and on an unusual day) that it cannot
// collide with seed data; well past the 7-day lead-time floor.
const CONFLICT_OFFSET_DAYS = 45;
const conflictDateStr = utcDayOffset(CONFLICT_OFFSET_DAYS);
const conflictMidnight = new Date(conflictDateStr);

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
    });
  }

  it("detects a same-day double booking on the intended UTC calendar day", async () => {
    // Run the conflict check under UTC so the inserted timestamp and the query
    // parameter serialize identically against the `timestamp` column.
    process.env.TZ = "UTC";

    // Seed a session on the conflict day (>= 7 days out so lead time passes and
    // the conflict branch is the thing under test).
    await db.insert(sessionPlans).values({
      tenantId,
      facilityId,
      microplanId,
      name: "TZ regression existing session",
      sessionType: "static",
      quarter: 1,
      year: conflictMidnight.getUTCFullYear(),
      scheduledDate: conflictMidnight,
    } as any);

    const result = await validatePlanningLeadTimeAndNoConflict(
      tenantId,
      facilityId,
      conflictDateStr,
    );
    expect(
      result.isValid,
      `A second session on the same UTC calendar day for the same facility ` +
        `must be flagged as a conflict. message=${result.message}`,
    ).toBe(false);
    expect(result.message).toMatch(/Conflict/i);
  });
});
