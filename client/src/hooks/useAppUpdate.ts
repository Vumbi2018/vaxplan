import { useQuery } from "@tanstack/react-query";
import { APP_VERSION } from "@/lib/version";
import { isNativeShell } from "@/lib/apiBase";

export interface VersionInfo {
  version: string;
  buildTime: string;
  windowsInstallerUrl: string | null;
  androidApkUrl: string | null;
}

export type ShellPlatform = "android" | "windows" | "web";

export function shellPlatform(): ShellPlatform {
  if (typeof window === "undefined") return "web";
  if ((window as any).Capacitor) return "android";
  if ((window as any).electronAPI) return "windows";
  return "web";
}

// Compares dotted version strings; true when `latest` is strictly newer.
export function isNewerVersion(latest: string, current: string): boolean {
  const a = latest.split(".").map((n) => parseInt(n, 10) || 0);
  const b = current.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

/**
 * Checks the server's deployed version against the version baked into this
 * running build. On the web they always match (same deploy); inside a packaged
 * Android/Windows shell the bundled UI can lag the server, so this surfaces a
 * "new version available" signal even though data already syncs.
 */
export function useAppUpdate() {
  const { data } = useQuery<VersionInfo>({
    queryKey: ["/api/version"],
    refetchInterval: 1000 * 60 * 15,
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const latest = data?.version;
  const updateAvailable = !!latest && isNewerVersion(latest, APP_VERSION);

  return {
    updateAvailable,
    latest,
    current: APP_VERSION,
    info: data ?? null,
    native: isNativeShell(),
    platform: shellPlatform(),
  };
}
