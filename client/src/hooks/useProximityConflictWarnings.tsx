/**
 * useProximityConflictWarnings — Task #181
 *
 * Listens for `vaxplan:proximity-conflict` events dispatched by the sync
 * engine when an offline-queued session PATCH is replayed and the server
 * reports the change would have tripped the online proximity/population
 * guard (which would have responded with HTTP 409).
 *
 * The clerk already committed the edit while offline, so the server
 * applies it anyway (we cannot silently discard their work). This hook
 * surfaces a destructive toast on the next sync asking them to review
 * the now-synced session, similar to the unmapped-antigens warning.
 */

import { useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  PROXIMITY_CONFLICT_EVENT,
  type ProximityConflictEventDetail,
} from "@/lib/syncEngine";

function formatScheduledDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function useProximityConflictWarnings() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ProximityConflictEventDetail>).detail;
      if (!detail || !detail.warnings?.length) return;
      const idHint = detail.sessionId != null ? ` (session #${detail.sessionId})` : "";
      const warningText = detail.warnings.join(" ");
      // Task #201 — give the clerk a one-click jump to the flagged session
      // so they don't have to hunt for it after the sync toast appears.
      const sid = detail.sessionId;
      const action =
        sid != null ? (
          <ToastAction
            altText="Review session"
            onClick={() => setLocation(`/sessions/microplan/${sid}`)}
            data-testid={`button-review-session-${sid}`}
          >
            Review session
          </ToastAction>
        ) : undefined;

      // Task #206 — surface the nearby sessions the server flagged so the
      // clerk can see which other sessions caused the conflict and jump
      // straight to any of them to reschedule.
      const nearby = detail.nearbySessions ?? [];
      const description = (
        <div className="space-y-2">
          <p>
            {warningText} The edit was saved because you made it offline, but
            please review it.
          </p>
          {nearby.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                Nearby conflicting sessions
              </p>
              <ul className="space-y-1">
                {nearby.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setLocation(`/sessions/microplan/${s.id}`)
                      }
                      className="text-left underline underline-offset-2 hover:opacity-80"
                      data-testid={`button-review-nearby-session-${s.id}`}
                    >
                      #{s.id} — {s.name} ({formatScheduledDate(s.scheduledDate)},{" "}
                      {s.distanceKm.toFixed(2)} km away)
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );

      toast({
        title: `Synced session edit needs review${idHint}`,
        description,
        variant: "destructive",
        action,
      });
    };
    window.addEventListener(PROXIMITY_CONFLICT_EVENT, handler);
    return () => window.removeEventListener(PROXIMITY_CONFLICT_EVENT, handler);
  }, [toast, setLocation]);
}
