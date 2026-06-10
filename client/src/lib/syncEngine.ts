/**
 * VaxPlan Sync Engine
 *
 * Manages bi-directional sync between the local IndexedDB (Dexie)
 * and the remote PostgreSQL server.
 *
 * Responsibilities:
 *   1. flush()  — drain the outbox queue to the server (push mutations)
 *   2. pull()   — fetch server-side changes since last sync, write to IndexedDB
 *   3. sync()   — flush + pull in the correct order
 *   4. Auto-trigger on 'online' events and periodic wake-ups
 */

import {
  offlineDb,
  getLastSyncAt,
  setLastSyncAt,
  bulkSyncEntities,
  acquireOutboxLease,
  releaseOutboxLease,
  type OutboxItem,
  clearLocalTenantCache,
  getDbFingerprint,
  setDbFingerprint,
} from "./offlineDb";
import { onNetworkChange, isOnline } from "./platformNetwork";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SyncStatus =
  | "idle"
  | "syncing"
  | "success"
  | "error"
  | "offline";

export interface SyncState {
  status: SyncStatus;
  /** Items still eligible to be sent (retries < MAX_RETRIES). */
  pendingCount: number;
  /** Items that have exhausted all retries and need manual reset. */
  stuckCount: number;
  lastSyncAt: string | null;
  errorMessage: string | null;
  currentStage?: string;
  progressPercent?: number;
}

type SyncListener = (state: SyncState) => void;

// ─── Pull payload shape (mirrors GET /api/sync/pull response) ────────────────

interface PullPayload {
  serverTime: string;       // ISO — becomes the new lastSyncAt
  databaseFingerprint?: string;
  regions?: any[];
  provinces?: any[];
  districts?: any[];
  llgs?: any[];
  facilities?: any[];
  villages?: any[];
  clients?: any[];
  clientVaccinations?: any[];
  sessionPlans?: any[];
  sessionDayPlans?: any[];
  budgetItems?: any[]; // COMMENT: Added budgetItems for offline budget planning sync
  mobilizationActivities?: any[]; // COMMENT: Added mobilizationActivities for offline mobilization activities sync
  stockTransactions?: any[];
  monthlyReports?: any[];
  populationData?: any[];
  vaccineConfigs?: any[];
}

// ─── Outbox flush result (mirrors POST /api/sync/batch response) ─────────────

interface BatchResult {
  results: {
    outboxId: number;
    success: boolean;
    error?: string;
    serverId?: string | number;
    /** Populated by the server's mark-done outbox handler (Task #106). */
    unmappedAntigenCodes?: string[];
    /**
     * Populated by the server's session PATCH outbox handler (Task #181)
     * when a queued offline edit would have triggered the proximity/
     * population guard had it been issued online. The edit is still applied
     * (we can't lose offline work) — these warnings are surfaced as a
     * review-toast so the clerk can sanity-check the result.
     */
    proximityWarnings?: string[];
    proximityNearbySessions?: { id: number; name: string; scheduledDate: string; distanceKm: number; targetPopulation: number }[];
  }[];
}

/**
 * Dispatched on `window` whenever an offline-queued mark-done is replayed
 * and the server reports antigen codes outside the tenant's vaccine
 * schedule. A root-level listener (see useUnmappedAntigenWarnings) converts
 * this into a toast so health workers see the warning even though the
 * original mark-done UI is long gone.
 */
export const UNMAPPED_ANTIGENS_EVENT = "vaxplan:unmapped-antigens";

export interface UnmappedAntigensEventDetail {
  source: "outbox-replay";
  sessionId: number | string | null;
  unmappedAntigenCodes: string[];
}

/**
 * Task #181 — Dispatched on `window` whenever an offline-queued session
 * PATCH is replayed and the server reports that the change would have
 * tripped the online proximity/population guard. A root-level listener
 * (useProximityConflictWarnings) converts this into a toast so the clerk
 * is told to review the synced edit.
 */
export const PROXIMITY_CONFLICT_EVENT = "vaxplan:proximity-conflict";

export interface ProximityConflictEventDetail {
  source: "outbox-replay";
  sessionId: number | string | null;
  warnings: string[];
  nearbySessions: { id: number; name: string; scheduledDate: string; distanceKm: number; targetPopulation: number }[];
}

// ─── Sync Engine ─────────────────────────────────────────────────────────────

const MAX_RETRIES = 5;

class SyncEngine {
  private listeners: Set<SyncListener> = new Set();
  private _state: SyncState = {
    status: "idle",
    pendingCount: 0,
    stuckCount: 0,
    lastSyncAt: null,
    errorMessage: null,
    currentStage: "",
    progressPercent: 0,
  };
  private syncing = false;
  private periodicTimer: ReturnType<typeof setInterval> | null = null;
  private networkUnsub: (() => void) | null = null;
  private _initializedTenantId: string | null = null;

  // ── State management ──────────────────────────────────────────────────────

  get state(): SyncState {
    return this._state;
  }

  private setState(patch: Partial<SyncState>) {
    this._state = { ...this._state, ...patch };
    this.listeners.forEach((fn) => fn(this._state));
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this._state);
    return () => this.listeners.delete(listener);
  }

  // ── Initialization ────────────────────────────────────────────────────────

  async init(tenantId: string) {
    // Idempotency guard — prevents infinite re-render loops.
    // useSyncEngine calls init() on every render; without this guard,
    // setState() fires → subscriber updates → React re-render → init() again → loop.
    if (this._initializedTenantId === tenantId) return;
    this._initializedTenantId = tenantId;

    // Detect active-tenant change across page loads and wipe the Dexie
    // replica before syncing the new tenant.  Without this, records from
    // previously-visited countries accumulate in the shared Dexie tables
    // and show up as cross-country data mixing.
    const _prevTenantRow = await offlineDb.syncMeta.get("syncedTenantId");
    if (_prevTenantRow?.value && _prevTenantRow.value !== tenantId) {
      await clearLocalTenantCache();
      await offlineDb.syncMeta.delete("lastSyncAt");
    }
    await offlineDb.syncMeta.put({ key: "syncedTenantId", value: tenantId });

    // Load persisted last-sync time
    const lastSyncAt = await getLastSyncAt();
    const { pendingCount, stuckCount } = await this._countOutbox(tenantId);
    this.setState({ lastSyncAt, pendingCount, stuckCount });

    // Trigger sync on connectivity change — unified across Web, Android, and Windows.
    // Replaces the raw window.addEventListener('online') which is unreliable on
    // Android WebView and unavailable in Electron's main process.
    if (this.networkUnsub) this.networkUnsub();
    this.networkUnsub = onNetworkChange((online) => {
      if (online && this._state.status !== "syncing") {
        this.sync(tenantId, { silent: true });
      } else if (!online) {
        this.setState({ status: "offline", currentStage: "Offline", progressPercent: 0 });
      }
    });

    // Clear any existing periodic timer before creating a new one (prevents leaks)
    if (this.periodicTimer) clearInterval(this.periodicTimer);

    // Periodic sync every 5 minutes (best-effort — the network event handles the
    // fast path; this is a safety net for any missed events)
    this.periodicTimer = setInterval(() => {
      if (navigator.onLine && this._state.status !== "syncing") {
        this.sync(tenantId, { silent: true });
      }
    }, 5 * 60 * 1000);

    // If we're online right now, sync immediately. For returning users (a
    // persisted lastSyncAt already exists) this on-load refresh runs silently
    // so it never interrupts. On true first run (no lastSyncAt) we sync
    // visibly so the FirstRunSync setup screen can show progress.
    isOnline().then((online) => {
      if (online) {
        this.sync(tenantId, { silent: !!lastSyncAt });
      } else {
        this.setState({ status: "offline", currentStage: "Offline", progressPercent: 0 });
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Returns { pendingCount, stuckCount } for the tenant's outbox.
   *  pendingCount = items still eligible (retries < MAX_RETRIES)
   *  stuckCount   = items that have exhausted all retries
   */
  private async _countOutbox(tenantId: string): Promise<{ pendingCount: number; stuckCount: number }> {
    const all = await offlineDb.outbox.where("tenantId").equals(tenantId).toArray();
    const pendingCount = all.filter((i) => i.retries < MAX_RETRIES).length;
    const stuckCount = all.length - pendingCount;
    return { pendingCount, stuckCount };
  }

  // ── Core: flush outbox → server ───────────────────────────────────────────

  async flush(tenantId: string, opts: { manual?: boolean } = {}): Promise<void> {
    // Acquire a cross-context lease so the Service Worker's Background
    // Sync drain and this in-page flush can never POST the same outbox
    // rows concurrently. If the SW currently holds it, we no-op — the
    // SW will finish and broadcast OUTBOX_SYNC_FINISHED, which refreshes
    // pendingCount in the UI.
    const leaseOwner = `page-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const lease = await acquireOutboxLease(leaseOwner);
    if (!lease) {
      this.setState({
        currentStage: "Background sync already running — waiting...",
        progressPercent: 30,
      });
      return;
    }

    try {
      // On a manual Sync Now, reset stuck items so they get another attempt
      // instead of being silently skipped. Background/silent syncs leave them
      // alone to avoid flooding a persistently-failing endpoint.
      if (opts.manual) {
        const stuck = await offlineDb.outbox
          .where("tenantId")
          .equals(tenantId)
          .filter((item) => item.retries >= MAX_RETRIES)
          .toArray();
        if (stuck.length > 0) {
          await offlineDb.transaction("rw", offlineDb.outbox, async () => {
            for (const item of stuck) {
              if (item.id !== undefined) {
                await offlineDb.outbox.update(item.id, { retries: 0, lastError: undefined });
              }
            }
          });
          this.setState({
            currentStage: `Retrying ${stuck.length} previously-failed item(s)…`,
            progressPercent: 10,
            stuckCount: 0,
          });
        }
      }

    const pending = await offlineDb.outbox
      .where("tenantId")
      .equals(tenantId)
      .filter((item) => item.retries < MAX_RETRIES)
      .toArray();

    if (pending.length === 0) {
      // Look to see if there are permanently failed items.
      const totalPending = await offlineDb.outbox.where("tenantId").equals(tenantId).count();
      if (totalPending > 0) {
        this.setState({ currentStage: "Outbox has items that failed too many times.", progressPercent: 30, status: "error", errorMessage: "Some records failed to sync repeatedly." });
      } else {
        this.setState({ currentStage: "Outbox clean. No local changes to push.", progressPercent: 30 });
      }
      return;
    }

    this.setState({
      currentStage: `Pushing ${pending.length} local changes to server...`,
      progressPercent: 15,
    });

    try {
      const resp = await fetch("/api/sync/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mutations: pending }),
      });

      if (!resp.ok) throw new Error(`Batch sync failed: ${resp.status}`);

      const { results } = (await resp.json()) as BatchResult;

      this.setState({
        currentStage: `Applying outbox mutation responses locally...`,
        progressPercent: 40,
      });

      // Process results
      const unmappedEvents: UnmappedAntigensEventDetail[] = [];
      const proximityEvents: ProximityConflictEventDetail[] = [];
      await offlineDb.transaction("rw", offlineDb.outbox, async () => {
        for (const result of results) {
          if (result.success) {
            // Task #106: surface unmapped antigen warning even though the
            // original mark-done UI is long gone by the time the outbox
            // replays. Collect now, dispatch after the tx commits.
            if (result.unmappedAntigenCodes && result.unmappedAntigenCodes.length > 0) {
              const item = pending.find((p) => p.id === result.outboxId);
              unmappedEvents.push({
                source: "outbox-replay",
                sessionId: item?.serverId ?? result.serverId ?? null,
                unmappedAntigenCodes: result.unmappedAntigenCodes,
              });
            }
            // Task #181: queued session edit was applied but tripped the
            // proximity/population guard the online path would have blocked.
            if (result.proximityWarnings && result.proximityWarnings.length > 0) {
              const item = pending.find((p) => p.id === result.outboxId);
              proximityEvents.push({
                source: "outbox-replay",
                sessionId: item?.serverId ?? result.serverId ?? null,
                warnings: result.proximityWarnings,
                nearbySessions: result.proximityNearbySessions ?? [],
              });
            }
            await offlineDb.outbox.delete(result.outboxId);
          } else {
            const item = pending.find((p) => p.id === result.outboxId);
            if (item?.id !== undefined) {
              await offlineDb.outbox.update(item.id, {
                retries: (item.retries ?? 0) + 1,
                lastError: result.error ?? "Unknown error",
              });
            }
          }
        }
      });
      if (unmappedEvents.length > 0 && typeof window !== "undefined") {
        for (const detail of unmappedEvents) {
          window.dispatchEvent(
            new CustomEvent<UnmappedAntigensEventDetail>(UNMAPPED_ANTIGENS_EVENT, { detail }),
          );
        }
      }
      if (proximityEvents.length > 0 && typeof window !== "undefined") {
        for (const detail of proximityEvents) {
          window.dispatchEvent(
            new CustomEvent<ProximityConflictEventDetail>(PROXIMITY_CONFLICT_EVENT, { detail }),
          );
        }
      }

      const { pendingCount, stuckCount } = await this._countOutbox(tenantId);
      this.setState({ pendingCount, stuckCount, currentStage: "Outbox flushed successfully.", progressPercent: 50 });
    } catch (err: any) {
      // Increment retries on all items
      await Promise.all(
        pending.map((item) =>
          item.id !== undefined
            ? offlineDb.outbox.update(item.id, {
                retries: (item.retries ?? 0) + 1,
                lastError: String(err?.message ?? err),
              })
            : Promise.resolve(),
        ),
      );
      throw err;
    }
    } finally {
      await releaseOutboxLease(leaseOwner);
    }
  }

  // ── Core: pull server changes → IndexedDB ─────────────────────────────────

  async pull(tenantId: string): Promise<void> {
    const since = await getLastSyncAt();
    const params = new URLSearchParams({ tenantId });
    if (since) params.append("since", since);

    this.setState({
      currentStage: "Fetching server updates...",
      progressPercent: 55,
    });

    const resp = await fetch(`/api/sync/pull?${params}`, {
      credentials: "include",
    });

    if (!resp.ok) throw new Error(`Pull failed: ${resp.status}`);

    let payload: PullPayload = await resp.json();

    // Check database fingerprint to detect server database resets or seeding wipes
    const currentFingerprint = payload.databaseFingerprint;
    const storedFingerprint = await getDbFingerprint();

    if (currentFingerprint && currentFingerprint !== storedFingerprint) {
      console.warn("[sync] Database fingerprint mismatch! Clearing local cache.");
      await clearLocalTenantCache();
      await setDbFingerprint(currentFingerprint);

      // If since was not null, we need to fetch a fresh full replica of all data
      if (since !== null) {
        this.setState({
          currentStage: "Database reset detected. Fetching fresh full replica...",
          progressPercent: 57,
        });
        const freshParams = new URLSearchParams({ tenantId });
        const freshResp = await fetch(`/api/sync/pull?${freshParams}`, {
          credentials: "include",
        });
        if (!freshResp.ok) throw new Error(`Full sync pull failed: ${freshResp.status}`);
        payload = await freshResp.json();
      }
    } else if (currentFingerprint && !storedFingerprint) {
      // Save fingerprint on first sync without wiping cache
      await setDbFingerprint(currentFingerprint);
    }

    this.setState({
      currentStage: "Processing received server updates...",
      progressPercent: 70,
    });

    // Sequentially write table changes to Dexie and update progress percentage
    if (payload.regions) {
      this.setState({ currentStage: `Syncing Regions (${payload.regions.length} records)...`, progressPercent: 72 });
      await bulkSyncEntities(offlineDb.regions, payload.regions.map(stamp));
    }
    if (payload.provinces) {
      this.setState({ currentStage: `Syncing Provinces (${payload.provinces.length} records)...`, progressPercent: 74 });
      await bulkSyncEntities(offlineDb.provinces, payload.provinces.map(stamp));
    }
    if (payload.districts) {
      this.setState({ currentStage: `Syncing Districts (${payload.districts.length} records)...`, progressPercent: 76 });
      await bulkSyncEntities(offlineDb.districts, payload.districts.map(stamp));
    }
    if (payload.llgs) {
      this.setState({ currentStage: `Syncing LLGs/Wards (${payload.llgs.length} records)...`, progressPercent: 78 });
      await bulkSyncEntities(offlineDb.llgs, payload.llgs.map(stamp));
    }
    if (payload.facilities) {
      this.setState({ currentStage: `Syncing Facilities (${payload.facilities.length} records)...`, progressPercent: 80 });
      await bulkSyncEntities(offlineDb.facilities, payload.facilities.map(stamp));
    }
    if (payload.villages) {
      this.setState({ currentStage: `Syncing Villages/Communities (${payload.villages.length} records)...`, progressPercent: 82 });
      await bulkSyncEntities(offlineDb.villages, payload.villages.map(stamp));
    }
    if (payload.clients) {
      this.setState({ currentStage: `Syncing Clients (${payload.clients.length} records)...`, progressPercent: 84 });
      await bulkSyncEntities(offlineDb.clients, payload.clients.map(stamp));
    }
    if (payload.clientVaccinations) {
      this.setState({ currentStage: `Syncing Vaccinations (${payload.clientVaccinations.length} records)...`, progressPercent: 86 });
      await bulkSyncEntities(offlineDb.clientVaccinations, payload.clientVaccinations.map(stamp));
    }
    if (payload.sessionPlans) {
      this.setState({ currentStage: `Syncing Session Plans (${payload.sessionPlans.length} records)...`, progressPercent: 88 });
      await bulkSyncEntities(offlineDb.sessionPlans, payload.sessionPlans.map(stamp));
    }
    if (payload.sessionDayPlans) {
      this.setState({ currentStage: `Syncing Session Day Plans (${payload.sessionDayPlans.length} records)...`, progressPercent: 89 });
      await bulkSyncEntities(offlineDb.sessionDayPlans, payload.sessionDayPlans.map(stamp));
    }
    if (payload.budgetItems) {
      this.setState({ currentStage: `Syncing Budget Items (${payload.budgetItems.length} records)...`, progressPercent: 90 });
      await bulkSyncEntities(offlineDb.budgetItems, payload.budgetItems.map(stamp));
    }
    if (payload.mobilizationActivities) {
      this.setState({ currentStage: `Syncing Social Mobilization (${payload.mobilizationActivities.length} records)...`, progressPercent: 92 });
      await bulkSyncEntities(offlineDb.mobilizationActivities, payload.mobilizationActivities.map(stamp));
    }
    if (payload.stockTransactions) {
      this.setState({ currentStage: `Syncing Stock Ledger (${payload.stockTransactions.length} records)...`, progressPercent: 94 });
      await bulkSyncEntities(offlineDb.stockTransactions, payload.stockTransactions.map(stamp));
    }
    if (payload.monthlyReports) {
      this.setState({ currentStage: `Syncing Monthly Reports (${payload.monthlyReports.length} records)...`, progressPercent: 96 });
      await bulkSyncEntities(offlineDb.monthlyReports, payload.monthlyReports.map(stamp));
    }
    if (payload.populationData) {
      this.setState({ currentStage: `Syncing Population Data (${payload.populationData.length} records)...`, progressPercent: 97 });
      await bulkSyncEntities(offlineDb.populationData, payload.populationData.map(stamp));
    }
    if (payload.vaccineConfigs) {
      this.setState({ currentStage: `Syncing Vaccine Configurations (${payload.vaccineConfigs.length} records)...`, progressPercent: 98 });
      await bulkSyncEntities(offlineDb.vaccineConfigs, payload.vaccineConfigs.map(stamp));
    }

    await setLastSyncAt(payload.serverTime);
    this.setState({ lastSyncAt: payload.serverTime });
  }

  // ── Orchestrator ──────────────────────────────────────────────────────────

  /**
   * @param opts.silent  When true, the sync runs entirely in the background
   *   without flipping the visible status into "syncing"/"error" (no progress
   *   banner, no spinner, no error banner). Automatic triggers — connectivity
   *   changes, the periodic safety-net timer, the Service Worker background
   *   drain, and the on-load refresh for returning users — use this so routine
   *   syncing never interrupts the user. Only the last-sync time + pending
   *   count are updated. Manual "Sync Now" and first-run setup pass silent=false
   *   so they still show progress.
   * @param opts.forceRetry When true, resets retries on permanently failed outbox items so they can be retried.
   */
  async sync(tenantId: string, opts: { silent?: boolean; forceRetry?: boolean } = {}): Promise<void> {
    const silent = opts.silent ?? false;
    const manual = !silent;          // manual = user clicked "Sync Now"
    if (this.syncing) return;
    if (!navigator.onLine) {
      // Background polling stays quiet when offline; only an explicit sync
      // surfaces the offline state.
      if (!silent) {
        this.setState({ status: "offline", currentStage: "Offline", progressPercent: 0 });
      }
      return;
    }

    this.syncing = true;
    if (!silent) {
      this.setState({
        status: "syncing",
        errorMessage: null,
        currentStage: "Initializing sync...",
        progressPercent: 5,
      });
    }

    try {
      await this.flush(tenantId, { manual });   // push local changes first
      await this.pull(tenantId);    // then pull server changes
      if (silent) {
        // Silent: lastSyncAt was just updated in pull(); leave the UI calm.
        // Use "success" (banner stays hidden when there are no pending rows)
        // and clear any stale progress text without animating anything.
        this.setState({
          status: "success",
          currentStage: "",
          progressPercent: 0,
          errorMessage: null,
        });
      } else {
        this.setState({
          status: "success",
          currentStage: "Sync completed successfully!",
          progressPercent: 100,
        });
        // Clear stage after 3 seconds
        setTimeout(() => {
          if (this._state.status === "success") {
            this.setState({ currentStage: "", progressPercent: 0 });
          }
        }, 3000);
      }
    } catch (err: any) {
      console.error("[SyncEngine] sync failed:", err);
      if (silent) {
        // Background failure — stay quiet and keep the last-known state so we
        // don't flash a red banner during routine polling. Network/'online'
        // events and the periodic timer will retry.
        this.setState({
          status: navigator.onLine ? "idle" : "offline",
          currentStage: "",
          progressPercent: 0,
        });
      } else {
        this.setState({
          status: "error",
          errorMessage: err?.message ?? "Sync failed",
          currentStage: "Sync failed",
          progressPercent: 0,
        });
      }
    } finally {
      this.syncing = false;
    }
  }

  // ── Manual refresh of pending count ──────────────────────────────────────

  async refreshPendingCount(tenantId: string): Promise<void> {
    const { pendingCount, stuckCount } = await this._countOutbox(tenantId);
    this.setState({ pendingCount, stuckCount });
  }

  /** Tenant-less refresh used by SyncStatus when a SW Background Sync
   *  message arrives (works for the most recently initialized tenant). */
  async refreshPending(): Promise<void> {
    const tid = this._initializedTenantId;
    if (tid) {
      const { pendingCount, stuckCount } = await this._countOutbox(tid);
      this.setState({ pendingCount, stuckCount });
    } else {
      const all = await offlineDb.outbox.toArray();
      const pendingCount = all.filter((i) => i.retries < MAX_RETRIES).length;
      const stuckCount = all.length - pendingCount;
      this.setState({ pendingCount, stuckCount });
    }
  }

  /** React to SW-driven Background Sync activity. This is an automatic
   *  background drain, so it runs silently (no "Syncing" banner/spinner);
   *  we only refresh the pending count when it finishes. */
  reportBackgroundSync(phase: "started" | "finished", info?: { ok?: boolean; reason?: string }): void {
    // Service Worker Background Sync is, by definition, automatic — it must run
    // silently. We never flip the visible status into "syncing"/"error" here so
    // the outbox drains in the background without a banner or spinner. We only
    // refresh the pending count (and last-sync time) when it finishes so the
    // status badge stays accurate.
    if (phase === "started") return;
    void this.refreshPending();
  }

  /** Plain accessor for components that don't want the getter syntax. */
  getState(): SyncState {
    return this._state;
  }

  dispose() {
    if (this.periodicTimer) clearInterval(this.periodicTimer);
  }
}

/** Singleton — import this everywhere */
export const syncEngine = new SyncEngine();

// ─── Utility: stamp _syncedAt on pulled records ───────────────────────────

function stamp<T extends Record<string, any>>(row: T): T & { _syncedAt: number } {
  return { ...row, _syncedAt: Date.now() };
}
