/**
 * Header badge for unresolved offline sync conflicts (Task #232 T003).
 *
 * Polls offlineDb.conflictLog on a slow timer and re-checks whenever the
 * Service Worker reports an outbox flush finished or the SyncConflicts
 * page emits the `vaxplan:conflict-count` event after a resolve action.
 * Renders nothing when there are zero unresolved conflicts so the header
 * stays clean for the common case.
 */

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";
import { offlineDb } from "@/lib/offlineDb";
import { Badge } from "@/components/ui/badge";

export function ConflictBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    const recount = async () => {
      try {
        const all = await offlineDb.conflictLog.toArray();
        const unresolved = all.filter((c: any) => c.resolved !== true).length;
        if (alive) setCount(unresolved);
      } catch {
        if (alive) setCount(0);
      }
    };
    recount();
    const t = setInterval(recount, 15_000);

    const onSwMessage = (e: MessageEvent) => {
      if (e.data?.type === "OUTBOX_SYNC_FINISHED") recount();
    };
    navigator.serviceWorker?.addEventListener("message", onSwMessage);

    const onCustom = (e: Event) => {
      const ce = e as CustomEvent<{ count: number }>;
      if (typeof ce.detail?.count === "number") setCount(ce.detail.count);
      else recount();
    };
    window.addEventListener("vaxplan:conflict-count", onCustom);

    return () => {
      alive = false;
      clearInterval(t);
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
      window.removeEventListener("vaxplan:conflict-count", onCustom);
    };
  }, []);

  if (count <= 0) return null;

  return (
    <Link
      to="/sync/conflicts"
      data-testid="link-conflict-badge"
      className="relative inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100 dark:hover:bg-amber-900/50"
      aria-label={`${count} unresolved sync conflict${count === 1 ? "" : "s"}`}
    >
      <AlertTriangle className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Conflicts</span>
      <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
        {count > 99 ? "99+" : count}
      </Badge>
    </Link>
  );
}
