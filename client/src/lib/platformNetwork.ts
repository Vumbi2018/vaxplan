/**
 * platformNetwork.ts
 *
 * Unified cross-platform network status utility.
 *
 * Provides a single `onNetworkChange(callback)` API that works identically
 * across all three deployment targets:
 *
 *   Platform          | Mechanism
 *   ------------------|--------------------------------------------
 *   Browser (web)     | window 'online' / 'offline' events
 *   Android (Capacitor)| @capacitor/network plugin (reliable)
 *   Windows (Electron)| Electron IPC from net.isOnline() polling
 *
 * Usage:
 *   const unsub = onNetworkChange((isOnline) => {
 *     if (isOnline) syncEngine.sync(tenantId);
 *   });
 *   // later:
 *   unsub();
 */

type NetworkCallback = (isOnline: boolean) => void;

/**
 * Detect whether we are running inside Capacitor (Android / iOS).
 */
function isCapacitor(): boolean {
  return typeof (window as any).Capacitor !== "undefined";
}

/**
 * Detect whether we are running inside Electron.
 */
function isElectron(): boolean {
  return !!(window as any).electronAPI?.onNetworkStatusChange;
}

/**
 * Register a callback that fires whenever connectivity changes.
 * Returns an unsubscribe function.
 */
export function onNetworkChange(callback: NetworkCallback): () => void {
  // ── Android / iOS (Capacitor) ────────────────────────────────────────────────
  if (isCapacitor()) {
    let listenerHandle: { remove: () => Promise<void> } | null = null;

    // Async-initialise the Capacitor Network plugin listener
    (async () => {
      try {
        const { Network } = await import("@capacitor/network");
        listenerHandle = await Network.addListener(
          "networkStatusChange",
          (status) => callback(status.connected)
        );
      } catch (err) {
        console.warn("[platformNetwork] Capacitor Network plugin unavailable:", err);
        // Fallback: use standard browser events
        window.addEventListener("online",  () => callback(true));
        window.addEventListener("offline", () => callback(false));
      }
    })();

    return () => {
      listenerHandle?.remove().catch(() => {});
    };
  }

  // ── Windows (Electron) ──────────────────────────────────────────────────────
  if (isElectron()) {
    const electronAPI = (window as any).electronAPI;
    const unsub = electronAPI.onNetworkStatusChange(callback);
    return () => { if (typeof unsub === "function") unsub(); };
  }

  // ── Standard browser ────────────────────────────────────────────────────────
  const onOnline  = () => callback(true);
  const onOffline = () => callback(false);
  window.addEventListener("online",  onOnline);
  window.addEventListener("offline", onOffline);
  return () => {
    window.removeEventListener("online",  onOnline);
    window.removeEventListener("offline", onOffline);
  };
}

/**
 * Async check of current connectivity status.
 * Uses the platform-appropriate API, not the unreliable navigator.onLine.
 */
export async function isOnline(): Promise<boolean> {
  if (isCapacitor()) {
    try {
      const { Network } = await import("@capacitor/network");
      const status = await Network.getStatus();
      return status.connected;
    } catch {
      return navigator.onLine;
    }
  }

  if (isElectron()) {
    // Electron's preload doesn't expose a one-shot check, fall back to navigator.onLine
    // (the main process pushes updates via IPC so this is only used during init)
    return navigator.onLine;
  }

  return navigator.onLine;
}
