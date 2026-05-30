// Load .env file for local development (Node 20.12+ built-in, no dotenv package needed)
// This runs before any other imports that touch process.env (e.g. db.ts checks DATABASE_URL).
try {
  // @ts-ignore — process.loadEnvFile is available in Node.js 20.12+
  process.loadEnvFile?.();
} catch {
  // .env file is optional — silently skip if not present (e.g. production with real env vars)
}

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { getSession } from "./replitAuth";
import { setupRealtime, realtimeBroadcastMiddleware } from "./services/realtime";
import { startPopulationRefreshScheduler } from "./jobs/populationRefresh";
import { startSessionArchiveScheduler } from "./jobs/sessionArchive";
import { startStockAlertDigestScheduler } from "./jobs/stockAlertDigest";
import { startSupervisionDigestScheduler } from "./jobs/supervisionDigest";
import { seedDemoOperational } from "./migrations/006-seed-demo-operational";


const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "50mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// ─── CORS for packaged native apps ───────────────────────────────────────────
// The web app is same-origin and needs no CORS. The packaged Android
// (Capacitor) and Windows (Electron) shells, however, load their UI from a
// local origin and call this server cross-origin, so we must explicitly allow
// those origins (with credentials so the session cookie flows).
//
// Explicit allowlist only. The web app is same-origin and never needs CORS,
// so we deliberately do NOT wildcard *.replit.dev / *.replit.app — reflecting
// credentialed CORS for arbitrary Replit origins would let any other Replit
// site read this app's authenticated responses. Only the packaged native
// shells (which load from these fixed local origins) are allowed.
const NATIVE_ALLOWED_ORIGINS = new Set<string>([
  "https://localhost", // Capacitor Android (androidScheme: "https")
  "capacitor://localhost", // Capacitor (iOS / alt scheme)
  "app://local", // Electron packaged app (custom secure scheme)
  // Electron dev (loadURL to dev server) — development only, never expand the
  // credentialed CORS surface to a localhost origin in production.
  ...(process.env.NODE_ENV === "production" ? [] : ["http://localhost:5000"]),
]);

function isAllowedCorsOrigin(origin: string): boolean {
  return NATIVE_ALLOWED_ORIGINS.has(origin);
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isAllowedCorsOrigin(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-tenant-id, x-release-token",
    );
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
  }
  next();
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// Broadcast a tenant-scoped "changed" poke after any successful mutating /api
// request so other connected clients can pull immediately (see services/realtime).
app.use(realtimeBroadcastMiddleware);

(async () => {
  await registerRoutes(httpServer, app);

  // Real-time websocket channel (/ws), authenticated by the same session cookie.
  setupRealtime(httpServer, getSession());
  startPopulationRefreshScheduler();
  startSessionArchiveScheduler();
  startStockAlertDigestScheduler();
  startSupervisionDigestScheduler();

  // Auto-run the demo operational seed on startup. Idempotent: every step
  // skips/upserts so subsequent boots are a no-op once data is in place.
  // Runs in the background so a slow seed never blocks the HTTP listener.
  //
  // Gating: by default the demo seed only runs in non-production environments
  // so real tenants on a deployed instance never get synthetic clients,
  // vaccinations, or imported coverage rows mixed into their data. To opt in
  // on production (e.g. a preview/staging deploy that should look populated),
  // set ENABLE_DEMO_SEED=1. To force-disable in dev, set SKIP_DEMO_SEED=1.
  const isProduction = process.env.NODE_ENV === "production";
  const demoSeedEnabled =
    process.env.SKIP_DEMO_SEED !== "1" &&
    (!isProduction || process.env.ENABLE_DEMO_SEED === "1");

  if (demoSeedEnabled) {
    seedDemoOperational()
      .then(() => log("demo operational seed complete", "seed"))
      .catch((err) => log(`demo operational seed failed: ${err?.message ?? err}`, "seed"));
  } else {
    log(
      `demo operational seed skipped (NODE_ENV=${process.env.NODE_ENV ?? "unset"}, set ENABLE_DEMO_SEED=1 to opt in)`,
      "seed",
    );
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  // Removed reusePort as it is a POSIX-specific flag that throws ENOTSUP on Windows.
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
