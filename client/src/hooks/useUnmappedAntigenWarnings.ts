/**
 * useUnmappedAntigenWarnings — Task #106
 *
 * Listens for `vaxplan:unmapped-antigens` events dispatched by the sync
 * engine when an offline-queued mark-done is replayed and the server
 * reports antigen codes outside the tenant's configured vaccine schedule.
 *
 * The original mark-done dialog is long gone by the time the outbox
 * replays (the user may even be on a different page), so we mount this
 * hook at the app root and surface a destructive toast naming the codes
 * and pointing health workers at a sync/refresh.
 */

import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  UNMAPPED_ANTIGENS_EVENT,
  type UnmappedAntigensEventDetail,
} from "@/lib/syncEngine";

export function useUnmappedAntigenWarnings() {
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<UnmappedAntigensEventDetail>).detail;
      if (!detail || !detail.unmappedAntigenCodes?.length) return;
      const codes = detail.unmappedAntigenCodes.join(", ");
      const idHint = detail.sessionId != null ? ` (session #${detail.sessionId})` : "";
      toast({
        title: "Synced session had unrecognised vaccines",
        description:
          `These codes are not in your current schedule and were saved as "unmapped"${idHint}: ` +
          `${codes}. Refresh the app or sync your vaccine schedule so future sessions record them correctly.`,
        variant: "destructive",
      });
    };
    window.addEventListener(UNMAPPED_ANTIGENS_EVENT, handler);
    return () => window.removeEventListener(UNMAPPED_ANTIGENS_EVENT, handler);
  }, [toast]);
}
