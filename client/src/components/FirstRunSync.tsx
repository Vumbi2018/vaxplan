/**
 * First-run sync screen (Task #232 step 3).
 *
 * Renders a blocking overlay the very first time an installer launches
 * with a logged-in session, while the SyncEngine pulls the user's tenant
 * scope into the local Dexie replica. Once the minimum required tier
 * (reference data + facilities + villages) has landed, the user can
 * enter the app — GIS basemaps and rasters keep downloading in the
 * background.
 *
 * "First run" is detected by the absence of a persisted `lastSyncAt` in
 * syncMeta. After the first successful pull we never show this again.
 */

import { useEffect, useState } from "react";
import { syncEngine, type SyncState } from "@/lib/syncEngine";
import { offlineDb } from "@/lib/offlineDb";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, WifiOff } from "lucide-react";

interface FirstRunSyncProps {
  tenantId: string | null | undefined;
  /** Called when the user can proceed into the app (sync done or skipped). */
  onReady: () => void;
}

export function FirstRunSync({ tenantId, onReady }: FirstRunSyncProps) {
  const [needsSync, setNeedsSync] = useState<boolean | null>(null);
  const [state, setState] = useState<SyncState>(syncEngine.getState());

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const last = await offlineDb.syncMeta.get("lastSyncAt");
        // Already initialised → skip the screen entirely.
        if (last?.value) {
          if (alive) {
            setNeedsSync(false);
            onReady();
          }
          return;
        }
      } catch {
        /* ignore — fall through to sync attempt */
      }
      if (alive) setNeedsSync(true);
    })();
    return () => {
      alive = false;
    };
  }, [onReady]);

  useEffect(() => {
    if (!needsSync || !tenantId) return;
    const unsub = syncEngine.subscribe(setState);
    syncEngine.sync(tenantId);
    return unsub;
  }, [needsSync, tenantId]);

  useEffect(() => {
    if (state.status === "success") {
      // First-run complete — let the user in.
      const t = setTimeout(onReady, 600);
      return () => clearTimeout(t);
    }
  }, [state.status, onReady]);

  if (needsSync !== true) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] bg-background flex items-center justify-center p-6"
      role="dialog"
      aria-label="First-run sync"
      data-testid="first-run-sync"
    >
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          {state.status === "offline" ? (
            <WifiOff className="h-12 w-12 text-muted-foreground" />
          ) : state.status === "success" ? (
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          ) : (
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Setting up VaxPlan</h1>
          <p className="text-sm text-muted-foreground mt-2">
            We're downloading your facilities, villages, vaccine schedule, and
            map data so you can work offline. This usually takes a few minutes
            over a regular connection.
          </p>
        </div>
        {state.status === "offline" ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">
              You're offline. Connect to the internet to finish first-time
              setup.
            </p>
            <Button variant="outline" onClick={onReady} data-testid="button-skip-first-run">
              Continue offline (limited)
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Progress
              value={state.progressPercent ?? 0}
              className="h-2"
              data-testid="first-run-progress"
            />
            <p className="text-xs text-muted-foreground min-h-[1rem]">
              {state.currentStage || "Preparing..."}
            </p>
            {state.status === "error" && (
              <div className="space-y-2">
                <p className="text-sm text-destructive">
                  {state.errorMessage ?? "Sync failed."}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    size="sm"
                    onClick={() => tenantId && syncEngine.sync(tenantId)}
                    data-testid="button-retry-first-run"
                  >
                    Retry
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onReady}
                    data-testid="button-skip-first-run-error"
                  >
                    Continue anyway
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
