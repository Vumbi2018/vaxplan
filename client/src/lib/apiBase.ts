/**
 * apiBase.ts
 *
 * Resolves where API requests should go.
 *
 * On the web (normal browser / PWA) the app is served from the same origin
 * as the API, so requests stay relative ("/api/...") and this module is a
 * no-op.
 *
 * Inside a packaged native shell the UI is loaded from local files:
 *   - Android (Capacitor): served from the local "https://localhost" bundle
 *   - Windows (Electron):  loaded from "file://"
 * In both cases a relative "/api/..." call never reaches the real server —
 * it is answered by the local bundle (returning index.html, i.e. the
 * "Unexpected token '<'" / "not valid JSON" error) or fails outright
 * (blank window). So in a native shell we rewrite "/api/..." to an absolute
 * URL pointing at the configured remote server.
 *
 * The remote server address is baked in at build time via the
 * `VITE_API_BASE_URL` environment variable (see vite.config.ts and the
 * scripts/Build-*.ps1 installers).
 */

/** True when running inside a packaged Capacitor (Android) or Electron shell. */
export function isNativeShell(): boolean {
  if (typeof window === "undefined") return false;
  return (
    typeof (window as any).Capacitor !== "undefined" ||
    !!(window as any).electronAPI
  );
}

/**
 * The absolute origin the native app should call, e.g.
 * "https://api.your-domain.org". Empty string on the web (relative requests).
 */
export function getApiBase(): string {
  if (!isNativeShell()) return "";
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
  return base.replace(/\/+$/, "");
}

/**
 * Rewrite a relative API URL ("/api/...") to an absolute one when running in
 * a native shell. Absolute URLs and non-API paths are returned unchanged.
 */
// The origins a packaged shell serves its own UI from. A relative "/api/..."
// request is resolved against one of these by the browser/WebView before our
// interceptor sees it (e.g. `new Request("/api/x")` becomes
// "app://local/api/x"), so we must recognise and re-route those too.
const LOCAL_APP_ORIGINS = [
  "app://local", // Electron packaged app
  "https://localhost", // Capacitor Android (androidScheme: "https")
  "capacitor://localhost", // Capacitor (iOS / alt scheme)
];

export function resolveApiUrl(url: string): string {
  const base = getApiBase();
  if (!base) return url;
  // Relative API path → remote. Local assets (./assets, /icons, /sw.js, etc.)
  // are left alone so they keep loading from the bundled app.
  if (url.startsWith("/api")) return base + url;
  // Absolute URL that points at the local app origin (a relative "/api/..."
  // call already resolved against the shell origin) → re-route its API path.
  if (/^[a-z]+:\/\//i.test(url)) {
    try {
      const u = new URL(url);
      if (LOCAL_APP_ORIGINS.includes(u.origin) && u.pathname.startsWith("/api")) {
        return base + u.pathname + u.search;
      }
    } catch {
      /* not parseable — leave unchanged */
    }
  }
  return url;
}
