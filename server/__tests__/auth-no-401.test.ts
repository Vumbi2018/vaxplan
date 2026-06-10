/**
 * Regression guard for false 401s on authenticated write/read endpoints.
 *
 * Background: a 401 slipped into POST /api/microplans because the route
 * re-checked the session for OIDC claims after `isAuthenticated` had already
 * approved the request, and rejected sessions whose `req.dbUser` lookup
 * happened to come back null. That meant a *legitimately* logged-in user
 * saw "Unauthorized" on Save. Same shape ("if (!dbUser) return 401" or any
 * stale re-check after auth middleware) exists in many other write handlers
 * — any future route copy-pasted from one of these can ship the same bug.
 *
 * This test logs in as each of the main roles (facility clerk, district
 * manager, national admin) against the local mock-auth flow and POSTs/GETs
 * the core write endpoints. It does NOT assert the requests succeed — empty
 * bodies will fail Zod validation with 400, and RBAC may return 403. The
 * single invariant under test is:
 *
 *     An *authenticated* request must never come back 401.
 *
 * If any new route adds `if (!dbUser) return 401` (or similar stale guard)
 * downstream of `isAuthenticated`, this test catches it before merge.
 *
 * Requires a Postgres test DB with at least one tenant seeded
 * (TEST_DATABASE_URL or DATABASE_URL).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express, { type Express } from "express";
import { createServer, type Server as HttpServer } from "http";
import request from "supertest";
import { eq } from "drizzle-orm";

import { db, pool } from "../db";
import { registerRoutes } from "../routes";
import { tenants, users } from "@shared/schema";

interface RoleFixture {
  label: string;
  email: string;
  id: string;
  role: "facility_clerk" | "district_manager" | "national_admin";
  roles: string[];
  facilityId: number | null;
  districtId: number | null;
  provinceId: number | null;
  permissions: string[];
  dataAccessScope: { provinces: number[]; districts: number[]; facilities: number[] };
}

const ROLE_FIXTURES: RoleFixture[] = [
  {
    label: "facility clerk",
    email: "test.facility.clerk+no401@vaxplan.org",
    id: "test-no401-facility-clerk",
    role: "facility_clerk",
    roles: ["facility_clerk"],
    facilityId: 1,
    districtId: 1,
    provinceId: 1,
    permissions: ["log_immunization", "manage_session_plans"],
    dataAccessScope: { provinces: [], districts: [], facilities: [1] },
  },
  {
    label: "district manager",
    email: "test.district.mgr+no401@vaxplan.org",
    id: "test-no401-district-mgr",
    role: "district_manager",
    roles: ["district_manager"],
    facilityId: null,
    districtId: 1,
    provinceId: 1,
    permissions: ["view_clients", "approve_plans"],
    dataAccessScope: { provinces: [], districts: [1], facilities: [] },
  },
  {
    label: "national admin",
    email: "test.national.admin+no401@vaxplan.org",
    id: "test-no401-national-admin",
    role: "national_admin",
    roles: ["national_admin"],
    facilityId: null,
    districtId: null,
    provinceId: null,
    permissions: [],
    dataAccessScope: { provinces: [], districts: [], facilities: [] },
  },
];

// Endpoints under test. We hit POST with empty `{}` bodies on purpose: we
// only care that an authenticated request never resolves to 401. 400 (bad
// payload), 403 (RBAC), 409 (conflict), or 201 (success) all confirm the
// handler ran past the auth gate.
const READ_ENDPOINTS = [
  "/api/microplans",
  "/api/sessions",
  "/api/population",
  "/api/htr-scores",
  "/api/vaccine-requirements",
  "/api/budget-items",
  "/api/supervision-visits",
  // Per-user (non-tenant-scoped) endpoints that previously did their own
  // `if (!userId) return 401` lookup after isAuthenticated — same false-401
  // shape as the original bug, now routed through requireDbUser.
  "/api/notifications",
  "/api/supervision/digest/preview",
] as const;

const WRITE_ENDPOINTS = [
  "/api/microplans",
  "/api/sessions",
  "/api/population",
  "/api/htr-scores",
  "/api/vaccine-requirements",
  "/api/budget-items",
  "/api/supervision-visits",
  // Notification mark-read endpoints — these also re-resolved the caller
  // by hand and 401'd on null. Covered here so the regression cannot
  // sneak back in.
  "/api/notifications/read-all",
] as const;

let app: Express;
let httpServer: HttpServer;
let tenantId: string;
const agents = new Map<string, ReturnType<typeof request.agent>>();

beforeAll(async () => {
  app = express();
  app.use(express.json());
  httpServer = createServer(app);
  await registerRoutes(httpServer, app);

  // Pin to PNG if present (matches the local-dev seed), otherwise fall back
  // to whichever active tenant the test DB already has.
  const [png] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.code, "PNG"))
    .limit(1);
  if (png) {
    tenantId = png.id;
  } else {
    const [any] = await db.select({ id: tenants.id }).from(tenants).limit(1);
    if (!any) {
      throw new Error(
        "No tenants in test DB. Run the country bootstrap seeds before running this test.",
      );
    }
    tenantId = any.id;
  }

  // Provision a dedicated user per role with the right tenant + scope so
  // the mock-login endpoint preserves them instead of falling back to its
  // default "facility_clerk" creation path. Upsert (delete-then-insert keyed
  // by id) keeps the test idempotent across re-runs.
  for (const f of ROLE_FIXTURES) {
    await db.delete(users).where(eq(users.id, f.id));
    await db.insert(users).values({
      id: f.id,
      email: f.email,
      firstName: "Test",
      lastName: f.label,
      role: f.role as any,
      roles: f.roles as any,
      permissions: f.permissions as any,
      dataAccessScope: f.dataAccessScope as any,
      facilityId: f.facilityId,
      districtId: f.districtId,
      provinceId: f.provinceId,
      isActive: true,
      tenantId,
    } as any);

    const agent = request.agent(app);
    const loginRes = await agent.get(`/api/login?email=${encodeURIComponent(f.email)}`);
    if (loginRes.status !== 302 && loginRes.status !== 200) {
      throw new Error(
        `Mock login failed for ${f.email}: ${loginRes.status} ${loginRes.text}`,
      );
    }
    agents.set(f.email, agent);
  }
});

afterAll(async () => {
  for (const f of ROLE_FIXTURES) {
    await db.delete(users).where(eq(users.id, f.id)).catch(() => {});
  }
  try {
    httpServer?.close();
  } catch {
    // ignore
  }
  await pool.end().catch(() => {});
});

describe("authenticated users never see 401 on core read/write endpoints", () => {
  for (const fixture of ROLE_FIXTURES) {
    describe(`role: ${fixture.label}`, () => {
      const agentFor = () => {
        const a = agents.get(fixture.email);
        if (!a) throw new Error(`no agent for ${fixture.email}`);
        return a;
      };

      for (const path of READ_ENDPOINTS) {
        it(`GET ${path} is not 401`, async () => {
          const res = await agentFor().get(path).set("x-tenant-id", tenantId);
          expect(
            res.status,
            `GET ${path} returned 401 for authenticated ${fixture.label}. ` +
              `This is the exact regression the test guards against — a route ` +
              `is rejecting a valid session after isAuthenticated passed. ` +
              `Body=${res.text}`,
          ).not.toBe(401);
        });
      }

      for (const path of WRITE_ENDPOINTS) {
        it(`POST ${path} is not 401`, async () => {
          const res = await agentFor()
            .post(path)
            .set("x-tenant-id", tenantId)
            .send({});
          expect(
            res.status,
            `POST ${path} returned 401 for authenticated ${fixture.label}. ` +
              `This is the false-Unauthorized regression — a write handler ` +
              `is rejecting a valid session (likely "if (!dbUser) return 401" ` +
              `downstream of isAuthenticated). 400/403/409 are all fine; only ` +
              `401 fails this test. Body=${res.text}`,
          ).not.toBe(401);
        });
      }
    });
  }
});
