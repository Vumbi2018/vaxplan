/**
 * Regression guard for cross-tenant live-sync refresh (useRealtimeSync).
 *
 * The real-time "changed" poke channel is tenant-scoped: the open tab subscribes
 * to whichever tenant it is *viewing* (cross-tenant browsing), but the offline
 * SyncEngine only maintains the partition for the user's *home* tenant. So a poke
 * must drive two independent effects with different rules:
 *
 *   - Visible data is ALWAYS refreshed (React Query invalidation). Refetches carry
 *     the active x-tenant-id header, so they refresh whichever tenant is being
 *     viewed — including a foreign tenant during cross-tenant browsing.
 *   - The offline replica is refreshed (silent syncEngine.sync) ONLY when the
 *     subscribed tenant is the user's home tenant. Syncing it for a foreign viewed
 *     tenant would point the single local replica at the wrong partition and
 *     silently corrupt it.
 *
 * The danger this test locks in: a regression that either (a) syncs the offline
 * replica while viewing another tenant (wrong-partition corruption) or (b) stops
 * syncing on a home-tenant poke (stale offline data). We mock the hook's
 * dependencies (including a tiny synchronous `react` shim so the effect runs
 * without a DOM/renderer), capture the RealtimeClient onChange callback, fire a
 * poke, and assert exactly which effects ran.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const TENANT_A = "11111111-1111-4111-8111-111111111111"; // home tenant
const TENANT_B = "22222222-2222-4222-8222-222222222222"; // a foreign viewed tenant

// Shared mock state. vi.hoisted runs before the vi.mock factories (which are
// themselves hoisted above the imports), so the factories can safely reference it.
const h = vi.hoisted(() => ({
  capturedOnChange: null as ((msg: unknown) => void) | null,
  connectCalls: [] as string[],
  disconnectCalls: 0,
  invalidateSpy: vi.fn(),
  syncSpy: vi.fn(),
  user: null as unknown,
  activeTenant: null as unknown,
}));

// Minimal synchronous React shim: useRef returns a fresh holder and useEffect
// runs the effect immediately. The hook only uses these two primitives.
vi.mock("react", () => ({
  useRef: (init: unknown) => ({ current: init }),
  useEffect: (fn: () => void) => {
    fn();
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: h.user }),
}));

vi.mock("@/lib/tenantCache", () => ({
  loadActiveTenant: () => h.activeTenant,
}));

vi.mock("@/lib/queryClient", () => ({
  queryClient: { invalidateQueries: h.invalidateSpy },
}));

vi.mock("@/lib/syncEngine", () => ({
  syncEngine: { sync: h.syncSpy },
}));

vi.mock("@/lib/realtimeClient", () => ({
  RealtimeClient: class {
    constructor(onChange: (msg: unknown) => void) {
      h.capturedOnChange = onChange;
    }
    connect(tenantId: string) {
      h.connectCalls.push(tenantId);
    }
    disconnect() {
      h.disconnectCalls += 1;
    }
  },
}));

import { useRealtimeSync } from "../useRealtimeSync";

beforeEach(() => {
  h.capturedOnChange = null;
  h.connectCalls.length = 0;
  h.disconnectCalls = 0;
  h.invalidateSpy.mockReset();
  h.syncSpy.mockReset();
  h.user = null;
  h.activeTenant = null;
});

describe("useRealtimeSync — cross-tenant live-sync refresh", () => {
  it("subscribes to the viewed tenant and only invalidates queries (no home-replica sync) when viewing a foreign tenant", () => {
    // Home tenant is A, but the tab is currently viewing tenant B.
    h.user = { id: "user-1", tenantId: TENANT_A };
    h.activeTenant = { id: TENANT_B };

    useRealtimeSync();

    // The websocket is subscribed to the VIEWED tenant (B), not the home tenant.
    expect(h.connectCalls).toEqual([TENANT_B]);
    expect(h.capturedOnChange).toBeTypeOf("function");

    // A "changed" poke arrives for tenant B (the one we're viewing).
    h.capturedOnChange!({ type: "changed", tenantId: TENANT_B });

    // Visible data is refreshed via query invalidation (the refetch carries B's
    // x-tenant-id header, so it is scoped to B).
    expect(h.invalidateSpy).toHaveBeenCalledTimes(1);

    // The invalidation targets only /api React Query caches.
    const predicate = (h.invalidateSpy.mock.calls[0][0] as { predicate: (q: unknown) => boolean }).predicate;
    expect(predicate({ queryKey: ["/api/facilities"] })).toBe(true);
    expect(predicate({ queryKey: ["local-only"] })).toBe(false);
    expect(predicate({ queryKey: [] })).toBe(false);

    // Crucially, the offline replica (home tenant A) is NOT synced for a poke
    // about a foreign viewed tenant — that would corrupt the single local
    // partition by pointing it at the wrong tenant.
    expect(h.syncSpy).not.toHaveBeenCalled();
  });

  it("triggers a silent home-replica sync when the poke is for the user's home tenant", () => {
    // Home tenant is A and the tab is viewing A (no cross-tenant browsing).
    h.user = { id: "user-1", tenantId: TENANT_A };
    h.activeTenant = { id: TENANT_A };

    useRealtimeSync();

    expect(h.connectCalls).toEqual([TENANT_A]);

    h.capturedOnChange!({ type: "changed", tenantId: TENANT_A });

    // Visible data still refreshed...
    expect(h.invalidateSpy).toHaveBeenCalledTimes(1);
    // ...and the offline replica is refreshed silently for the home partition.
    expect(h.syncSpy).toHaveBeenCalledTimes(1);
    expect(h.syncSpy).toHaveBeenCalledWith(TENANT_A, { silent: true });
  });

  it("falls back to the user's home tenant when no active tenant is cached, and syncs the replica", () => {
    // No cached active tenant (e.g. first load) — the hook falls back to the
    // user's home tenant, which means a poke does sync the offline replica.
    h.user = { id: "user-1", tenantId: TENANT_A };
    h.activeTenant = null;

    useRealtimeSync();

    expect(h.connectCalls).toEqual([TENANT_A]);

    h.capturedOnChange!({ type: "changed", tenantId: TENANT_A });

    expect(h.invalidateSpy).toHaveBeenCalledTimes(1);
    expect(h.syncSpy).toHaveBeenCalledWith(TENANT_A, { silent: true });
  });
});
