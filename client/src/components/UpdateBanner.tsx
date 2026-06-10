import { useState } from "react";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Sparkles, X } from "lucide-react";

const DISMISS_KEY = "vaxplan-update-dismissed";

/**
 * A thin banner shown when the server is running a newer version than this
 * build. On the web it offers a reload; inside a packaged Android/Windows
 * shell it points to the installer (or explains how the update arrives) so
 * users aren't stuck on a stale UI even though their data keeps syncing.
 */
export function UpdateBanner() {
  const { updateAvailable, latest, info, native, platform } = useAppUpdate();
  const [dismissed, setDismissed] = useState<string | null>(() => {
    try {
      return localStorage.getItem(DISMISS_KEY);
    } catch {
      return null;
    }
  });

  if (!updateAvailable || !latest) return null;
  if (dismissed === latest) return null;

  const downloadUrl =
    platform === "android" ? info?.androidApkUrl : platform === "windows" ? info?.windowsInstallerUrl : null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, latest);
    } catch {
      /* ignore */
    }
    setDismissed(latest);
  };

  return (
    <div
      className="flex items-center gap-3 bg-indigo-600 text-white px-4 py-2 text-sm shadow-sm"
      data-testid="update-banner"
      role="status"
    >
      <Sparkles className="h-4 w-4 shrink-0" />
      <span className="flex-1 min-w-0">
        A new version of VaxPlan (<span className="font-semibold">v{latest}</span>) is available
        {native ? " — update to get the latest features." : "."}
        {platform === "windows" && " It installs automatically next time you restart the app."}
      </span>

      {!native && (
        <Button size="sm" variant="secondary" className="gap-1.5 h-7" onClick={() => window.location.reload()} data-testid="btn-update-reload">
          <RefreshCw className="h-3.5 w-3.5" /> Reload
        </Button>
      )}
      {native && downloadUrl && (
        <Button asChild size="sm" variant="secondary" className="gap-1.5 h-7" data-testid="btn-update-download">
          <a href={downloadUrl} target="_blank" rel="noreferrer">
            <Download className="h-3.5 w-3.5" /> Download update
          </a>
        </Button>
      )}

      <button onClick={dismiss} className="shrink-0 opacity-80 hover:opacity-100" aria-label="Dismiss" data-testid="btn-update-dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
