import { and, eq, lt, isNotNull, sql as dsql } from "drizzle-orm";
import { db } from "../db";
import { sessionPlans } from "@shared/schema";
import { scheduleAtMidnight, cancelMidnightJob } from "./scheduler";

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

/**
 * Schedules session archiving to run once nightly at midnight UTC + 5 min.
 * Previously used setInterval every 6h starting 15s after boot — that caused
 * unnecessary DB load during peak hours and on every server restart.
 *
 * Set SESSION_ARCHIVE_ENABLED=0 to disable (e.g. in dev/test environments
 * where archiving on every run would mutate seed data).
 */
export function startSessionArchiveScheduler(): void {
  if (process.env.SESSION_ARCHIVE_ENABLED === "0") {
    console.log("[session-archive] disabled via SESSION_ARCHIVE_ENABLED=0");
    return;
  }
  scheduleAtMidnight(
    "session-archive",
    async () => {
      const { archived } = await runSessionArchive();
      console.log(`[session-archive] nightly run complete — archived=${archived}`);
    },
    { offsetMinutes: 5 }, // 00:05 UTC — staggered from other midnight jobs
  );
}

export function stopSessionArchiveScheduler(): void {
  cancelMidnightJob("session-archive");
}

void dsql;

