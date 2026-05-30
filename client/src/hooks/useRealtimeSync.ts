/**
 * useRealtimeSync — keeps the open tab in step with peers in real time.
 *
 * Opens a websocket to the server change channel scoped to the currently-viewed
 * tenant. When a peer writes data, the server pokes us and we quietly refresh:
 * invalidate the relevant React Query caches (which refetch with the right
 * tenant header) and kick off a silent SyncEngine sync to refresh the offline
 * replica. This is purely additive on top of the reliable interval sync — if the
 * socket never connects, nothing breaks.
 */

import { useEffect, useRef } from "react";
import { RealtimeClient } from "@/lib/realtimeClient";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { syncEngine } from "@/lib/syncEngine";
import { loadActiveTenant } from "@/lib/tenantCache";

export function useRealtimeSync(): void {
  const { user } = useAuth();
  const clientRef = useRef<RealtimeClient | null>(null);

  useEffect(() => {
    if (!user) return;

    // The tenant we're *viewing* (cross-tenant browsing) drives which broadcast
    // stream we listen to. Switching tenant reloads the page, so reading once
    // here is sufficient.
    const active = loadActiveTenant();
    const tenantId = active?.id || (user as any)?.tenantId;
    if (!tenantId) return;

    const homeTenant = (user as any)?.tenantId as string | undefined;

    if (!clientRef.current) {
      clientRef.current = new RealtimeClient(() => {
        // Always refresh the visible data — refetches carry the active
        // x-tenant-id header, so this correctly refreshes whichever tenant is
        // currently being viewed (cross-tenant browsing included).
        try {
          queryClient.invalidateQueries({
            predicate: (q) =>
              typeof q.queryKey?.[0] === "string" &&
              (q.queryKey[0] as string).startsWith("/api"),
          });
        } catch {
          /* non-fatal */
        }
        // Only refresh the offline replica when the poke is for our OWN home
        // tenant — that's the only partition the SyncEngine maintains. Syncing
        // it for another viewed tenant would point the replica at the wrong
        // partition, so we rely on the query invalidation above for those.
        if (homeTenant && tenantId === homeTenant) {
          try {
            syncEngine.sync(homeTenant, { silent: true });
          } catch {
            /* non-fatal */
          }
        }
      });
    }
    clientRef.current.connect(tenantId);

    return () => {
      clientRef.current?.disconnect();
      clientRef.current = null;
    };
  }, [user?.id, (user as any)?.tenantId]);
}
