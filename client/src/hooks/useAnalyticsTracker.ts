import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

// Records each authenticated page navigation for the dashboard "Site activity"
// panel. Fire-and-forget: it uses a bare fetch (NOT apiRequest) so analytics
// is never queued in the offline outbox, only runs when online, and swallows
// every error so navigation is never disrupted by a failed beacon.
export function useAnalyticsTracker(enabled: boolean) {
  const [location] = useLocation();
  const lastTracked = useRef<string>("");

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    if (location === lastTracked.current) return;
    lastTracked.current = location;

    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ path: location }),
      keepalive: true,
    }).catch(() => {
      // non-critical — ignore
    });
  }, [location, enabled]);
}
