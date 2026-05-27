/**
 * Server-Side Sync Service
 *
 * Implements the bi-directional sync protocol used by the VaxPlan offline clients.
 *
 * Protocol summary:
 *   PULL — GET /api/sync/pull?since=<ISO>&tenantId=<id>
 *     Returns all records modified since `since` for the tenant.
 *     If `since` is omitted → full national replica download.
 *
 *   PUSH — POST /api/sync/batch
 *     Accepts an array of OutboxItem mutations. Applies each to Postgres.
 *     Returns per-item success/failure results.
 *     On conflict: server version wins (last-writer-wins), conflict is logged.
 */

import { db } from "../db";
import { storage } from "../storage";
import {
  facilities,
  villages,
  clients,
  clientVaccinations,
  sessionPlans,
  budgetItems,
  stockTransactions,
  monthlyReports,
  populationData,
  provinces,
  districts,
  regions,
  vaccineConfigurations,
  auditLogs,
  llgs,
  sessionDayPlans,
  mobilizationActivities, // COMMENT: Added mobilizationActivities import for social mobilization offline sync
} from "@shared/schema";
import { eq, and, gt, sql } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OutboxMutation {
  id: number;                        // outbox item id on the client
  tenantId: string;
  entityType: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;                       // e.g. "/api/clients"
  body?: string;                     // JSON string
  localId?: string;
  serverId?: string | number;
  retries: number;
}

export interface MutationResult {
  outboxId: number;
  success: boolean;
  error?: string;
  serverId?: string | number;
}

export interface PullPayload {
  serverTime: string;
  regions?: any[];
  provinces?: any[];
  districts?: any[];
  llgs?: any[];
  facilities?: any[];
  villages?: any[];
  clients?: any[];
  clientVaccinations?: any[];
  sessionPlans?: any[];
  sessionDayPlans?: any[];
  stockTransactions?: any[];
  monthlyReports?: any[];
  populationData?: any[];
  vaccineConfigs?: any[];
  budgetItems?: any[];
  mobilizationActivities?: any[];
}

// ─── PULL — server → client ───────────────────────────────────────────────────

/**
 * Returns all records for a tenant modified since a given timestamp.
 * If `since` is null, returns the full dataset (initial sync).
 */
export async function pullChanges(
  tenantId: string,
  since: Date | null,
): Promise<PullPayload> {

  /*
  // Original Code: Mismatched tenant filter that checks table.updatedAt on all tables.
  // This fails and throws database errors for tables that do not have an updatedAt column in Postgres.
  // Also, llgs were not included in the sync payload.
  const tenantFilter = (table: any) =>
    since
      ? and(eq(table.tenantId, tenantId), gt(table.updatedAt, since))
      : eq(table.tenantId, tenantId);

  const [
    regionsData,
    provincesData,
    districtsData,
    facilitiesData,
    villagesData,
    clientsData,
    vaccinationsData,
    sessionPlansData,
    stockData,
    reportsData,
    popData,
    vaccineConfigsData,
  ] = await Promise.all([
    db.select().from(regions).where(tenantFilter(regions)),
    db.select().from(provinces).where(tenantFilter(provinces)),
    db.select().from(districts).where(tenantFilter(districts)),
    db.select().from(facilities).where(tenantFilter(facilities)),
    db.select().from(villages).where(tenantFilter(villages)),
    db.select().from(clients).where(tenantFilter(clients)),
    db.select().from(clientVaccinations).where(tenantFilter(clientVaccinations)),
    db.select().from(sessionPlans).where(tenantFilter(sessionPlans)),
    db.select().from(stockTransactions).where(tenantFilter(stockTransactions)),
    db.select().from(monthlyReports).where(tenantFilter(monthlyReports)),
    db.select().from(populationData).where(tenantFilter(populationData)),
    db.select().from(vaccineConfigurations).where(tenantFilter(vaccineConfigurations)),
  ]);
  */

  const tenantFilter = (table: any) => {
    if (!since) return eq(table.tenantId, tenantId);
    const timeCol = table.updatedAt || table.createdAt;
    if (timeCol) {
      return and(eq(table.tenantId, tenantId), gt(timeCol, since));
    }
    return eq(table.tenantId, tenantId);
  };

  const [
    regionsData,
    provincesData,
    districtsData,
    llgsData,
    facilitiesData,
    villagesData,
    clientsData,
    vaccinationsData,
    sessionPlansData,
    sessionDayPlansData,
    budgetItemsData,
    mobilizationActivitiesData,
    stockData,
    reportsData,
    popData,
    vaccineConfigsData,
  ] = await Promise.all([
    db.select().from(regions).where(tenantFilter(regions)),
    db.select().from(provinces).where(tenantFilter(provinces)),
    db.select().from(districts).where(tenantFilter(districts)),
    db.select().from(llgs).where(tenantFilter(llgs)),
    db.select().from(facilities).where(tenantFilter(facilities)),
    db.select().from(villages).where(tenantFilter(villages)),
    db.select().from(clients).where(tenantFilter(clients)),
    db.select().from(clientVaccinations).where(tenantFilter(clientVaccinations)),
    db.select().from(sessionPlans).where(tenantFilter(sessionPlans)),
    db.select().from(sessionDayPlans).where(tenantFilter(sessionDayPlans)),
    db.select().from(budgetItems).where(tenantFilter(budgetItems)),
    db.select().from(mobilizationActivities).where(tenantFilter(mobilizationActivities)),
    db.select().from(stockTransactions).where(tenantFilter(stockTransactions)),
    db.select().from(monthlyReports).where(tenantFilter(monthlyReports)),
    db.select().from(populationData).where(tenantFilter(populationData)),
    db.select().from(vaccineConfigurations).where(tenantFilter(vaccineConfigurations)),
  ]);

  return {
    serverTime: new Date().toISOString(),
    regions: regionsData,
    provinces: provincesData,
    districts: districtsData,
    llgs: llgsData,
    facilities: facilitiesData,
    villages: villagesData,
    clients: clientsData,
    clientVaccinations: vaccinationsData,
    sessionPlans: sessionPlansData,
    sessionDayPlans: sessionDayPlansData,
    budgetItems: budgetItemsData,
    mobilizationActivities: mobilizationActivitiesData,
    stockTransactions: stockData,
    monthlyReports: reportsData,
    populationData: popData,
    vaccineConfigs: vaccineConfigsData,
  };
}

// ─── PUSH — client → server (batch apply) ────────────────────────────────────

/**
 * Applies a batch of offline mutations to the database.
 * Each mutation is applied independently — partial success is allowed.
 *
 * Security: tenantId in each mutation is always overridden with the
 * authenticated tenant from the session (never trusted from client payload).
 */
export async function batchMutate(
  tenantId: string,
  mutations: OutboxMutation[],
  performedById: string | null,
): Promise<MutationResult[]> {
  const results: MutationResult[] = [];

  for (const mutation of mutations) {
    try {
      const body = mutation.body ? JSON.parse(mutation.body) : {};
      // Always stamp the server's tenantId — never trust client-provided tenantId
      const payload = { ...body, tenantId };

      let serverId: string | number | undefined;

      if (mutation.url.startsWith("/api/clients")) {
        if (mutation.method === "POST") {
          const client = await storage.createClient(tenantId, payload);
          serverId = client.id;
        } else if ((mutation.method === "PATCH" || mutation.method === "PUT") && mutation.serverId) {
          await storage.updateClient(tenantId, String(mutation.serverId), payload);
          serverId = mutation.serverId;
        }

      } else if (mutation.url.includes("/vaccinations") || mutation.url.startsWith("/api/client-vaccinations")) {
        if (mutation.method === "POST") {
          const vac = await storage.createClientVaccination(tenantId, payload);
          serverId = vac.id;
        }

      } else if (mutation.url.startsWith("/api/stock-transactions") || mutation.url.startsWith("/api/stock/transaction")) {
        /* ORIGINAL CODE:
        if (mutation.method === "POST") {
          const tx = await storage.createStockTransaction(tenantId, payload);
          serverId = tx.id;
        }
        */

        // EXPLANATION OF CHANGE:
        // 1. The client registers stock card entries via both `/api/stock-transactions` and `/api/stock/transaction` depending on the route.
        // 2. We coerce string dates (expiryDate, transactionDate) to native JavaScript Date objects to satisfy Postgres/Drizzle type checks.
        // 3. We also support the `DELETE` method when reverting stock ledger entries while offline.
        if (mutation.method === "POST") {
          const txPayload = {
            ...payload,
            expiryDate: payload.expiryDate ? new Date(payload.expiryDate) : undefined,
            transactionDate: payload.transactionDate ? new Date(payload.transactionDate) : new Date(),
          };
          const tx = await storage.createStockTransaction(tenantId, txPayload);
          serverId = tx.id;
        } else if (mutation.method === "DELETE") {
          // If transaction ID is in URL or serverId
          let txId = mutation.serverId ? Number(mutation.serverId) : null;
          if (!txId) {
            const parts = mutation.url.split("/");
            const lastPart = parts[parts.length - 1];
            if (lastPart && !isNaN(Number(lastPart))) {
              txId = Number(lastPart);
            }
          }
          if (txId) {
            await storage.deleteStockTransaction(tenantId, txId);
            serverId = txId;
          }
        }

      } else if (mutation.url.startsWith("/api/monthly-reports")) {
        if (mutation.method === "POST") {
          const report = await storage.createMonthlyReport(tenantId, {
            ...payload,
            submittedById: performedById,
          });
          serverId = report.id;
        }

      /* Original Code: Only mapped session-plans / sessions in sync push
      } else if (mutation.url.startsWith("/api/session-plans") || mutation.url.startsWith("/api/sessions")) {
        if (mutation.method === "POST") {
          const plan = await storage.createSessionPlan(tenantId, payload);
          serverId = plan.id;
        } else if ((mutation.method === "PATCH" || mutation.method === "PUT") && mutation.serverId) {
          await storage.updateSessionPlan(tenantId, Number(mutation.serverId), payload);
          serverId = mutation.serverId;
        }
      */
      // Updated Code: Mapped both session-plans/sessions and session-day-plans/sessionDayPlans for comprehensive sync support
      } else if (mutation.url.startsWith("/api/session-plans") || mutation.url.startsWith("/api/sessions")) {
        if (mutation.method === "POST") {
          const plan = await storage.createSessionPlan(tenantId, payload);
          serverId = plan.id;
        } else if ((mutation.method === "PATCH" || mutation.method === "PUT") && mutation.serverId) {
          await storage.updateSessionPlan(tenantId, Number(mutation.serverId), payload);
          serverId = mutation.serverId;
        }

      } else if (mutation.url.includes("/api/session-day-plans") || mutation.url.includes("/api/sessionDayPlans")) {
        if (mutation.method === "POST") {
          const dayPlan = await storage.createSessionDayPlan(tenantId, payload);
          serverId = dayPlan.id;
        } else if ((mutation.method === "PATCH" || mutation.method === "PUT") && mutation.serverId) {
          await storage.updateSessionDayPlan(tenantId, Number(mutation.serverId), payload);
          serverId = mutation.serverId;
        } else if (mutation.method === "DELETE") {
          let dayPlanId = mutation.serverId ? Number(mutation.serverId) : null;
          if (!dayPlanId) {
            const parts = mutation.url.split("/");
            const lastPart = parts[parts.length - 1];
            if (lastPart && !isNaN(Number(lastPart))) {
              dayPlanId = Number(lastPart);
            }
          }
          if (dayPlanId) {
            await storage.deleteSessionDayPlan(tenantId, dayPlanId);
            serverId = dayPlanId;
          }
        }

      } else if (mutation.url.startsWith("/api/budget-items")) {
        if (mutation.method === "POST") {
          const item = await storage.createBudgetItem(tenantId, payload);
          serverId = item.id;
        } else if ((mutation.method === "PATCH" || mutation.method === "PUT") && mutation.serverId) {
          await storage.updateBudgetItem(tenantId, Number(mutation.serverId), payload);
          serverId = mutation.serverId;
        } else if (mutation.method === "DELETE") {
          let itemId = mutation.serverId ? Number(mutation.serverId) : null;
          if (!itemId) {
            const parts = mutation.url.split("/");
            const lastPart = parts[parts.length - 1];
            if (lastPart && !isNaN(Number(lastPart))) {
              itemId = Number(lastPart);
            }
          }
          if (itemId) {
            await storage.deleteBudgetItem(tenantId, itemId);
            serverId = itemId;
          }
        }
      } else if (mutation.url.startsWith("/api/mobilization")) {
        if (mutation.method === "POST") {
          const activity = await storage.createMobilizationActivity(tenantId, payload);
          serverId = activity.id;
        } else if ((mutation.method === "PATCH" || mutation.method === "PUT") && mutation.serverId) {
          await storage.updateMobilizationActivity(tenantId, Number(mutation.serverId), payload);
          serverId = mutation.serverId;
        } else if (mutation.method === "DELETE") {
          let activityId = mutation.serverId ? Number(mutation.serverId) : null;
          if (!activityId) {
            const parts = mutation.url.split("/");
            const lastPart = parts[parts.length - 1];
            if (lastPart && !isNaN(Number(lastPart))) {
              activityId = Number(lastPart);
            }
          }
          if (activityId) {
            await db.delete(mobilizationActivities).where(and(eq(mobilizationActivities.id, activityId), eq(mobilizationActivities.tenantId, tenantId)));
            serverId = activityId;
          }
        }

      } else {
        // Unknown mutation — log and skip
        console.warn(`[syncService] Unknown mutation URL: ${mutation.url}`);
        results.push({ outboxId: mutation.id, success: false, error: `Unknown mutation URL: ${mutation.url}` });
        continue;
      }

      // Audit log
      try {
        await db.insert(auditLogs).values({
          tenantId,
          userId: performedById ?? "offline-sync",
          action: `offline_sync_${mutation.method.toLowerCase()}_${mutation.entityType}`,
          entityType: mutation.entityType,
          entityId: serverId ? Number(serverId) : null,
          newValue: payload,
        } as any);
      } catch {
        // Audit failure shouldn't block the mutation result
      }

      results.push({ outboxId: mutation.id, success: true, serverId });
    } catch (err: any) {
      console.error(`[syncService] mutation failed (outboxId=${mutation.id}):`, err);
      results.push({
        outboxId: mutation.id,
        success: false,
        error: err?.message ?? "Mutation failed",
      });
    }
  }

  return results;
}

// ─── Sync statistics ──────────────────────────────────────────────────────────

export async function getSyncStats(tenantId: string) {
  const [
    facilityCount,
    clientCount,
    vaccinationCount,
    sessionCount,
    reportCount,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(facilities).where(eq(facilities.tenantId, tenantId)),
    db.select({ count: sql<number>`count(*)` }).from(clients).where(eq(clients.tenantId, tenantId)),
    db.select({ count: sql<number>`count(*)` }).from(clientVaccinations).where(eq(clientVaccinations.tenantId, tenantId)),
    db.select({ count: sql<number>`count(*)` }).from(sessionPlans).where(eq(sessionPlans.tenantId, tenantId)),
    db.select({ count: sql<number>`count(*)` }).from(monthlyReports).where(eq(monthlyReports.tenantId, tenantId)),
  ]);

  return {
    facilities: Number(facilityCount[0]?.count ?? 0),
    clients: Number(clientCount[0]?.count ?? 0),
    vaccinations: Number(vaccinationCount[0]?.count ?? 0),
    sessions: Number(sessionCount[0]?.count ?? 0),
    reports: Number(reportCount[0]?.count ?? 0),
    serverTime: new Date().toISOString(),
  };
}
