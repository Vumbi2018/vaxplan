import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw, Inbox, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { syncEngine, type SyncState } from "@/lib/syncEngine";
import { onServiceWorkerMessage } from "@/lib/backgroundSync";
import { useAuth } from "@/hooks/useAuth";
import { getActiveSyncTenantId } from "@/lib/tenantCache";

interface SyncStatusProps {
  /** Optional overrides for legacy callers — when omitted, status is
   *  subscribed live from the syncEngine + Service Worker messages. */
  isOnline?: boolean;
  isSyncing?: boolean;
  lastSyncTime?: Date;
}

export function SyncStatus(props: SyncStatusProps = {}) {
  const { user } = useAuth();
  const [state, setState] = useState<SyncState>(syncEngine.getState());

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe(setState);
    // SW Background Sync notifications nudge a re-read of pendingCount.
    const offMsg = onServiceWorkerMessage((msg) => {
      if (msg.type === "OUTBOX_SYNC_STARTED") {
        syncEngine.reportBackgroundSync("started");
      } else if (msg.type === "OUTBOX_SYNC_FINISHED") {
        syncEngine.reportBackgroundSync("finished", {
          ok: msg.ok,
          reason: msg.reason,
        });
      }
    });
    return () => {
      unsubscribe();
      offMsg();
    };
  }, []);

  const online = props.isOnline ?? state.status !== "offline";
  const syncing = props.isSyncing ?? state.status === "syncing";
  const lastSyncTime =
    props.lastSyncTime ??
    (state.lastSyncAt ? new Date(state.lastSyncAt) : undefined);
  const pending = state.pendingCount ?? 0;
  const stuck = state.stuckCount ?? 0;

  // When online and not already syncing, the badge doubles as a manual
  // "Sync now" trigger — this is the always-visible control in the header, so
  // a user can force a sync at any time (the OfflineBanner's button only
  // appears when there are pending/offline/error states).
  const activeSyncTenantId = getActiveSyncTenantId(user);
  const canTriggerSync = online && !syncing && !!activeSyncTenantId;
  const handleSync = () => {
    if (canTriggerSync && activeSyncTenantId) {
      syncEngine.sync(activeSyncTenantId);
    }
  };
  const triggerProps = canTriggerSync
    ? {
        onClick: handleSync,
        role: "button" as const,
        tabIndex: 0,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSync();
          }
        },
      }
    : {};
  const triggerClass = canTriggerSync ? "cursor-pointer hover-elevate" : "";

  if (syncing) {
    return (
      <Badge variant="secondary" className="gap-1" data-testid="sync-syncing">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span className="text-xs">Syncing{pending > 0 ? ` ${pending}` : ""}</span>
      </Badge>
    );
  }

  if (!online) {
    return (
      <Badge
        variant="outline"
        className="gap-1 text-muted-foreground"
        data-testid="sync-offline"
      >
        <CloudOff className="h-3 w-3" />
        <span className="text-xs">
          {pending > 0 ? `Offline — ${pending} queued` : "Offline"}
        </span>
      </Badge>
    );
  }

  // Stuck items (max retries hit) — show an orange "failed" badge.
  // Clicking it runs a manual sync, which resets their retries for a fresh attempt.
  if (stuck > 0 && pending === 0) {
    return (
      <Badge
        variant="destructive"
        className={`gap-1 bg-orange-500/15 text-orange-400 border-orange-500/30 ${canTriggerSync ? "cursor-pointer hover-elevate" : ""}`}
        data-testid="button-sync-now"
        title={canTriggerSync ? `${stuck} item(s) failed to sync — click to retry` : undefined}
        aria-label="Retry failed items"
        {...(canTriggerSync ? triggerProps : {})}
      >
        <AlertCircle className="h-3 w-3" />
        <span className="text-xs">{stuck} failed{canTriggerSync ? " — retry" : ""}</span>
        {canTriggerSync && <RefreshCw className="h-3 w-3 ml-0.5 opacity-70" />}
      </Badge>
    );
  }

  // Both pending + stuck
  if (stuck > 0 && pending > 0) {
    return (
      <Badge
        variant="secondary"
        className={`gap-1 ${triggerClass}`}
        data-testid="button-sync-now"
        title={canTriggerSync ? `${pending} queued, ${stuck} failed — click to sync` : undefined}
        aria-label="Sync now"
        {...triggerProps}
      >
        <Inbox className="h-3 w-3" />
        <span className="text-xs">{pending} queued · <span className="text-orange-400">{stuck} failed</span></span>
        {canTriggerSync && <RefreshCw className="h-3 w-3 ml-0.5 opacity-70" />}
      </Badge>
    );
  }

  if (pending > 0) {
    return (
      <Badge
        variant="secondary"
        className={`gap-1 ${triggerClass}`}
        data-testid="button-sync-now"
        title={canTriggerSync ? `${pending} queued — click to sync now` : undefined}
        aria-label="Sync now"
        {...triggerProps}
      >
        <Inbox className="h-3 w-3" />
        <span className="text-xs">{pending} queued</span>
        {canTriggerSync && <RefreshCw className="h-3 w-3 ml-0.5 opacity-70" />}
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className={`gap-1 ${triggerClass}`}
      data-testid="button-sync-now"
      title={
        canTriggerSync
          ? `${lastSyncTime ? `Last sync: ${lastSyncTime.toLocaleString()} — ` : ""}click to sync now`
          : lastSyncTime
          ? `Last sync: ${lastSyncTime.toLocaleString()}`
          : undefined
      }
      aria-label="Sync now"
      {...triggerProps}
    >
      <Cloud className="h-3 w-3" />
      <span className="text-xs">
        {lastSyncTime ? `Synced ${formatTimeAgo(lastSyncTime)}` : "Online"}
      </span>
      {canTriggerSync && <RefreshCw className="h-3 w-3 ml-0.5 opacity-70" />}
    </Badge>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
