/**
 * Regression guard for the demo operational seed.
 *
 * The dropout, defaulter, and zero-dose tiles are populated entirely from the
 * children & vaccinations rows produced by `seedDemoOperational()`. If that
 * seed ever drifts again (wrong DOBs, missing antigen codes, schema rename,
 * etc.) the tiles silently go empty. This test re-runs the seed against the
 * configured Postgres test database and asserts the three indicator
 * endpoints return non-empty payloads for every demo tenant (ZMB / SSD / PNG).
 *
 * Configure with TEST_DATABASE_URL pointing at a disposable Postgres
 * instance — falls back to DATABASE_URL so the test can also be run locally
 * against the dev DB. The seed is idempotent; we deliberately wipe the demo
 * `clients` / `client_vaccinations` rows for each tenant first so a stale
 * pre-seeded DB cannot mask drift in the seed code itself.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express, { type Express } from "express";
import { createServer, type Server as HttpServer } from "http";
import request from "supertest";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db, pool } from "../db";
import { registerRoutes } from "../routes";
import { seedDemoOperational } from "../migrations/006-seed-demo-operational";
import {
  tenants,
  facilities,
  clients,
  clientVaccinations,
} from "@shared/schema";

const TENANT_CODES = ["ZMB", "SSD", "PNG"] as const;
type TenantCode = (typeof TENANT_CODES)[number];

interface TenantCtx {
  code: TenantCode;
  tenantId: string;
}

let app: Express;
let httpServer: HttpServer;
const tenantCtxs: TenantCtx[] = [];
let loggedInAgent: ReturnType<typeof request.agent>;

async function wipeDemoClients(tenantId: string) {
  const facilityRows = await db
    .select({ id: facilities.id })
    .from(facilities)
    .where(eq(facilities.tenantId, tenantId));
  const facilityIds = facilityRows.map((r) => r.id);
  if (facilityIds.length === 0) return;

  // Delete demo client_vaccinations first (FK). The seed tags every demo
  // child with name LIKE 'Demo %'; vaccinations are linked by clientId.
  const demoClientRows = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(
        eq(clients.tenantId, tenantId),
        inArray(clients.facilityId, facilityIds),
        sql`${clients.name} LIKE 'Demo %'`,
      ),
    );
  const demoClientIds = demoClientRows.map((r) => r.id);
  if (demoClientIds.length > 0) {
    await db
      .delete(clientVaccinations)
      .where(
        and(
          eq(clientVaccinations.tenantId, tenantId),
          inArray(clientVaccinations.clientId, demoClientIds),
        ),
      );
    await db
      .delete(clients)
      .where(
        and(
          eq(clients.tenantId, tenantId),
          inArray(clients.id, demoClientIds),
        ),
      );
  }
}

beforeAll(async () => {
  app = express();
  app.use(express.json());
  httpServer = createServer(app);
  await registerRoutes(httpServer, app);

  // Resolve demo tenant IDs. If any of the three are missing the DB was not
  // bootstrapped with the country seeds (001 backfill + 003/004/006-seed-png)
  // and there is nothing meaningful to assert.
  for (const code of TENANT_CODES) {
    const [row] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.code, code))
      .limit(1);
    if (!row) {
      throw new Error(
        `Demo tenant '${code}' not found in test DB. Run the country bootstrap seeds (001-multitenant-backfill, 003-seed-zambia, 004-seed-south-sudan, 006-seed-png) before running this test.`,
      );
    }
    tenantCtxs.push({ code, tenantId: row.id });
  }

  // Force a fresh re-seed by clearing demo clients/vaccinations for each
  // tenant. The seed gates per-facility on "any Demo client exists?" so
  // wiping them makes the next run regenerate from scratch.
  for (const ctx of tenantCtxs) {
    await wipeDemoClients(ctx.tenantId);
  }

  await seedDemoOperational();

  // Log in via the local-dev mock auth endpoint. The seed already creates a
  // national-admin user (see seedUsers in 006-seed-demo-operational.ts), but
  // we pin to the well-known dev.admin@vaxplan.org so this test does not
  // depend on which roles the seed happens to emit.
  loggedInAgent = request.agent(app);
  const loginRes = await loggedInAgent.get(
    "/api/login?email=dev.admin@vaxplan.org",
  );
  if (loginRes.status !== 302 && loginRes.status !== 200) {
    throw new Error(`Mock login failed: ${loginRes.status} ${loginRes.text}`);
  }
});

afterAll(async () => {
  try {
    httpServer?.close();
  } catch {
    // ignore
  }
  await pool.end().catch(() => {});
});

describe("demo seed → indicator tiles populate for every demo tenant", () => {
  for (const code of TENANT_CODES) {
    describe(`tenant ${code}`, () => {
      const ctxFor = () => {
        const ctx = tenantCtxs.find((c) => c.code === code);
        if (!ctx) throw new Error(`tenant ctx for ${code} missing`);
        return ctx;
      };

      it("zero-dose returns denominator > 0 and total > 0", async () => {
        const { tenantId } = ctxFor();
        const res = await loggedInAgent
          .get("/api/indicators/zero-dose")
          .set("x-tenant-id", tenantId);
        expect(
          res.status,
          `GET /api/indicators/zero-dose for ${code} failed: ${res.text}`,
        ).toBe(200);
        expect(
          res.body.denominator,
          `Zero-dose tile would render empty for ${code}: seed produced no eligible (≥12mo) demo children. Check seedDemoClients DOB math in 006-seed-demo-operational.ts. Payload=${JSON.stringify(res.body)}`,
        ).toBeGreaterThan(0);
        expect(
          res.body.total,
          `Zero-dose tile would render 0 unvaccinated for ${code}: every eligible demo child has PENTA_1. Check the seed's no-PENTA-1 cohort. Payload=${JSON.stringify(res.body)}`,
        ).toBeGreaterThan(0);
      });

      it("dropout returns dtp1_dtp3.denom > 0", async () => {
        const { tenantId } = ctxFor();
        const res = await loggedInAgent
          .get("/api/indicators/dropout")
          .set("x-tenant-id", tenantId);
        expect(
          res.status,
          `GET /api/indicators/dropout for ${code} failed: ${res.text}`,
        ).toBe(200);
        expect(
          res.body?.dtp1_dtp3?.denom,
          `Dropout tile would render empty for ${code}: no PENTA_1 doses administered in the last 12 months by demo seed. Check antigen codes / administeredDate in seedDemoClients. Payload=${JSON.stringify(res.body)}`,
        ).toBeGreaterThan(0);
      });

      it("defaulters returns at least one overdue child", async () => {
        const { tenantId } = ctxFor();
        const res = await loggedInAgent
          .get("/api/indicators/defaulters")
          .set("x-tenant-id", tenantId);
        expect(
          res.status,
          `GET /api/indicators/defaulters for ${code} failed: ${res.text}`,
        ).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(
          res.body.length,
          `Defaulter list would render empty for ${code}: no demo child is overdue beyond the grace window. Check defaulter cohort ages/doses in seedDemoClients.`,
        ).toBeGreaterThan(0);
      });
    });
  }
});
