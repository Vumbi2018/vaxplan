/**
 * scheduler.ts — Midnight-first cron scheduler
 *
 * Provides a lightweight, pure-Node scheduler that fires jobs at
 * midnight UTC (00:00) instead of on fixed setInterval ticks from boot.
 *
 * Why midnight?
 *   Heavy-duty jobs (population raster ingestion, session archiving, digest
 *   emails) cause significant DB and CPU load. Running them at a predictable
 *   low-traffic time (midnight UTC) avoids degrading interactive performance
 *   during peak working hours.
 *
 * Usage:
 *   scheduleAtMidnight("my-job", runFn, { dayOfWeek: 1 }) // Mondays only
 *   scheduleAtMidnight("my-job", runFn)                   // every night
 *
 * The scheduler:
 *   - Computes the exact ms until next midnight UTC before sleeping — no drift.
 *   - Respects an optional dayOfWeek filter (0 = Sunday … 6 = Saturday).
 *   - Never fires within the first 60 seconds of server startup (so a crash-
 *     loop doesn't hammer the DB on every restart).
 *   - Tracks lastRunDateKey per job so the job won't double-fire if the server
 *     restarts right after midnight.
 *   - All errors are caught and logged; they never crash the scheduler.
 */

const STARTUP_GUARD_MS = 60_000; // never fire within 1 min of startup
const startupTime = Date.now();

export type MidnightJobFn = () => Promise<void> | void;

export interface MidnightJobOptions {
  /**
   * 0 = Sunday, 1 = Monday … 6 = Saturday. When set, the job only fires on
   * that day of the week (UTC). Omit (or pass undefined) to fire every night.
   */
  dayOfWeek?: number;
  /**
   * Offset from midnight, in minutes. Useful to stagger multiple jobs and
   * avoid a thundering-herd at exactly 00:00.
   * Default: 0 (fires at 00:00 UTC exactly).
   */
  offsetMinutes?: number;
}

type JobEntry = {
  name: string;
  fn: MidnightJobFn;
  opts: MidnightJobOptions;
  lastRunDateKey: string | null;
  timer: NodeJS.Timeout | null;
};

const jobs = new Map<string, JobEntry>();

/**
 * Returns the number of milliseconds until the next occurrence of
 * midnight UTC (00:00 + offsetMinutes).
 */
function msUntilNextMidnight(offsetMinutes = 0): number {
  const now = Date.now();
  const offsetMs = (offsetMinutes || 0) * 60_000;
  const d = new Date(now);
  // Next midnight UTC = start of next UTC day
  const nextMidnight = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() + 1, // always tomorrow's midnight
    0, 0, 0, 0,
  ) + offsetMs;
  return Math.max(1000, nextMidnight - now);
}

function dateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

function armTimer(entry: JobEntry): void {
  const ms = msUntilNextMidnight(entry.opts.offsetMinutes);
  const hoursUntil = (ms / 3_600_000).toFixed(1);
  console.log(`[scheduler] "${entry.name}" scheduled — fires in ${hoursUntil}h at next midnight UTC`);

  entry.timer = setTimeout(() => {
    entry.timer = null;
    fireTick(entry);
  }, ms);
}

function fireTick(entry: JobEntry): void {
  const now = new Date();

  // Startup guard: if the server just started, skip and re-arm for tomorrow.
  if (Date.now() - startupTime < STARTUP_GUARD_MS) {
    console.log(`[scheduler] "${entry.name}" skipped (startup guard), re-arming for tomorrow`);
    armTimer(entry);
    return;
  }

  // Day-of-week filter.
  if (entry.opts.dayOfWeek !== undefined && now.getUTCDay() !== entry.opts.dayOfWeek) {
    armTimer(entry);
    return;
  }

  // Idempotency: skip if we already ran today.
  const key = dateKey(now);
  if (entry.lastRunDateKey === key) {
    console.log(`[scheduler] "${entry.name}" already ran today (${key}), re-arming for tomorrow`);
    armTimer(entry);
    return;
  }

  entry.lastRunDateKey = key;
  console.log(`[scheduler] "${entry.name}" firing at ${now.toISOString()}`);

  Promise.resolve()
    .then(() => entry.fn())
    .catch((err) => {
      console.error(`[scheduler] "${entry.name}" threw:`, err?.message ?? err);
    })
    .finally(() => {
      // Always re-arm for tomorrow after the job completes (or fails).
      armTimer(entry);
    });
}

/**
 * Schedule a job to run once per night at midnight UTC.
 *
 * @param name        Unique job identifier (used in logs).
 * @param fn          Async function to execute.
 * @param opts        Optional dayOfWeek + offsetMinutes constraints.
 * @returns           A cancel function.
 */
export function scheduleAtMidnight(
  name: string,
  fn: MidnightJobFn,
  opts: MidnightJobOptions = {},
): () => void {
  if (jobs.has(name)) {
    console.warn(`[scheduler] "${name}" is already registered — ignoring duplicate call`);
    return () => cancelMidnightJob(name);
  }

  const entry: JobEntry = { name, fn, opts, lastRunDateKey: null, timer: null };
  jobs.set(name, entry);
  armTimer(entry);

  return () => cancelMidnightJob(name);
}

/**
 * Cancel a registered job and clear its pending timer.
 */
export function cancelMidnightJob(name: string): void {
  const entry = jobs.get(name);
  if (!entry) return;
  if (entry.timer) {
    clearTimeout(entry.timer);
    entry.timer = null;
  }
  jobs.delete(name);
  console.log(`[scheduler] "${name}" cancelled`);
}

/**
 * Cancel all registered jobs (useful for clean shutdown / testing).
 */
export function cancelAllMidnightJobs(): void {
  for (const name of Array.from(jobs.keys())) {
    cancelMidnightJob(name);
  }
}
