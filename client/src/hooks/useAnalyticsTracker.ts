import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

// Records page navigations and keeps a logged-in user counted as "online" for
// the dashboard "Site activity" panel.
//
// Two signals are sent to /api/analytics/track (fire-and-forget — a bare fetch,
// NOT apiRequest, so analytics is never queued in the offline outbox and a
// failed beacon never disrupts navigation):
//   1. A page-view on every route change (counts toward visit history).
//   2. A lightweight heartbeat on an interval while the tab is open, so a user
//      who logs in and then reads one page without navigating still shows as
//      online (otherwise they "drop off" after 5 minutes of inactivity).
//
// When the browser grants location permission, the device's real GPS position
// is included so the live map shows where the user actually is. IP-based
// geolocation often resolves only to the ISP's registered city (frequently the
// capital), so without GPS the map can be far from the user's true location.

const HEARTBEAT_MS = 120_000; // 2 min — comfortably inside the 5-min online window

export function useAnalyticsTracker(enabled: boolean) {
  const [location] = useLocation();
  const lastTracked = useRef<string>("");
  const coords = useRef<{ lat: number; lng: number } | null>(null);
  const locationRef = useRef<string>(location);
  locationRef.current = location;

  // Until the one-time GPS lookup settles (success OR failure/timeout), hold
  // back beacons. Otherwise the first heartbeat/page-view publishes the coarse
  // IP location (often the capital) and the live-map pin visibly jumps to the
  // user's real GPS position a moment later. We queue any beacons fired during
  // this brief window (bounded by the 8s GPS timeout) and flush them in order
  // once GPS settles, so no page-view (visit history) is dropped.
  const gpsSettled = useRef(false);
  const pending = useRef<Array<{ path: string; heartbeat: boolean }>>([]);
  const geoSupported =
    typeof navigator !== "undefined" && !!navigator.geolocation;

  const flushPending = () => {
    const queued = pending.current;
    pending.current = [];
    for (const p of queued) transmit(p.path, p.heartbeat);
  };

  const transmit = (path: string, heartbeat: boolean) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const body: Record<string, unknown> = { path, heartbeat };
    if (coords.current) {
      body.lat = coords.current.lat;
      body.lng = coords.current.lng;
    }
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {
      // non-critical — ignore
    });
  };

  const send = (path: string, heartbeat: boolean) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    // Defer beacons until the GPS attempt resolves so we never publish an IP
    // location that immediately flips to GPS. Once settled (or on a device with
    // no geolocation at all) every beacon is sent right away.
    if (enabled && geoSupported && !gpsSettled.current) {
      pending.current.push({ path, heartbeat });
      return;
    }
    transmit(path, heartbeat);
  };

  // Ask for the device location once (the browser remembers the choice). On
  // success store the precise position; either way mark the GPS attempt settled
  // and flush any beacon that was held back during startup so the live map
  // shows the real GPS location from the first ping (never the IP city first).
  useEffect(() => {
    if (!enabled) return;
    if (!geoSupported) {
      // No device geolocation to wait for — release any held beacons now.
      gpsSettled.current = true;
      flushPending();
      return;
    }
    let cancelled = false;
    const settle = () => {
      if (cancelled) return;
      gpsSettled.current = true;
      flushPending();
    };
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        coords.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        settle();
      },
      () => {
        // permission denied / unavailable / timeout — fall back to IP geo.
        settle();
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );
    return () => {
      cancelled = true;
    };
  }, [enabled, geoSupported]);

  // Record each navigation.
  useEffect(() => {
    if (!enabled) return;
    if (location === lastTracked.current) return;
    lastTracked.current = location;
    send(location, false);
  }, [location, enabled]);

  // Heartbeat while the tab is open and visible.
  useEffect(() => {
    if (!enabled) return;
    const beat = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      send(locationRef.current, true);
    };
    const id = window.setInterval(beat, HEARTBEAT_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") send(locationRef.current, true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);
}
