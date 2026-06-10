/**
 * OfflineBanner — Persistent status bar shown at the top of the app.
 *
 * When ONLINE + idle: shows last sync time + "Sync Now" button.
 * When SYNCING: animated progress indicator.
 * When OFFLINE: amber/red banner with pending mutation count.
 * When ERROR: red banner with error message + retry.
 */

import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useSyncEngine } from "@/hooks/useSyncEngine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  CloudOff,
  Upload,
  Signal,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ─── Colour / icon config per status ─────────────────────────────────────────

const STATUS_CONFIG = {
  idle: {
    bg: "bg-emerald-500/10 border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-300",
    icon: CheckCircle2,
    label: "Synced",
  },
  syncing: {
    bg: "bg-blue-500/10 border-blue-200 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-300",
    icon: RefreshCw,
    label: "Syncing…",
  },
  success: {
    bg: "bg-emerald-500/10 border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-300",
    icon: CheckCircle2,
    label: "Synced",
  },
  error: {
    bg: "bg-red-500/10 border-red-200 dark:border-red-800",
    text: "text-red-700 dark:text-red-300",
    icon: AlertCircle,
    label: "Sync Error",
  },
  offline: {
    bg: "bg-amber-500/10 border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-300",
    icon: CloudOff,
    label: "Offline",
  },
} as const;

export function OfflineBanner() {
  const { isOnline, connectionType, effectiveType, isSlowConnection } = useNetworkStatus();
  const {
    status,
    pendingCount,
    lastSyncAt,
    errorMessage,
    currentStage,
    progressPercent,
    triggerSync
  } = useSyncEngine();

  // When fully online and synced with no pending items — hide the banner
  // (keeps UI clean for normal use)
  if (isOnline && status === "success" && pendingCount === 0) return null;
  if (isOnline && status === "idle" && pendingCount === 0) return null;

  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle;
  const Icon = cfg.icon;

  const lastSyncLabel = lastSyncAt
    ? `Last sync ${formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true })}`
    : "Never synced";
  const lastSyncExact = lastSyncAt
    ? `Last sync: ${new Date(lastSyncAt).toLocaleString()}`
    : "Never synced";

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2 border-b text-xs font-medium ${cfg.bg} ${cfg.text} transition-all duration-300`}
      role="status"
      aria-live="polite"
      aria-label={`Sync status: ${cfg.label}`}
    >
      {/* Left: Icon + status message */}
      <div className="flex items-center gap-2 min-w-0">
        <Icon
          className={`h-3.5 w-3.5 shrink-0 ${
            (status as string) === "syncing" ? "animate-spin" : ""
          }`}
        />

        <span className="truncate w-full">
          {!isOnline && (
            <span className="font-semibold">You are offline. </span>
          )}
          {isSlowConnection && isOnline && (
            <span className="font-semibold">Slow connection ({effectiveType}). </span>
          )}
          {pendingCount > 0 && status !== "syncing" && (
            <>
              <Badge
                variant="outline"
                className={`mr-1.5 text-[10px] font-bold ${cfg.text} border-current`}
              >
                <Upload className="h-2.5 w-2.5 mr-0.5" />
                {pendingCount}
              </Badge>
              {pendingCount === 1 ? "record" : "records"} queued for sync.{" "}
            </>
          )}
          {status === "error" && errorMessage && (
            <span title={errorMessage}>Error: {errorMessage.slice(0, 60)}{errorMessage.length > 60 ? "…" : ""}</span>
          )}
          {status !== "error" && status !== "syncing" && (
            <span className="opacity-70" title={lastSyncExact}>{lastSyncLabel}</span>
          )}
          {status === "syncing" && (
            <div className="flex flex-col gap-1 w-full max-w-sm sm:max-w-md md:max-w-lg mt-0.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-blue-700 dark:text-blue-300 truncate max-w-[85%]">
                  {currentStage || `Initializing sync...`}
                </span>
                <span className="font-mono font-bold ml-2">
                  {progressPercent || 0}%
                </span>
              </div>
              <div className="h-1 w-48 sm:w-64 bg-blue-200 dark:bg-blue-900/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent || 0}%` }}
                />
              </div>
            </div>
          )}
        </span>
      </div>

      {/* Right: connection info + actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Connection type indicator */}
        {isOnline && connectionType !== "unknown" && (
          <span className="opacity-60 hidden sm:inline-flex items-center gap-1">
            {connectionType === "wifi" ? (
              <Wifi className="h-3 w-3" />
            ) : connectionType === "cellular" ? (
              <Signal className="h-3 w-3" />
            ) : null}
            {connectionType}
          </span>
        )}

        {!isOnline && (
          <span className="flex items-center gap-1 opacity-75">
            <WifiOff className="h-3 w-3" />
            <span className="hidden sm:inline">No internet</span>
          </span>
        )}

        {/* Sync Now button */}
        {isOnline && status !== "syncing" && (
          <Button
            size="sm"
            variant="ghost"
            className={`h-6 px-2 text-[11px] ${cfg.text} hover:opacity-80`}
            onClick={triggerSync}
            disabled={false}
            aria-label="Sync now"
            id="btn-sync-now"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Sync Now
          </Button>
        )}
      </div>
    </div>
  );
}
