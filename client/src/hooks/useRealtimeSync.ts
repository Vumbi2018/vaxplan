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
import { loadActiveTenant, getActiveSyncTenantId } from "@/lib/tenantCache";

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

    // The sync engine is keyed to the active viewing tenant (getActiveSyncTenantId
    // returns the localStorage active tenant for platform admins, or the home
    // tenant for everyone else), so real-time pokes should always trigger a sync
    // against that same key.
    const activeSyncTenantId = getActiveSyncTenantId(user as any);

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
        // Refresh the offline replica using the active tenant key — the sync
        // engine now maintains one bucket per viewing tenant so this is always
        // safe regardless of whether the user is visiting their home tenant or
        // a different country as a platform admin.
        // Original Code:
        // if (activeSyncTenantId) {
        // Updated Code: Ensure activeSyncTenantId matches the active websocket connection's tenantId to prevent wrong-partition sync.
        if (activeSyncTenantId && activeSyncTenantId === tenantId) {
          try {
            syncEngine.sync(activeSyncTenantId, { silent: true });
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
