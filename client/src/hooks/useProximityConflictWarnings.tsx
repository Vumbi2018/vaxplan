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

export function useProximityConflictWarnings() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ProximityConflictEventDetail>).detail;
      if (!detail || !detail.warnings?.length) return;
      const idHint = detail.sessionId != null ? ` (session #${detail.sessionId})` : "";
      const description = detail.warnings.join(" ");
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
      toast({
        title: `Synced session edit needs review${idHint}`,
        description:
          `${description} ` +
          `The edit was saved because you made it offline, but please review it.`,
        variant: "destructive",
        action,
      });
    };
    window.addEventListener(PROXIMITY_CONFLICT_EVENT, handler);
    return () => window.removeEventListener(PROXIMITY_CONFLICT_EVENT, handler);
  }, [toast, setLocation]);
}
