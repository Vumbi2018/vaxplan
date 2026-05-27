/**
 * useNetworkStatus — React hook for real-time network state
 *
 * Returns the current online/offline status and connection quality.
 * Subscribes to browser online/offline events and the Network Information API.
 */

import { useState, useEffect } from "react";

export type ConnectionType = "wifi" | "cellular" | "ethernet" | "other" | "unknown";

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;         // true if 2G/slow-2G
  connectionType: ConnectionType;
  effectiveType?: string;            // "slow-2g" | "2g" | "3g" | "4g"
  downlink?: number;                 // Mbps
}

function getConnectionInfo(): Pick<NetworkStatus, "isSlowConnection" | "connectionType" | "effectiveType" | "downlink"> {
  // Navigator Network Information API (available in Chrome/Android)
  const conn = (navigator as any).connection ?? (navigator as any).mozConnection ?? (navigator as any).webkitConnection;

  if (!conn) {
    return { isSlowConnection: false, connectionType: "unknown" };
  }

  const effectiveType: string = conn.effectiveType ?? "unknown";
  const downlink: number = conn.downlink ?? 0;
  const isSlowConnection = effectiveType === "slow-2g" || effectiveType === "2g";

  let connectionType: ConnectionType = "other";
  const type = conn.type ?? "";
  if (type === "wifi") connectionType = "wifi";
  else if (type === "cellular") connectionType = "cellular";
  else if (type === "ethernet") connectionType = "ethernet";

  return { isSlowConnection, connectionType, effectiveType, downlink };
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: navigator.onLine,
    ...getConnectionInfo(),
  }));

  useEffect(() => {
    const update = () => {
      setStatus({
        isOnline: navigator.onLine,
        ...getConnectionInfo(),
      });
    };

    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    // Network Information API change event
    const conn = (navigator as any).connection;
    if (conn) conn.addEventListener("change", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      if (conn) conn.removeEventListener("change", update);
    };
  }, []);

  return status;
}
