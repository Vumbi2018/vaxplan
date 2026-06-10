/**
 * VaxPlan Electron preload — exposes a minimal, typed API to the renderer.
 *
 * Keep this surface small: each addition is a path the renderer can use
 * to reach native capabilities, so anything exposed here is part of the
 * Windows build's security contract.
 */

import { contextBridge, ipcRenderer } from "electron";

const electronAPI = {
  /** Returns the current connectivity state per Electron `net.isOnline()`. */
  isOnline: (): Promise<boolean> => ipcRenderer.invoke("network:is-online"),

  /**
   * Subscribe to connectivity changes. The main process polls every 5s
   * and pushes booleans through `network-status`. Returns an unsubscribe.
   */
  onNetworkStatusChange: (cb: (online: boolean) => void): (() => void) => {
    const handler = (_e: unknown, online: boolean) => cb(!!online);
    ipcRenderer.on("network-status", handler);
    return () => ipcRenderer.removeListener("network-status", handler);
  },

  /** Device-bound offline auth token (encrypted at rest via safeStorage). */
  deviceToken: {
    get: (): Promise<string | null> => ipcRenderer.invoke("device-token:get"),
    set: (value: string): Promise<boolean> => ipcRenderer.invoke("device-token:set", value),
    clear: (): Promise<boolean> => ipcRenderer.invoke("device-token:clear"),
  },

  /** electron-updater bridge. `phase` may be available|downloaded|error. */
  update: {
    check: (): Promise<{ ok: boolean; updateInfo?: any; error?: string }> =>
      ipcRenderer.invoke("update:check"),
    install: (): Promise<boolean> => ipcRenderer.invoke("update:install"),
    onStatus: (cb: (status: { phase: string; info?: any; message?: string }) => void) => {
      const handler = (_e: unknown, status: any) => cb(status);
      ipcRenderer.on("update-status", handler);
      return () => ipcRenderer.removeListener("update-status", handler);
    },
  },

  platform: process.platform as NodeJS.Platform,
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

export type ElectronAPI = typeof electronAPI;
