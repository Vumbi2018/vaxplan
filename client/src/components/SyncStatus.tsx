import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SyncStatusProps {
  isOnline?: boolean;
  isSyncing?: boolean;
  lastSyncTime?: Date;
}

export function SyncStatus({ isOnline = true, isSyncing = false, lastSyncTime }: SyncStatusProps) {
  if (isSyncing) {
    return (
      <Badge variant="secondary" className="gap-1">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span className="text-xs">Syncing</span>
      </Badge>
    );
  }

  if (!isOnline) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <CloudOff className="h-3 w-3" />
        <span className="text-xs">Offline</span>
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1">
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
