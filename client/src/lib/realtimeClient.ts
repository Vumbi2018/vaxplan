/**
 * realtimeClient.ts — browser side of the tenant-scoped websocket change channel.
 *
 * Connects to the server `/ws` endpoint (authenticated by the existing session
 * cookie) and invokes `onChange` whenever a peer reports that tenant data
 * changed. The caller responds with a normal silent pull — we never trust row
 * data off the socket, it's purely a "go refresh now" nudge.
 *
 * Resilience:
 *   - Auto-reconnect with capped exponential backoff.
 *   - App-level "ping"/"pong" heartbeat (survives proxies that strip ws frames).
 *   - Fully optional: if the socket can't connect (offline, native cookie
 *     quirks), the periodic interval sync still keeps clients eventually-consistent.
 */

import { getApiBase } from "./apiBase";

type ChangeHandler = (msg: any) => void;

function buildWsUrl(tenantId: string): string {
  const base = getApiBase(); // non-empty only inside a packaged native shell
  if (base) {
    const wsBase = base.replace(/^http/i, "ws"); // https→wss, http→ws
    return `${wsBase}/ws?tenantId=${encodeURIComponent(tenantId)}`;
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws?tenantId=${encodeURIComponent(tenantId)}`;
}

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private tenantId = "";
  private readonly onChange: ChangeHandler;
  private closedByUser = false;
  private retry = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(onChange: ChangeHandler) {
    this.onChange = onChange;
  }

  connect(tenantId: string): void {
    if (!tenantId) return;
    if (
      this.ws &&
      this.tenantId === tenantId &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return; // already connected/connecting to this tenant
    }
    this.disconnect();
    this.closedByUser = false;
    this.tenantId = tenantId;
    this.open();
  }

  private open(): void {
    let url: string;
    try {
      url = buildWsUrl(this.tenantId);
    } catch {
      return;
    }
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.retry = 0;
      this.startHeartbeat();
    };
    ws.onmessage = (ev) => {
      let data: any = null;
      try {
        data = JSON.parse(ev.data);
      } catch {
        return; // ignore non-JSON ("pong")
      }
      if (data?.type === "changed") {
        try {
          this.onChange(data);
        } catch {
          /* handler errors must not kill the socket */
        }
      }
    };
    ws.onclose = () => {
      this.stopHeartbeat();
      this.ws = null;
      if (!this.closedByUser) this.scheduleReconnect();
    };
    ws.onerror = () => {
      try {
        ws.close();
      } catch {}
    };
  }

  private scheduleReconnect(): void {
    if (this.closedByUser || this.reconnectTimer) return;
    this.retry = Math.min(this.retry + 1, 6);
    const delay = Math.min(1000 * 2 ** this.retry, 30_000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.closedByUser) this.open();
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send("ping");
        } catch {}
      }
    }, 25_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  disconnect(): void {
    this.closedByUser = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }
}
