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

  const send = (path: string, heartbeat: boolean) => {
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

  // Ask for the device location once (the browser remembers the choice). On
  // success, re-send a heartbeat so the map updates from IP-city to the real
  // GPS position right away.
  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        coords.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        send(locationRef.current, true);
      },
      () => {
        // permission denied / unavailable — fall back to IP geolocation
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );
    return () => {
      cancelled = true;
    };
  }, [enabled]);

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
