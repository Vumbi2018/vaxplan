/**
 * Device-bound offline auth token storage (Task #232).
 *
 * Single API across the three deployment targets:
 *   - Electron (Windows installer): IPC → safeStorage-encrypted file
 *   - Capacitor (Android installer): @capacitor/preferences (backed by
 *     Android Keystore-protected SharedPreferences on API 23+)
 *   - Browser / PWA: localStorage (best available; not encrypted at rest)
 *
 * The token itself is opaque to the client — issued by
 * `POST /api/auth/device-token` after a successful interactive login and
 * presented back on next launch via `POST /api/auth/device-token/validate`
 * which restores the session. See server/routes.ts.
 */

const STORAGE_KEY = "vaxplan.deviceToken";

function isElectron(): boolean {
  return typeof window !== "undefined" && !!(window as any).electronAPI?.deviceToken;
}

function isCapacitor(): boolean {
  return typeof window !== "undefined" && typeof (window as any).Capacitor !== "undefined";
}

// `@capacitor/preferences` would be the ideal Android store (it sits on
// EncryptedSharedPreferences when configured), but it isn't a dependency
// of this project yet — until it's added, the Capacitor WebView falls
// back to localStorage. localStorage on Android WebView is persisted to
// the app's private data directory, which is acceptable for an
// opaque device token; if a tenant requires Keystore-grade storage the
// dep can be added without changing the call sites here.
async function rawGet(): Promise<string | null> {
  if (isElectron()) {
    return (await (window as any).electronAPI.deviceToken.get()) ?? null;
  }
  return localStorage.getItem(STORAGE_KEY);
}

async function rawSet(token: string): Promise<boolean> {
  if (isElectron()) {
    return !!(await (window as any).electronAPI.deviceToken.set(token));
  }
  localStorage.setItem(STORAGE_KEY, token);
  return true;
}

async function rawClear(): Promise<void> {
  if (isElectron()) {
    await (window as any).electronAPI.deviceToken.clear();
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}

export async function getDeviceToken(): Promise<string | null> {
  try { return await rawGet(); } catch { return null; }
}

export async function setDeviceToken(token: string): Promise<boolean> {
  if (!token) return false;
  try { return await rawSet(token); } catch { return false; }
}

export async function clearDeviceToken(): Promise<void> {
  try { await rawClear(); } catch { /* ignore */ }
}

/** Best-guess platform label for the issue request. */
export function detectPlatform(): "windows" | "android" | "web" {
  if (isElectron()) return "windows";
  if (isCapacitor()) return "android";
  return "web";
}

/**
 * Ask the server to mint a new device-bound token for the current session
 * and persist it locally. Call this once after a successful interactive
 * login (Landing → OIDC redirect → app shell mount).
 */
export async function issueAndStoreDeviceToken(label?: string): Promise<boolean> {
  try {
    const resp = await fetch("/api/auth/device-token", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: detectPlatform(), deviceLabel: label ?? null }),
    });
    if (!resp.ok) return false;
    const { token } = (await resp.json()) as { token?: string };
    if (!token) return false;
    return await setDeviceToken(token);
  } catch {
    return false;
  }
}

/**
 * On app launch, if we have a cached device token, present it to the server
 * to restore the session. Returns true if validation succeeded (the session
 * cookie is now set and the user can enter the app).
 */
export async function restoreSessionFromDeviceToken(): Promise<boolean> {
  const token = await getDeviceToken();
  if (!token) return false;
  try {
    const resp = await fetch("/api/auth/device-token/validate", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (resp.ok) return true;
    // 401 → token revoked or expired; clear it so we surface the
    // "Connect to sign in" screen instead of looping.
    if (resp.status === 401 || resp.status === 403) {
      await clearDeviceToken();
    }
    return false;
  } catch {
    // Network error — leave the token alone; the offline session check
    // will fall through to the cached app shell.
    return false;
  }
}
