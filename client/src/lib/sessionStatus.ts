// Unified session lifecycle helper used by the live map, dashboard tiles,
// and the Microplan Builder. Returns a coarse phase plus an `isOverdue`
// flag derived from the scheduled date and current status.
//
// Phase mapping:
//   pending      — status is "planned" or "scheduled" and not yet conducted.
//   in_progress  — status is "in_progress" / "in-progress".
//   reported     — status is "completed" / "conducted" and completedAt is within
//                  the last 30 days OR vaccinatedCounts have been captured.
//   archived     — completed/conducted more than 30 days ago.
//
// Overdue: phase === "pending" AND scheduledDate is strictly before today.

export type SessionLifecyclePhase =
  | "pending"
  | "in_progress"
  | "reported"
  | "archived";

export interface SessionLifecycle {
  phase: SessionLifecyclePhase;
  isOverdue: boolean;
}

export interface SessionLike {
  status?: string | null;
  scheduledDate?: string | Date | null;
  completedAt?: string | Date | null;
  vaccinatedCounts?: unknown;
}

const ARCHIVE_AFTER_DAYS = 30;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export function deriveSessionLifecycle(session: SessionLike): SessionLifecycle {
  const status = (session.status || "").toLowerCase();
  const scheduled = toDate(session.scheduledDate ?? null);
  const completed = toDate(session.completedAt ?? null);
  const today = startOfToday();

  let phase: SessionLifecyclePhase = "pending";

  if (status === "in_progress" || status === "in-progress") {
    phase = "in_progress";
  } else if (
    status === "completed" ||
    status === "conducted" ||
    completed ||
    !!session.vaccinatedCounts
  ) {
    const ref = completed ?? scheduled;
    if (ref) {
      const ageDays =
        (today.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24);
      phase = ageDays > ARCHIVE_AFTER_DAYS ? "archived" : "reported";
    } else {
      phase = "reported";
    }
  }

  const isOverdue =
    phase === "pending" &&
    !!scheduled &&
    scheduled.getTime() < today.getTime();

  return { phase, isOverdue };
}

export function isOverdue(session: SessionLike): boolean {
  return deriveSessionLifecycle(session).isOverdue;
}

export function isPendingImplementation(session: SessionLike): boolean {
  const { phase } = deriveSessionLifecycle(session);
  return phase === "pending" || phase === "in_progress";
}
