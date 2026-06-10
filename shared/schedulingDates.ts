/**
 * Single source of truth for scheduling-date math.
 *
 * Session / itinerary dates must clear the ">= N days in advance" lead-time rule
 * in every timezone. The picked day is treated as a UTC calendar date (the
 * date-input value is a YYYY-MM-DD string, which `new Date(...)` parses as UTC
 * midnight, and clients submit it as UTC midnight). The server enforces the rule
 * in UTC too, so all calendar-day arithmetic here uses `Date.UTC(...)` / `getUTC*`,
 * never local-time components. Using local-time math on a UTC-midnight date shifts
 * it back a day on negative-offset clients and wrongly rejects the valid default.
 *
 * This module must NOT import from server/.
 */

/** Default lead time: sessions must be scheduled at least this many days out. */
export const DEFAULT_LEAD_TIME_DAYS = 7;

/**
 * UTC "today" + `days`, as a Date pinned to UTC midnight.
 */
export function getMinScheduleDate(days: number = DEFAULT_LEAD_TIME_DAYS): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/**
 * Format a Date as a `YYYY-MM-DD` string using its UTC calendar components,
 * suitable for a date `<input>` value.
 */
export function toDateInputValue(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Convenience: the minimum schedulable date as a `YYYY-MM-DD` input value.
 */
export function getMinScheduleDateInputValue(
  days: number = DEFAULT_LEAD_TIME_DAYS,
): string {
  return toDateInputValue(getMinScheduleDate(days));
}

/**
 * Whether `value` (a date string or Date) is at least `days` UTC calendar days
 * out from UTC today. Returns false for unparseable input.
 */
export function isAtLeastDaysAhead(
  value: string | Date,
  days: number = DEFAULT_LEAD_TIME_DAYS,
): boolean {
  const selected = value instanceof Date ? value : new Date(value);
  if (isNaN(selected.getTime())) return false;
  const selectedMidnight = Date.UTC(
    selected.getUTCFullYear(),
    selected.getUTCMonth(),
    selected.getUTCDate(),
  );
  const now = new Date();
  const todayMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const diffDays = Math.round(
    (selectedMidnight - todayMidnight) / (1000 * 60 * 60 * 24),
  );
  return diffDays >= days;
}
