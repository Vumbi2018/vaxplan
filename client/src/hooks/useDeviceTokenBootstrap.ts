/**
 * Auto-issue an offline device token on first successful login from an
 * installed shell (Electron or Capacitor). Task #232 T002.
 *
 * The token is stored via deviceAuth's platform-appropriate secure store
 * (Electron safeStorage IPC, otherwise localStorage in the app's private
 * data dir). The web browser is intentionally skipped — there's no
 * cross-launch persistence benefit there because the session cookie
 * already covers it, and we don't want to mint long-lived tokens that
 * just sit in browser localStorage on shared machines.
 *
 * Idempotent: only runs once per app launch, only when no token is
 * already cached locally. If the server is offline at first launch the
 * call fails silently — we'll get another shot at it next launch.
 */

import { useEffect } from "react";
import type { User } from "@shared/schema";
import {
  detectPlatform,
  getDeviceToken,
  issueAndStoreDeviceToken,
} from "@/lib/deviceAuth";

export function useDeviceTokenBootstrap(user: User | null | undefined) {
  useEffect(() => {
    if (!user) return;
    const platform = detectPlatform();
    if (platform === "web") return;

    let cancelled = false;
    (async () => {
      try {
        const existing = await getDeviceToken();
        if (cancelled || existing) return;
        await issueAndStoreDeviceToken(navigator.userAgent.slice(0, 80));
      } catch {
        /* offline or server rejected — try again next launch */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);
}
