/**
 * Sync Conflicts page (Task #232 step 5).
 *
 * Lists unresolved entries from the local `conflictLog` Dexie table —
 * mutations the outbox replay couldn't auto-merge with the server — and
 * lets the user pick a winner so the queue clears.
 *
 * The conflictLog accumulates rows in two shapes:
 *   (a) Service Worker outbox drain: { localId, attemptedPayload, serverError,
 *       detectedAt, resolved }
 *   (b) Sync engine pull collision (legacy): { entityId, clientValue,
 *       serverValue, resolvedAt }
 * The UI tolerates both — when full diff data is missing, it surfaces just
 * the error and the attempted payload so the clerk can still triage.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { offlineDb } from "@/lib/offlineDb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AnyConflict {
  id?: number;
  tenantId?: string;
  entityType?: string;
  entityId?: string;
  localId?: string;
  clientValue?: string;
  serverValue?: string;
  attemptedPayload?: string;
  serverError?: string;
  detectedAt?: number;
  resolvedAt?: number;
  resolved?: boolean;
}

function safeJsonPretty(s: unknown): string {
  if (s == null) return "—";
  if (typeof s !== "string") return JSON.stringify(s, null, 2);
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

function formatTs(ts?: number) {
  if (!ts) return "unknown";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "unknown";
  }
}

export default function SyncConflicts() {
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);

  const [conflicts, setConflicts] = useState<AnyConflict[] | null>(null);

  const reload = useCallback(async () => {
    try {
      const all = (await offlineDb.conflictLog.toArray()) as AnyConflict[];
      setConflicts(
        all
          .filter((c) => c.resolved !== true)
          .sort(
            (a, b) =>
              (b.detectedAt ?? b.resolvedAt ?? 0) - (a.detectedAt ?? a.resolvedAt ?? 0),
          ),
      );
    } catch {
      setConflicts([]);
    }
  }, []);

  useEffect(() => {
    reload();
    // Re-poll when the Service Worker reports a sync finished, since that's
    // when new conflict rows are written.
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "OUTBOX_SYNC_FINISHED") reload();
    };
    navigator.serviceWorker?.addEventListener("message", handler);
    const t = setInterval(reload, 5000);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", handler);
      clearInterval(t);
    };
  }, [reload]);

  // Surface count via a window event so AppLayout can show a header badge.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("vaxplan:conflict-count", { detail: { count: conflicts?.length ?? 0 } }),
    );
  }, [conflicts]);

  const grouped = useMemo(() => {
    const by: Record<string, AnyConflict[]> = {};
    for (const c of conflicts ?? []) {
      const key = c.entityType ?? "unknown";
      (by[key] ||= []).push(c);
    }
    return by;
  }, [conflicts]);

  async function markResolved(c: AnyConflict, choice: "keep-server" | "keep-local" | "discard") {
    if (c.id == null) return;
    setBusyId(c.id);
    try {
      if (choice === "keep-local") {
        // Re-queue the original payload into the outbox so the next sync
        // tries again. The server's idempotency / version checks handle
        // whatever conflict tripped it the first time.
        if (c.attemptedPayload && c.entityType) {
          try {
            const parsed = JSON.parse(c.attemptedPayload);
            await offlineDb.outbox.add({
              tenantId: c.tenantId ?? "default",
              entityType: c.entityType,
              method: (parsed.method ?? "POST") as any,
              url: parsed.url ?? "/api/sync/replay",
              body: typeof parsed.body === "string" ? parsed.body : JSON.stringify(parsed.body ?? parsed),
              localId: c.localId,
              retries: 0,
              createdAt: Date.now(),
            });
          } catch {
            /* best-effort */
          }
        }
      }
      await offlineDb.conflictLog.update(c.id, {
        resolved: true,
        resolvedAt: Date.now(),
      } as any);
      toast({
        title:
          choice === "keep-server"
            ? "Kept server version"
            : choice === "keep-local"
              ? "Queued your version to retry"
              : "Conflict discarded",
      });
    } finally {
      setBusyId(null);
    }
  }

  if (!conflicts) {
    return (
      <div className="p-6 text-sm text-muted-foreground" data-testid="sync-conflicts-loading">
        Loading conflicts…
      </div>
    );
  }

  if (conflicts.length === 0) {
    return (
      <div className="p-6" data-testid="sync-conflicts-empty">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" /> No sync conflicts
            </CardTitle>
            <CardDescription>
              Every offline change has synced cleanly with the server.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="sync-conflicts-page">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-500" /> Sync conflicts
          <Badge variant="secondary">{conflicts.length}</Badge>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          These offline changes couldn't be applied automatically. Review each
          one and choose which version to keep.
        </p>
      </div>

      {Object.entries(grouped).map(([entityType, items]) => (
        <section key={entityType} className="space-y-3">
          <h2 className="text-lg font-semibold capitalize">
            {entityType.replace(/_/g, " ")}{" "}
            <span className="text-sm text-muted-foreground font-normal">({items.length})</span>
          </h2>
          {items.map((c) => (
            <Card key={c.id} data-testid={`conflict-${c.id}`}>
              <CardHeader>
                <CardTitle className="text-base">
                  {c.entityId ? `Record ${c.entityId}` : c.localId ? `Local ${c.localId}` : "Conflict"}
                </CardTitle>
                <CardDescription>
                  Detected {formatTs(c.detectedAt ?? c.resolvedAt)}
                  {c.serverError ? ` — server said: ${c.serverError}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-1">
                      Your version (local)
                    </div>
                    <pre className="text-xs bg-muted/40 rounded p-2 overflow-auto max-h-56">
                      {safeJsonPretty(c.clientValue ?? c.attemptedPayload)}
                    </pre>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-1">
                      Server version
                    </div>
                    <pre className="text-xs bg-muted/40 rounded p-2 overflow-auto max-h-56">
                      {safeJsonPretty(c.serverValue ?? c.serverError ?? "(not provided)")}
                    </pre>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    disabled={busyId === c.id}
                    onClick={() => markResolved(c, "keep-server")}
                    data-testid={`button-keep-server-${c.id}`}
                  >
                    Keep server version
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyId === c.id}
                    onClick={() => markResolved(c, "keep-local")}
                    data-testid={`button-keep-local-${c.id}`}
                  >
                    Retry my version
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === c.id}
                    onClick={() => markResolved(c, "discard")}
                    data-testid={`button-discard-${c.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Discard
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      ))}
    </div>
  );
}
