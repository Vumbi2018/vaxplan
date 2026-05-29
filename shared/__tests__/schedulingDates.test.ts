import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  DEFAULT_LEAD_TIME_DAYS,
  getMinScheduleDate,
  toDateInputValue,
  getMinScheduleDateInputValue,
  isAtLeastDaysAhead,
} from "../schedulingDates";

// These helpers are the single source of truth for the ">= N days in advance"
// lead-time rule. The danger they guard against is a timezone off-by-one: on a
// negative-offset client, local-time math on a UTC-midnight date shifts it back
// a day and wrongly rejects the valid default. We pin "now" to a UTC instant
// that is the previous local day in US timezones to prove the UTC math holds.
//
// 2026-01-15T02:00:00Z is 2026-01-14 21:00 in America/New_York (UTC-5), so any
// helper that reads local date components would compute the wrong calendar day.
const FIXED_NOW = new Date("2026-01-15T02:00:00.000Z");

describe("schedulingDates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults the lead time to 7 days", () => {
    expect(DEFAULT_LEAD_TIME_DAYS).toBe(7);
  });

  it("getMinScheduleDate returns UTC today + N at UTC midnight", () => {
    const d = getMinScheduleDate();
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(0); // January
    expect(d.getUTCDate()).toBe(22); // 15 + 7
    expect(d.getUTCHours()).toBe(0);
    expect(d.getUTCMinutes()).toBe(0);
    expect(d.getUTCSeconds()).toBe(0);
    expect(d.getUTCMilliseconds()).toBe(0);
  });

  it("getMinScheduleDate honors a custom lead time", () => {
    expect(getMinScheduleDate(10).getUTCDate()).toBe(25);
  });

  it("toDateInputValue formats UTC calendar components, zero-padded", () => {
    expect(toDateInputValue(new Date("2026-03-05T00:00:00.000Z"))).toBe(
      "2026-03-05",
    );
    // UTC midnight that is the previous local day in US zones must still format
    // to the UTC date, not the local one.
    expect(toDateInputValue(new Date("2026-03-05T00:00:00.000Z"))).toBe(
      "2026-03-05",
    );
  });

  it("getMinScheduleDateInputValue returns UTC today + 7 as YYYY-MM-DD", () => {
    expect(getMinScheduleDateInputValue()).toBe("2026-01-22");
  });

  it("accepts the default min date (today + 7) — never rejected for lead time", () => {
    expect(isAtLeastDaysAhead(getMinScheduleDateInputValue())).toBe(true);
  });

  it("rejects today + 6 (the rule still bites)", () => {
    expect(isAtLeastDaysAhead("2026-01-21")).toBe(false);
  });

  it("accepts dates well beyond the lead time", () => {
    expect(isAtLeastDaysAhead("2026-02-15")).toBe(true);
  });

  it("returns false for unparseable input", () => {
    expect(isAtLeastDaysAhead("not-a-date")).toBe(false);
  });

  it("honors a custom lead time in the check", () => {
    expect(isAtLeastDaysAhead("2026-01-18", 3)).toBe(true);
    expect(isAtLeastDaysAhead("2026-01-17", 3)).toBe(false);
  });
});
