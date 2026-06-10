/**
 * VaxPlan Electron main process.
 *
 * Responsibilities:
 * - Spawn a BrowserWindow that loads the built Vite bundle (`dist/public`)
 *   in production, or the local Vite dev server in development.
 * - Bridge native capabilities to the renderer over a typed `electronAPI`
 *   preload: secure-token storage (safeStorage), connectivity polling
 *   (net.isOnline), and a "check for update" hook backed by
 *   electron-updater so the auto-update path in scripts/Build-Windows.ps1
 *   is wired end-to-end.
 *
 * Update feed:
 *   electron-updater reads `publish` from forge.config.cjs / package.json
 *   at build time and uses that feed at runtime. See docs/releases.md for
 *   how to publish releases and rotate the code-signing certificate.
 */

import { app, BrowserWindow, ipcMain, safeStorage, net, shell, protocol } from "electron";
import * as path from "path";
import * as fs from "fs";

const isDev = !app.isPackaged;
const DEV_URL = process.env.VITE_DEV_URL ?? "http://localhost:5000";

// In production the renderer is served from a custom "app://local" scheme
// instead of file://. file:// pages have a "null" origin, which breaks
// credentialed cross-origin API calls (the session cookie never gets sent and
// CORS can't allowlist "null" safely). A registered standard+secure scheme
// gives the renderer a real, stable origin ("app://local") that the server
// CORS allowlist accepts, and it's a secure context so SameSite=None cookies
// flow. The scheme must be registered as privileged BEFORE app "ready".
const APP_SCHEME = "app";
const APP_ORIGIN_HOST = "local";

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".webmanifest": "application/manifest+json",
  ".wasm": "application/wasm",
};

// Maps "app://local/<path>" requests to files in the bundled dist/public dir.
// Unknown paths fall back to index.html so client-side routing works.
function registerAppProtocol() {
  const root = path.join(__dirname, "..", "dist", "public");
  protocol.handle(APP_SCHEME, async (request) => {
    try {
      const url = new URL(request.url);
      let pathname = decodeURIComponent(url.pathname);
      if (!pathname || pathname === "/") pathname = "/index.html";
      const indexHtml = path.join(root, "index.html");
      let filePath = path.normalize(path.join(root, pathname));
      // Prevent path traversal outside the bundle root: the resolved path's
      // location relative to root must not climb out ("..") or be absolute.
      const rel = path.relative(root, filePath);
      const escapesRoot = rel === "" || rel.startsWith("..") || path.isAbsolute(rel);
      if (
        escapesRoot ||
        !fs.existsSync(filePath) ||
        !fs.statSync(filePath).isFile()
      ) {
        filePath = indexHtml;
      }
      const data = await fs.promises.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_TYPES[ext] ?? "application/octet-stream";
      return new Response(new Uint8Array(data), {
        headers: { "content-type": mime },
      });
    } catch (err) {
      return new Response("Not found", { status: 404 });
    }
  });
}

let mainWindow: BrowserWindow | null = null;
let netPollTimer: NodeJS.Timeout | null = null;
let lastOnline = true;

function tokenPath(): string {
  return path.join(app.getPath("userData"), "device-token.bin");
}

function readEncryptedToken(): string | null {
  try {
    if (!safeStorage.isEncryptionAvailable()) return null;
    if (!fs.existsSync(tokenPath())) return null;
    const buf = fs.readFileSync(tokenPath());
    return safeStorage.decryptString(buf);
  } catch {
    return null;
  }
}

function writeEncryptedToken(value: string): boolean {
  try {
    if (!safeStorage.isEncryptionAvailable()) return false;
    const enc = safeStorage.encryptString(value);
    fs.writeFileSync(tokenPath(), enc, { mode: 0o600 });
    return true;
  } catch {
    return false;
  }
}

function clearEncryptedToken(): void {
  try {
    if (fs.existsSync(tokenPath())) fs.unlinkSync(tokenPath());
  } catch {
    /* ignore */
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: "VaxPlan",
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadURL(`${APP_SCHEME}://${APP_ORIGIN_HOST}/index.html`);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Push connectivity changes to the renderer (platformNetwork.ts hooks this).
  netPollTimer = setInterval(() => {
    const online = net.isOnline();
    if (online !== lastOnline) {
      lastOnline = online;
      mainWindow?.webContents.send("network-status", online);
    }
  }, 5_000);
}

app.whenReady().then(async () => {
  if (!isDev) registerAppProtocol();
  createWindow();

  ipcMain.handle("device-token:get", () => readEncryptedToken());
  ipcMain.handle("device-token:set", (_e, value: string) =>
    typeof value === "string" && value.length > 0 ? writeEncryptedToken(value) : false,
  );
  ipcMain.handle("device-token:clear", () => {
    clearEncryptedToken();
    return true;
  });

  ipcMain.handle("network:is-online", () => net.isOnline());

  // electron-updater is optional at dev time — only wire in packaged builds.
  if (!isDev) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { autoUpdater } = require("electron-updater");
      autoUpdater.autoDownload = true;
      autoUpdater.autoInstallOnAppQuit = true;
      autoUpdater.on("update-available", (info: any) => {
        mainWindow?.webContents.send("update-status", { phase: "available", info });
      });
      autoUpdater.on("update-downloaded", (info: any) => {
        mainWindow?.webContents.send("update-status", { phase: "downloaded", info });
      });
      autoUpdater.on("error", (err: Error) => {
        mainWindow?.webContents.send("update-status", { phase: "error", message: String(err?.message ?? err) });
      });
      ipcMain.handle("update:check", async () => {
        try {
          const r = await autoUpdater.checkForUpdates();
          return { ok: true, updateInfo: r?.updateInfo ?? null };
        } catch (err: any) {
          return { ok: false, error: String(err?.message ?? err) };
        }
      });
      ipcMain.handle("update:install", () => {
        autoUpdater.quitAndInstall();
        return true;
      });
      // Best-effort initial check on launch.
      autoUpdater.checkForUpdates().catch(() => {});
    } catch (err) {
      console.warn("[electron] electron-updater not installed; auto-update disabled.", err);
    }
  }
});

app.on("window-all-closed", () => {
  if (netPollTimer) clearInterval(netPollTimer);
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
