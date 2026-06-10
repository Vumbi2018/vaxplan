import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { eq, and, desc, isNull, sql as dsql } from "drizzle-orm";
import { db, pool } from "../db";
import { populationRefreshJobs, tenants, type PopulationRefreshJob, type Tenant } from "@shared/schema";
import { ingestWorldPopRaster } from "../../scripts/ingestWorldPopRaster";
import { scheduleAtMidnight } from "./scheduler";


export interface RefreshOptions {
  triggeredBy: "manual" | "scheduled";
  triggeredByUserId?: string | null;
  minPopulation?: number;
  rasterPath?: string;
}

const DEFAULT_MIN_POPULATION = 25;
const STALE_RUNNING_MS = 6 * 60 * 60 * 1000; // 6h — protect against crashed runs

let migrationPromise: Promise<void> | null = null;

/**
 * Ensure the population_refresh_jobs table exists before we touch it. Runs the
 * SQL migration idempotently the first time the module is used so the feature
 * works in environments that don't have a migration runner wired up.
 */
export async function ensurePopulationRefreshMigration(): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = (async () => {
      const sqlPath = join(process.cwd(), "server", "migrations", "007-population-refresh-jobs.sql");
      const sqlText = readFileSync(sqlPath, "utf8");
      const client = await pool.connect();
      try {
        await client.query(sqlText);
      } finally {
        client.release();
      }
    })().catch((err) => {
      migrationPromise = null;
      throw err;
    });
  }
  return migrationPromise;
}

/**
 * Resolve the WorldPop raster path for a tenant. Convention is
 *   Resources/<countryCode lower>_pop_2026_CN_100m_R2025A_v1.tif
 * but a tenant may override it via `tenants.settings.populationRasterPath`.
 *
 * This is what lets onboarding a new country = "drop a raster in Resources/ +
 * add a tenant row" with no code change.
 */
export function resolveTenantRasterPath(tenant: Tenant): string {
  const settings = (tenant.settings ?? {}) as Record<string, unknown>;
  const override = settings.populationRasterPath;
  if (typeof override === "string" && override.length > 0) {
    return override;
  }
  const iso = (tenant.countryCode || tenant.code || "").toLowerCase();
  return `Resources/${iso}_pop_2026_CN_100m_R2025A_v1.tif`;
}

async function isRefreshAlreadyRunning(tenantId: string): Promise<boolean> {
  const rows = await db
    .select({ id: populationRefreshJobs.id, startedAt: populationRefreshJobs.startedAt })
    .from(populationRefreshJobs)
    .where(and(
      eq(populationRefreshJobs.tenantId, tenantId),
      eq(populationRefreshJobs.status, "running"),
    ));
  const now = Date.now();
  for (const row of rows) {
    const started = row.startedAt ? new Date(row.startedAt).getTime() : 0;
    if (now - started < STALE_RUNNING_MS) {
      return true;
    }
  }
  return false;
}

/**
 * Refresh population_grids for a single tenant from the WorldPop raster and
 * record a population_refresh_jobs row capturing status, row count, and any
 * error. Safe to call concurrently — overlapping calls for the same tenant
 * short-circuit and return the in-progress job row.
 */
export async function refreshTenantPopulation(
  tenantId: string,
  opts: RefreshOptions,
): Promise<PopulationRefreshJob> {
  await ensurePopulationRefreshMigration();

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  if (!tenant) {
    throw new Error(`Tenant ${tenantId} not found`);
  }

  if (await isRefreshAlreadyRunning(tenantId)) {
    const [existing] = await db
      .select()
      .from(populationRefreshJobs)
      .where(and(
        eq(populationRefreshJobs.tenantId, tenantId),
        eq(populationRefreshJobs.status, "running"),
      ))
      .orderBy(desc(populationRefreshJobs.startedAt))
      .limit(1);
    if (existing) return existing;
  }

  const rasterPath = opts.rasterPath ?? resolveTenantRasterPath(tenant);
  const minPopulation = opts.minPopulation ?? DEFAULT_MIN_POPULATION;
  const cellPrefix = tenant.code.toLowerCase();

  const [job] = await db
    .insert(populationRefreshJobs)
    .values({
      tenantId,
      triggeredBy: opts.triggeredBy,
      triggeredByUserId: opts.triggeredByUserId ?? null,
      rasterPath,
      minPopulation,
      status: "running",
      startedAt: new Date(),
    })
    .returning();

  const startMs = Date.now();
  try {
    if (!existsSync(rasterPath)) {
      throw new Error(`Raster file not found at ${rasterPath}`);
    }

    const result = await ingestWorldPopRaster({
      tenantId,
      rasterPath,
      cellPrefix,
      minPopulation,
    });

    const [updated] = await db
      .update(populationRefreshJobs)
      .set({
        status: "succeeded",
        completedAt: new Date(),
        rowsInserted: result.rowsInserted,
        cellsScanned: result.cellsScanned,
        cellsAboveThreshold: result.cellsAboveThreshold,
        durationMs: Date.now() - startMs,
      })
      .where(eq(populationRefreshJobs.id, job.id))
      .returning();

    console.log(
      `[population-refresh] tenant=${tenant.code} status=succeeded rows=${result.rowsInserted} durationMs=${Date.now() - startMs}`,
    );
    return updated ?? job;
  } catch (err: any) {
    const message = err?.message ? String(err.message).slice(0, 4000) : String(err).slice(0, 4000);
    console.error(`[population-refresh] tenant=${tenant.code} status=failed: ${message}`);
    const [updated] = await db
      .update(populationRefreshJobs)
      .set({
        status: "failed",
        completedAt: new Date(),
        durationMs: Date.now() - startMs,
        errorMessage: message,
      })
      .where(eq(populationRefreshJobs.id, job.id))
      .returning();
    return updated ?? job;
  }
}

/**
 * Run a population refresh for every active tenant that has a raster on disk.
 * Tenants whose raster isn't present are skipped silently — the convention is
 * "drop a raster in Resources/ + add a tenant row" and we don't want to spam
 * job rows for tenants that haven't been onboarded yet.
 */
export async function runScheduledPopulationRefresh(): Promise<{
  attempted: number;
  succeeded: number;
  failed: number;
  skipped: number;
}> {
  await ensurePopulationRefreshMigration();
  const activeTenants = await db
    .select()
    .from(tenants)
    .where(eq(tenants.status, "active"));

  let attempted = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (const tenant of activeTenants) {
    const rasterPath = resolveTenantRasterPath(tenant);
    if (!existsSync(rasterPath)) {
      skipped++;
      continue;
    }
    attempted++;
    try {
      const job = await refreshTenantPopulation(tenant.id, {
        triggeredBy: "scheduled",
      });
      if (job.status === "succeeded") succeeded++;
      else if (job.status === "failed") failed++;
    } catch (err) {
      failed++;
      console.error(`[population-refresh] scheduled run failed for ${tenant.code}:`, err);
    }
  }

  console.log(
    `[population-refresh] scheduled cycle done — attempted=${attempted} succeeded=${succeeded} failed=${failed} skipped=${skipped}`,
  );
  return { attempted, succeeded, failed, skipped };
}

let cancelFn: (() => void) | null = null;

/**
 * Schedules the WorldPop raster ingestion to run once nightly at 01:00 UTC.
 * This is the heaviest job (can scan millions of raster cells and insert
 * thousands of population_grids rows), so it runs last — after session-archive
 * (00:05), stock-alert-digest (00:15), and supervision-digest (00:30 Mondays).
 *
 * Previously used setInterval(every Nh) with a 30-second first-tick after boot.
 * That caused a heavy ETL run seconds after server startup, degrading
 * interactive performance on every deployment or restart.
 *
 * POPULATION_REFRESH_INTERVAL_HOURS still controls opt-in:
 *   Unset / 0 → disabled (default — avoids ETL in dev/test).
 *   Any positive number → midnight scheduling enabled.
 */
export function startPopulationRefreshScheduler(): void {
  if (cancelFn) return;
  const raw = process.env.POPULATION_REFRESH_INTERVAL_HOURS;
  const hours = raw ? parseFloat(raw) : 0;
  if (!Number.isFinite(hours) || hours <= 0) {
    console.log("[population-refresh] scheduler disabled (POPULATION_REFRESH_INTERVAL_HOURS not set)");
    return;
  }
  cancelFn = scheduleAtMidnight(
    "population-refresh",
    async () => {
      const result = await runScheduledPopulationRefresh();
      console.log(
        `[population-refresh] nightly run — attempted=${result.attempted} succeeded=${result.succeeded} failed=${result.failed} skipped=${result.skipped}`,
      );
    },
    { offsetMinutes: 60 }, // 01:00 UTC — heaviest job runs last
  );
  console.log("[population-refresh] scheduler enabled — running nightly at 01:00 UTC");
}

export function stopPopulationRefreshScheduler(): void {
  if (cancelFn) {
    cancelFn();
    cancelFn = null;
  }
}


export async function listRefreshJobs(opts: {
  tenantId?: string;
  limit?: number;
}): Promise<PopulationRefreshJob[]> {
  await ensurePopulationRefreshMigration();
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 500);
  const where = opts.tenantId ? eq(populationRefreshJobs.tenantId, opts.tenantId) : undefined;
  const query = db
    .select()
    .from(populationRefreshJobs)
    .orderBy(desc(populationRefreshJobs.startedAt))
    .limit(limit);
  if (where) {
    return await query.where(where);
  }
  return await query;
}

// Suppress unused import warnings while keeping the imports available for
// future extensions (e.g. dynamic filter expressions).
void isNull;
void dsql;
