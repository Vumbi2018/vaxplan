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
import { useToast } from "@/hooks/use-toast";
import {
  PROXIMITY_CONFLICT_EVENT,
  type ProximityConflictEventDetail,
} from "@/lib/syncEngine";

export function useProximityConflictWarnings() {
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ProximityConflictEventDetail>).detail;
      if (!detail || !detail.warnings?.length) return;
      const idHint = detail.sessionId != null ? ` (session #${detail.sessionId})` : "";
      const description = detail.warnings.join(" ");
      toast({
        title: `Synced session edit needs review${idHint}`,
        description:
          `${description} ` +
          `The edit was saved because you made it offline, but please review it.`,
        variant: "destructive",
      });
    };
    window.addEventListener(PROXIMITY_CONFLICT_EVENT, handler);
    return () => window.removeEventListener(PROXIMITY_CONFLICT_EVENT, handler);
  }, [toast]);
}
