/**
 * useSyncEngine — React hook that bridges the SyncEngine singleton to React state.
 *
 * Usage:
 *   const { status, pendingCount, lastSyncAt, triggerSync } = useSyncEngine();
 *
 * Platform parity:
 *   - Web / browser: the SyncEngine listens to window 'online' events natively.
 *   - Android (Capacitor): the Capacitor Network plugin fires networkStatusChange.
 *   - Windows (Electron): the preload exposes onNetworkStatusChange() which polls
 *     net.isOnline() every 10 s via the main process. This hook subscribes to it
 *     so offline→online syncs trigger identically on all three platforms.
 */

import { useState, useEffect, useCallback } from "react";
import { syncEngine, type SyncState } from "@/lib/syncEngine";
import { useAuth } from "@/hooks/useAuth";

export function useSyncEngine() {
  const { user } = useAuth();
  const [syncState, setSyncState] = useState<SyncState>(syncEngine.state);

  // Subscribe to state changes from the engine
  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((state) => setSyncState(state));
    return unsubscribe;
  }, []);

  // Initialize engine with tenant context once user is known
  useEffect(() => {
    if (user?.tenantId) {
      syncEngine.init(user.tenantId);
    }
  }, [user?.tenantId]);

  // Windows (Electron) network events are now handled centrally inside syncEngine.init()
  // via platformNetwork.ts → onNetworkChange(), which transparently uses:
  //   - Capacitor Network.addListener on Android
  //   - Electron IPC (electronAPI.onNetworkStatusChange) on Windows
  //   - window 'online'/'offline' events on web
  // No platform-specific code needed here.

  const triggerSync = useCallback(() => {
    if (user?.tenantId) {
      syncEngine.sync(user.tenantId);
    }
  }, [user?.tenantId]);

  return {
    ...syncState,
    triggerSync,
  };
}
