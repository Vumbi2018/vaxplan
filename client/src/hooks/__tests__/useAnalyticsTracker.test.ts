/**
 * Regression guard for the "who's online" live-map startup defer
 * (useAnalyticsTracker).
 *
 * The live map shows each online user at their last known position. A device GPS
 * fix is precise; the IP-based fallback usually resolves only to the ISP's city
 * (frequently the capital). To stop the map pin from visibly flipping from the
 * IP city to the real GPS spot on first load, the hook holds back every beacon
 * (page-view + heartbeat) until the one-time GPS lookup settles, then flushes
 * the queued beacons IN ORDER so no visit-history page-view is dropped:
 *
 *   - Beacons fired before the GPS lookup settles are queued, not sent.
 *   - On GPS success they flush in order, carrying the precise coords.
 *   - On GPS failure/timeout they flush in order, carrying no coords (the server
 *     falls back to IP geo) — nothing is dropped.
 *   - On a device with no geolocation support at all, beacons are never deferred;
 *     they transmit immediately.
 *
 * If the defer ever regresses (beacons sent before GPS settles, or queued ones
 * never flushed), the pin starts jumping again or visits go missing. We mock the
 * hook's dependencies (a tiny synchronous `react` shim so effects run without a
 * DOM/renderer, a controllable wouter location, navigator.geolocation, and
 * fetch) and assert exactly what is transmitted and when.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Shared mock state. vi.hoisted runs before the vi.mock factories.
const h = vi.hoisted(() => ({
  // The effects are registered in declaration order: [0] = GPS lookup,
  // [1] = navigation page-view, [2] = heartbeat. We run them deterministically.
  effects: [] as Array<() => void | (() => void)>,
  location: "/dashboard",
  geoCallbacks: null as
    | {
        success: (pos: { coords: { latitude: number; longitude: number } }) => void;
        error: () => void;
      }
    | null,
  intervalCallback: null as (() => void) | null,
}));

// Minimal synchronous React shim: useRef returns a fresh holder; useEffect just
// records the effect so the test can invoke it in a controlled order. The hook
// only uses these two primitives.
vi.mock("react", () => ({
  useRef: (init: unknown) => ({ current: init }),
  useEffect: (fn: () => void | (() => void)) => {
    h.effects.push(fn);
  },
}));

vi.mock("wouter", () => ({
  useLocation: () => [h.location, () => {}],
}));

import { useAnalyticsTracker } from "../useAnalyticsTracker";

type Beacon = { path: string; heartbeat: boolean; hasCoords: boolean; lat?: number; lng?: number };

let fetchMock: ReturnType<typeof vi.fn>;

function sentBeacons(): Beacon[] {
  return fetchMock.mock.calls.map((call) => {
    const body = JSON.parse((call[1] as { body: string }).body);
    return {
      path: body.path,
      heartbeat: body.heartbeat,
      hasCoords: body.lat != null && body.lng != null,
      lat: body.lat,
      lng: body.lng,
    };
  });
}

// Run the registered effects: GPS lookup first (so geoCallbacks is captured),
// then the navigation effect (which fires the first page-view beacon).
function runStartupEffects() {
  // effects[0] = GPS lookup, effects[1] = navigation page-view.
  h.effects[0]?.();
  h.effects[1]?.();
}

beforeEach(() => {
  h.effects = [];
  h.location = "/dashboard";
  h.geoCallbacks = null;

  fetchMock = vi.fn(() => Promise.resolve({ ok: true }));
  vi.stubGlobal("fetch", fetchMock);

  // navigator with geolocation that captures the success/error callbacks so the
  // test controls when (and how) the one-time GPS lookup settles.
  vi.stubGlobal("navigator", {
    onLine: true,
    geolocation: {
      getCurrentPosition: (
        success: (pos: { coords: { latitude: number; longitude: number } }) => void,
        error: () => void,
      ) => {
        h.geoCallbacks = { success, error };
      },
    },
  });
  vi.stubGlobal("document", { visibilityState: "visible", addEventListener: () => {}, removeEventListener: () => {} });
  vi.stubGlobal("window", {
    setInterval: (cb: () => void) => {
      h.intervalCallback = cb;
      return 0;
    },
    clearInterval: () => {},
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useAnalyticsTracker — startup GPS defer", () => {
  it("queues beacons fired before GPS settles, then flushes them in order with coords on success", () => {
    useAnalyticsTracker(true);
    runStartupEffects();

    // The page-view fired during navigation must be HELD until GPS settles.
    expect(
      fetchMock,
      "A beacon was transmitted before the GPS lookup settled — the live-map " +
        "pin would publish the IP city first and then jump to GPS.",
    ).not.toHaveBeenCalled();
    expect(h.geoCallbacks).not.toBeNull();

    // GPS resolves with a precise position → the queued beacon flushes, now
    // carrying the device coordinates.
    h.geoCallbacks!.success({ coords: { latitude: -9.4438, longitude: 147.1803 } });

    const beacons = sentBeacons();
    expect(beacons).toHaveLength(1);
    expect(beacons[0].path).toBe("/dashboard");
    expect(beacons[0].heartbeat).toBe(false);
    expect(beacons[0].hasCoords).toBe(true);
    expect(beacons[0].lat).toBeCloseTo(-9.4438, 4);
    expect(beacons[0].lng).toBeCloseTo(147.1803, 4);
  });

  it("flushes queued beacons in order on GPS failure/timeout, carrying no coords", () => {
    // A single hook instance so all queued beacons share one pending queue.
    useAnalyticsTracker(true);
    h.effects[0]?.(); // GPS lookup (captures callbacks, does not settle yet)
    h.effects[1]?.(); // navigation → queues a page-view (heartbeat=false)
    h.effects[2]?.(); // heartbeat effect → registers the interval callback

    // A heartbeat fires before GPS settles → queues a second beacon (heartbeat=true).
    expect(h.intervalCallback).toBeTypeOf("function");
    h.intervalCallback!();

    // Nothing transmitted while GPS is still pending.
    expect(fetchMock).not.toHaveBeenCalled();

    // GPS fails (permission denied / timeout) → queued beacons flush in order,
    // with NO coords (server falls back to IP geo). Nothing is dropped.
    h.geoCallbacks!.error();

    const beacons = sentBeacons();
    // Order preserved: the page-view queued first, the heartbeat queued second.
    expect(beacons.map((b) => b.heartbeat)).toEqual([false, true]);
    expect(beacons.map((b) => b.path)).toEqual(["/dashboard", "/dashboard"]);
    expect(beacons.every((b) => !b.hasCoords)).toBe(true);
  });

  it("transmits immediately (no defer) when geolocation is unsupported", () => {
    // A device with no geolocation at all — nothing to wait for.
    vi.stubGlobal("navigator", { onLine: true });

    useAnalyticsTracker(true);
    runStartupEffects();

    // The page-view is sent right away (no queue), with no coords.
    const beacons = sentBeacons();
    expect(beacons).toHaveLength(1);
    expect(beacons[0].path).toBe("/dashboard");
    expect(beacons[0].hasCoords).toBe(false);
  });
});
