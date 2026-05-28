import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor config for the VaxPlan Android app.
 *
 * - `webDir` points at the Vite production bundle so `npx cap sync` mirrors
 *   the latest build into `android/app/src/main/assets/public`.
 * - Splash screen is shown until the first React paint to mask the
 *   first-run sync screen flicker on low-end tablets.
 * - `server.androidScheme = "https"` so cookies / session storage match
 *   the production web origin and Service Worker scopes work consistently.
 *
 * Release signing keystore is configured in
 * `android/app/build.gradle` after `scripts/Build-Android.ps1` runs.
 * See `docs/releases.md` for keystore handling and rotation.
 */
const config: CapacitorConfig = {
  appId: "org.vaxplan.app",
  appName: "VaxPlan",
  webDir: "dist/public",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidScaleType: "CENTER_CROP",
      splashFullScreen: false,
      splashImmersive: false,
    },
  },
};

export default config;
