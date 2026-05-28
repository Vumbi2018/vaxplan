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
import { startPopulationRefreshScheduler } from "./jobs/populationRefresh";
import { startSessionArchiveScheduler } from "./jobs/sessionArchive";
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
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

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

(async () => {
  await registerRoutes(httpServer, app);
  startPopulationRefreshScheduler();
  startSessionArchiveScheduler();

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
