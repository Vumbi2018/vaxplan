import { and, eq, lt, isNotNull, sql as dsql } from "drizzle-orm";
import { db } from "../db";
import { sessionPlans } from "@shared/schema";

const ARCHIVE_AFTER_DAYS = 30;

export async function runSessionArchive(): Promise<{ archived: number }> {
  const cutoff = new Date(Date.now() - ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000);
  const result = await db
    .update(sessionPlans)
    .set({ status: "archived", updatedAt: new Date() })
    .where(
      and(
        eq(sessionPlans.status, "completed"),
        isNotNull(sessionPlans.completedAt),
        lt(sessionPlans.completedAt, cutoff),
      ),
    )
    .returning({ id: sessionPlans.id });
  const archived = result.length;
  if (archived > 0) {
    console.log(`[session-archive] archived ${archived} completed session(s) older than ${ARCHIVE_AFTER_DAYS}d`);
  }
  return { archived };
}

let schedulerHandle: NodeJS.Timeout | null = null;

export function startSessionArchiveScheduler(): void {
  if (schedulerHandle) return;
  const raw = process.env.SESSION_ARCHIVE_INTERVAL_HOURS;
  const hours = raw ? parseFloat(raw) : 6;
  if (!Number.isFinite(hours) || hours <= 0) {
    console.log("[session-archive] scheduler disabled (SESSION_ARCHIVE_INTERVAL_HOURS <= 0)");
    return;
  }
  const intervalMs = Math.max(60_000, Math.round(hours * 60 * 60 * 1000));
  console.log(`[session-archive] scheduler enabled — running every ${hours}h`);

  const tick = () => {
    runSessionArchive().catch((err) => {
      console.error("[session-archive] cycle threw:", err);
    });
  };

  setTimeout(tick, 15_000);
  schedulerHandle = setInterval(tick, intervalMs);
}

export function stopSessionArchiveScheduler(): void {
  if (schedulerHandle) {
    clearInterval(schedulerHandle);
    schedulerHandle = null;
  }
}

void dsql;
