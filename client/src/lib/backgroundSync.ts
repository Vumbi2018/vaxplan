/**
 * Background Sync helpers for the offline outbox.
 *
 * When the page enqueues a mutation while offline, we ask the browser to
 * fire a `sync` event in the Service Worker as soon as connectivity comes
 * back — even if the tab or PWA is closed. On browsers without the
 * Background Sync API (notably iOS Safari today), we fall back to the
 * in-page periodic flush already implemented in syncEngine, and surface a
 * one-time hint so users understand the limitation.
 */

const OUTBOX_SYNC_TAG = "outbox-flush";
const UNSUPPORTED_HINT_KEY = "vaxplan-bgsync-hint-shown";

type SyncRegistration = ServiceWorkerRegistration & {
  sync?: { register: (tag: string) => Promise<void> };
};

export function isBackgroundSyncSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof window !== "undefined" &&
    "SyncManager" in window
  );
}

/**
 * Ask the active Service Worker to flush the outbox the next time
 * connectivity returns. Safe to call from anywhere — never throws.
 */
export async function registerBackgroundOutboxFlush(): Promise<boolean> {
  try {
    if (!isBackgroundSyncSupported()) return false;
    const reg = (await navigator.serviceWorker.ready) as SyncRegistration;
    if (!reg.sync) return false;
    await reg.sync.register(OUTBOX_SYNC_TAG);
    return true;
  } catch {
    return false;
  }
}

/**
 * Show a single, dismissible hint when Background Sync is unavailable so
 * field users on iOS Safari know their saves will only flush while the
 * app is open.
 */
export function maybeShowUnsupportedHint(
  toast: (args: { title: string; description: string }) => void,
): void {
  try {
    if (isBackgroundSyncSupported()) return;
    if (typeof localStorage === "undefined") return;
    if (localStorage.getItem(UNSUPPORTED_HINT_KEY) === "1") return;
    localStorage.setItem(UNSUPPORTED_HINT_KEY, "1");
    toast({
      title: "Saved locally — keep the app open to sync",
      description:
        "Your device does not support automatic background sync. Local changes will upload the next time this app is open and online.",
    });
  } catch {
    /* ignore */
  }
}

/**
 * Listen for SW → page messages emitted from the Background Sync handler
 * (sync started / finished / update available). Returns an unsubscribe fn.
 */
export function onServiceWorkerMessage(
  handler: (msg: { type: string; [k: string]: any }) => void,
): () => void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return () => {};
  }
  const listener = (event: MessageEvent) => {
    if (event.data && typeof event.data === "object" && "type" in event.data) {
      handler(event.data as any);
    }
  };
  navigator.serviceWorker.addEventListener("message", listener);
  return () =>
    navigator.serviceWorker.removeEventListener("message", listener);
}
