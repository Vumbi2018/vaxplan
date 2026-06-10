// Load .env file for local development (Node 20.12+ built-in, no dotenv package needed)
// This runs before any other imports that touch process.env (e.g. db.ts checks DATABASE_URL).
try {
  // @ts-ignore — process.loadEnvFile is available in Node.js 20.12+
  process.loadEnvFile?.();
} catch {
  // .env file is optional — silently skip if not present (e.g. production with real env vars)
}

import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { getSession } from "./auth";

import { setupRealtime, realtimeBroadcastMiddleware } from "./services/realtime";
import { startPopulationRefreshScheduler } from "./jobs/populationRefresh";
import { startSessionArchiveScheduler } from "./jobs/sessionArchive";
import { startStockAlertDigestScheduler } from "./jobs/stockAlertDigest";
import { startSupervisionDigestScheduler } from "./jobs/supervisionDigest";
import { startApprovalScheduler } from "./jobs/approvalScheduler";
import { startMicroplanApprovalCron } from "./jobs/microplanApprovalCron";
import { seedDemoOperational } from "./migrations/006-seed-demo-operational";
/* Original Code commented out for backward-compatibility:
import { applyPerfIndexes } from "./migrations/011-perf-indexes";
*/
import { applyPerfIndexes } from "./migrations/011-perf-indexes";
import { applyVillageColumns } from "./migrations/013-village-route-columns";
import { applyOutreachColumns } from "./migrations/014-outreach-columns";import { applyMicroplanApprovalColumns } from "./migrations/015-microplan-approval-columns";
import { applySessionsTable } from "./migrations/016-sessions-table";
import { applyWikiPages } from "./migrations/017-wiki-pages";


const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.set("trust proxy", 1);

// Enforce HTTPS in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production" && req.headers["x-forwarded-proto"] && req.headers["x-forwarded-proto"] !== "https") {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// ── Gzip compression ─────────────────────────────────────────────────────────────
// Must be the FIRST middleware so every response (API + static) is compressed.
// On a slow mobile connection (MTN hotspot) this can reduce sync/pull payloads
// from 1–2 MB down to 80–200 KB — a 5-10× speed improvement on large datasets.
app.use(compression({ level: 6, threshold: 1024 }));

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
// Explicit allowlist only. The web app is same-origin and never needs CORS.
// Only the packaged native shells (which load from these fixed local origins)
// are allowed to make cross-origin credentialed requests.
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

// Helper to inspect payloads without blocking the Event Loop or stdout with large JSON strings
function inspectPayload(payload: any): string {
  if (payload === null || payload === undefined) return "";
  if (Array.isArray(payload)) {
    if (payload.length > 5) {
      return `[Array of ${payload.length} items]`;
    }
  } else if (typeof payload === "object") {
    if (Array.isArray(payload.data) && payload.data.length > 5) {
      return `{ success: ${payload.success}, data: [Array of ${payload.data.length} items] }`;
    }
    const keys = Object.keys(payload);
    if (keys.length > 10) {
      return `[Object with ${keys.length} keys]`;
    }
  }
  
  const str = JSON.stringify(payload);
  return str.length > 300 ? `[Payload of ${str.length} chars]` : str;
}

/* Original middleware commented out to prevent event loop blocks and comply with Rule 2:
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Only include the response body in the log for small payloads.
      // Stringifying a 10 000-row sync/pull response causes ~50 ms of
      // CPU overhead per request and floods the console with MB of JSON.
      const contentLen = parseInt(res.getHeader("content-length") as string || "0", 10);
      const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      log(contentLen > 0 && contentLen < 2048
        ? logLine + " :: [see response]"
        : logLine);
    }
  });

  next();
});
*/

// Updated high-performance request logging middleware
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
        logLine += ` :: ${inspectPayload(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// Broadcast a tenant-scoped "changed" poke after any successful mutating /api
// request so other connected clients can pull immediately (see services/realtime).
app.use(realtimeBroadcastMiddleware);

async function backfillClientIds() {
  try {
    const { clients, facilities, districts, provinces } = await import("../shared/schema");
    const { db } = await import("./db");
    const { sql, isNull, eq, and } = await import("drizzle-orm");
    const { getInitials, computeCheckDigit } = await import("./routes");

    const pendingClients = await db
      .select()
      .from(clients)
      .where(isNull(clients.clientId));

    if (pendingClients.length === 0) {
      return;
    }

    log(`Found ${pendingClients.length} clients needing Client ID backfill.`, "backfill");

    for (const client of pendingClients) {
      const [facInfo] = await db
        .select({
          facilityName: facilities.name,
          districtName: districts.name,
          provinceName: provinces.name,
        })
        .from(facilities)
        .innerJoin(districts, eq(facilities.districtId, districts.id))
        .innerJoin(provinces, eq(districts.provinceId, provinces.id))
        .where(eq(facilities.id, client.facilityId))
        .limit(1);

      const provInit = getInitials(facInfo?.provinceName || "PRV");
      const distInit = getInitials(facInfo?.districtName || "DST");
      const hfInit = getInitials(facInfo?.facilityName || "FAC");
      const regYear = client.createdAt ? new Date(client.createdAt).getFullYear() : new Date().getFullYear();

      const [maxClient] = await db
        .select({ maxSerial: sql<number>`MAX(${clients.serialNumber})` })
        .from(clients)
        .where(
          and(
            eq(clients.facilityId, client.facilityId),
            eq(clients.registrationYear, regYear),
            eq(clients.tenantId, client.tenantId)
          )
        );

      const serialNum = (maxClient?.maxSerial ?? 0) + 1;
      const serialStr = String(serialNum).padStart(4, "0");
      const prefix = `${provInit}-${distInit}-${hfInit}-${regYear}-${serialStr}`;
      const checkDigit = computeCheckDigit(prefix);
      const generatedClientId = `${prefix}-${checkDigit}`;

      await db
        .update(clients)
        .set({
          clientId: generatedClientId,
          serialNumber: serialNum,
          registrationYear: regYear,
        })
        .where(eq(clients.id, client.id));
    }

    log(`Successfully backfilled ${pendingClients.length} Client IDs.`, "backfill");
  } catch (error) {
    log(`Client ID backfill failed: ${error}`, "backfill");
  }
}

(async () => {
  await registerRoutes(httpServer, app);
  
  // Run backfill asynchronously in the background so as not to block startup
  backfillClientIds().catch((err) => log(`Background backfill failed: ${err}`, "backfill"));

  // Additive remote sensing routes (zero-touch to routes.ts)
  const { registerRemoteSensingRoutes } = await import("./services/remoteSensingService");
  registerRemoteSensingRoutes(app);

  // Reporting Engine — standalone module at /api/reports
  const { reportsRouter } = await import("./routes/reports");
  app.use("/api/reports", reportsRouter);

  // VPD Surveillance Engine
  const { surveillanceRouter } = await import("./routes/surveillance");
  app.use("/api/surveillance", surveillanceRouter);

  /* Original Code commented out for backward-compatibility:
  applyPerfIndexes()
    .then(() => log("perf indexes applied", "db"))
    .catch((err) => log(`perf indexes warning: ${err?.message ?? err}`, "db"));
  */
  applyPerfIndexes()
    .then(() => log("perf indexes applied", "db"))
    .catch((err) => log(`perf indexes warning: ${err?.message ?? err}`, "db"));

  applyVillageColumns()
    .then(() => log("village route columns migration complete", "db"))
    .catch((err) => log(`village columns warning: ${err?.message ?? err}`, "db"));

  applyOutreachColumns()
    .then(() => log("outreach columns migration complete", "db"))
    .catch((err) => log(`outreach columns warning: ${err?.message ?? err}`, "db"));

  applyMicroplanApprovalColumns()
    .then(() => log("microplan approval columns migration complete", "db"))
    .catch((err) => log(`microplan approval columns warning: ${err?.message ?? err}`, "db"));

  applySessionsTable()
    .then(() => log("sessions table ensured", "db"))
    .catch((err) => log(`sessions table warning: ${err?.message ?? err}`, "db"));

  applyWikiPages()
    .then(() => log("wiki pages table ensured", "db"))
    .catch((err) => log(`wiki pages warning: ${err?.message ?? err}`, "db"));

  setupRealtime(httpServer, getSession());
  startPopulationRefreshScheduler();
  startSessionArchiveScheduler();
  startStockAlertDigestScheduler();
  startSupervisionDigestScheduler();
  startApprovalScheduler();
  startMicroplanApprovalCron();

  // Initialize UCE queue worker
  import("./services/uce/workers").catch((err) => log(`Failed to load UCE worker: ${err}`));

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
