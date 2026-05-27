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
  type OutboxItem,
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
  pendingCount: number;
  lastSyncAt: string | null;
  errorMessage: string | null;
  currentStage?: string;
  progressPercent?: number;
}

type SyncListener = (state: SyncState) => void;

// ─── Pull payload shape (mirrors GET /api/sync/pull response) ────────────────

interface PullPayload {
  serverTime: string;       // ISO — becomes the new lastSyncAt
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
  results: { outboxId: number; success: boolean; error?: string; serverId?: string | number }[];
}

// ─── Sync Engine ─────────────────────────────────────────────────────────────

const MAX_RETRIES = 5;

class SyncEngine {
  private listeners: Set<SyncListener> = new Set();
  private _state: SyncState = {
    status: "idle",
    pendingCount: 0,
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

    // Load persisted last-sync time
    const lastSyncAt = await getLastSyncAt();
    const pendingCount = await offlineDb.outbox
      .where("tenantId")
      .equals(tenantId)
      .count();
    this.setState({ lastSyncAt, pendingCount });

    // Trigger sync on connectivity change — unified across Web, Android, and Windows.
    // Replaces the raw window.addEventListener('online') which is unreliable on
    // Android WebView and unavailable in Electron's main process.
    if (this.networkUnsub) this.networkUnsub();
    this.networkUnsub = onNetworkChange((online) => {
      if (online && this._state.status !== "syncing") {
        this.sync(tenantId);
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
        this.sync(tenantId);
      }
    }, 5 * 60 * 1000);

    // If we're online right now, sync immediately
    isOnline().then((online) => {
      if (online) {
        this.sync(tenantId);
      } else {
        this.setState({ status: "offline", currentStage: "Offline", progressPercent: 0 });
      }
    });
  }

  // ── Core: flush outbox → server ───────────────────────────────────────────

  async flush(tenantId: string): Promise<void> {
    const pending = await offlineDb.outbox
      .where("tenantId")
      .equals(tenantId)
      .filter((item) => item.retries < MAX_RETRIES)
      .toArray();

    if (pending.length === 0) {
      this.setState({ currentStage: "Outbox clean. No local changes to push.", progressPercent: 30 });
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
      await offlineDb.transaction("rw", offlineDb.outbox, async () => {
        for (const result of results) {
          if (result.success) {
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

      const pendingCount = await offlineDb.outbox
        .where("tenantId")
        .equals(tenantId)
        .count();
      this.setState({ pendingCount, currentStage: "Outbox flushed successfully.", progressPercent: 50 });
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

    const payload: PullPayload = await resp.json();

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

  async sync(tenantId: string): Promise<void> {
    if (this.syncing) return;
    if (!navigator.onLine) {
      this.setState({ status: "offline", currentStage: "Offline", progressPercent: 0 });
      return;
    }

    this.syncing = true;
    this.setState({
      status: "syncing",
      errorMessage: null,
      currentStage: "Initializing sync...",
      progressPercent: 5,
    });

    try {
      await this.flush(tenantId);   // push local changes first
      await this.pull(tenantId);    // then pull server changes
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
    } catch (err: any) {
      console.error("[SyncEngine] sync failed:", err);
      this.setState({
        status: "error",
        errorMessage: err?.message ?? "Sync failed",
        currentStage: "Sync failed",
        progressPercent: 0,
      });
    } finally {
      this.syncing = false;
    }
  }

  // ── Manual refresh of pending count ──────────────────────────────────────

  async refreshPendingCount(tenantId: string): Promise<void> {
    const pendingCount = await offlineDb.outbox
      .where("tenantId")
      .equals(tenantId)
      .count();
    this.setState({ pendingCount });
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
