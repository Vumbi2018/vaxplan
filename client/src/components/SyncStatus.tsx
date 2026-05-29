import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { syncEngine, type SyncState } from "@/lib/syncEngine";
import { onServiceWorkerMessage } from "@/lib/backgroundSync";

interface SyncStatusProps {
  /** Optional overrides for legacy callers — when omitted, status is
   *  subscribed live from the syncEngine + Service Worker messages. */
  isOnline?: boolean;
  isSyncing?: boolean;
  lastSyncTime?: Date;
}

export function SyncStatus(props: SyncStatusProps = {}) {
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

  if (pending > 0) {
    return (
      <Badge variant="secondary" className="gap-1" data-testid="sync-queued">
        <Inbox className="h-3 w-3" />
        <span className="text-xs">{pending} queued</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className="gap-1"
      data-testid="sync-synced"
      title={
        lastSyncTime
          ? `Last sync: ${lastSyncTime.toLocaleString()}`
          : undefined
      }
    >
      <Cloud className="h-3 w-3" />
      <span className="text-xs">
        {lastSyncTime ? `Synced ${formatTimeAgo(lastSyncTime)}` : "Online"}
      </span>
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
