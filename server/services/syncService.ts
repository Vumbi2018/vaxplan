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
  sessionVillages,
  mobilizationActivities, // COMMENT: Added mobilizationActivities import for social mobilization offline sync
} from "@shared/schema";
import { eq, and, gt, sql, inArray } from "drizzle-orm";
import { canonicalizePerAntigen } from "@shared/vaccineSchedule";
import { checkProximityAndPopulation } from "./proximityCheck";

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
  /**
   * Set by the mark-done sync handler when the queued perAntigen payload
   * contained codes outside the tenant's configured vaccine schedule.
   * The client surfaces a warning toast so health workers know their counts
   * went into an "unmapped" bucket and need a schedule refresh / app update.
   */
  unmappedAntigenCodes?: string[];
  /**
   * Task #181 — Set by the session PATCH outbox-replay handler when the
   * queued edit would have triggered a proximity/population warning had
   * it been issued online. We still apply the edit (the clerk already
   * committed it offline and we can't lose the work), but pass the
   * warnings back so the client can show a toast asking them to review.
   */
  proximityWarnings?: string[];
  proximityNearbySessions?: any[];
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
    // Task #181 — hoisted so the session PATCH replay branch can populate
    // them and the common results.push at the bottom can attach them.
    let proximityWarnings: string[] | undefined;
    let proximityNearby: any[] | undefined;

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
      } else if (/^\/api\/sessions\/\d+\/mark-done\/?$/.test(mutation.url)) {
        // Outbox replay for a session marked done while offline.
        // Mirrors POST /api/sessions/:id/mark-done in routes.ts: validates
        // perAntigen against the tenant's vaccine schedule, splits unknown
        // codes into an "unmapped" bucket, and reports them back so the
        // client can surface a warning toast (Task #106).
        const m = mutation.url.match(/^\/api\/sessions\/(\d+)\/mark-done/);
        const sessionId = m ? Number(m[1]) : NaN;
        if (!Number.isFinite(sessionId)) {
          throw new Error(`mark-done: invalid session id in URL ${mutation.url}`);
        }
        const old = await storage.getSessionPlan(tenantId, sessionId);
        if (!old) throw new Error(`mark-done: session ${sessionId} not found`);
        const rawPerAntigen =
          payload.perAntigen && typeof payload.perAntigen === "object"
            ? (payload.perAntigen as Record<string, unknown>)
            : {};
        const tenantConfigs = await storage.getVaccineConfigs(tenantId);
        const { perAntigen, perAntigenUnmapped, unmappedCodes } =
          canonicalizePerAntigen(rawPerAntigen, tenantConfigs);
        const totals = Number(
          payload.totals != null
            ? payload.totals
            : Object.values(perAntigen).reduce((s: number, n: any) => s + Number(n || 0), 0)
              + Object.values(perAntigenUnmapped).reduce((s: number, n: any) => s + Number(n || 0), 0),
        );
        const vc: Record<string, any> = {
          totals: Number.isFinite(totals) && totals >= 0 ? totals : 0,
          perAntigen,
          actualDate: payload.actualDate || new Date().toISOString(),
          note: payload.note ?? null,
        };
        if (unmappedCodes.length > 0) {
          vc.perAntigenUnmapped = perAntigenUnmapped;
        }
        const updated = await storage.updateSessionPlan(tenantId, sessionId, {
          status: "completed",
          isAchieved: true,
          completedAt: new Date() as any,
          vaccinatedCounts: vc as any,
        } as any);
        if (!updated) throw new Error(`mark-done: session ${sessionId} not found on update`);
        serverId = sessionId;
        if (unmappedCodes.length > 0) {
          try {
            await db.insert(auditLogs).values({
              tenantId,
              userId: performedById ?? "offline-sync",
              action: "mark_done_unmapped_antigens",
              entityType: "session_plan",
              entityId: sessionId,
              newValue: { unmappedCodes, perAntigenUnmapped, source: "offline_outbox" },
            } as any);
          } catch {
            /* audit failure shouldn't block the mutation result */
          }
          console.warn(
            `[sync/mark-done] session ${sessionId} (tenant ${tenantId}) replayed with antigen codes outside the configured schedule:`,
            unmappedCodes,
          );
        }
        results.push({
          outboxId: mutation.id,
          success: true,
          serverId,
          unmappedAntigenCodes: unmappedCodes,
        });
        continue;

      } else if (mutation.url.startsWith("/api/session-plans") || mutation.url.startsWith("/api/sessions")) {
        if (mutation.method === "POST") {
          const plan = await storage.createSessionPlan(tenantId, payload);
          serverId = plan.id;
        } else if ((mutation.method === "PATCH" || mutation.method === "PUT") && mutation.serverId) {
          // Task #163 — Offline-aware PATCH replay must also reconcile
          // session_villages when the queued payload carries a villageIds
          // array. Without this, a clerk who added/removed villages while
          // offline would silently lose those edits after sync, because
          // updateSessionPlan only touches the session_plans row.
          const incomingVillageIds = (payload as any)?.villageIds;
          const overrideFlag = (payload as any)?.override === true;
          const planPayload: any = { ...payload };
          delete planPayload.villageIds;
          delete planPayload.override;
          const sessionId = Number(mutation.serverId);

          // Task #181 — Re-run the same proximity/population guard that
          // PATCH /api/sessions/:id runs online. The online path rejects
          // with HTTP 409; we cannot reject here because the clerk already
          // committed this edit offline and discarding it would silently
          // lose work. Instead, we apply the edit and pass the warnings
          // back through MutationResult.proximityWarnings so the client
          // can surface a review-toast on the next sync. Skip when the
          // queued payload carried override:true (the clerk consciously
          // bypassed the warning while offline).
          if (!overrideFlag) {
            try {
              const oldSession = await storage.getSessionPlan(tenantId, sessionId);
              const effectiveDate =
                (payload as any).scheduledDate ?? oldSession?.scheduledDate;
              if (oldSession && effectiveDate) {
                const villageIdsForCheck = Array.isArray(incomingVillageIds)
                  ? incomingVillageIds
                      .map((x: any) => Number(x))
                      .filter((n: number) => Number.isFinite(n) && n > 0)
                  : undefined;
                const prox = await checkProximityAndPopulation(tenantId, {
                  facilityId: oldSession.facilityId,
                  scheduledDate: effectiveDate as any,
                  targetPopulation: Number(
                    (payload as any).targetPopulation ??
                      oldSession.targetPopulation ??
                      0,
                  ),
                  villageIds: villageIdsForCheck,
                  excludeSessionId: sessionId,
                });
                proximityWarnings = prox.warnings;
                proximityNearby = prox.nearbySessions;
              }
            } catch (proxErr) {
              // Don't block the replay on a proximity-check failure;
              // we still want the queued edit applied. Log and move on.
              console.warn(
                `[sync] proximity check failed for session ${sessionId} (tenant ${tenantId}):`,
                proxErr,
              );
            }
          }

          await storage.updateSessionPlan(tenantId, sessionId, planPayload);
          serverId = mutation.serverId;
          if (Array.isArray(incomingVillageIds)) {
            const sanitized = Array.from(new Set(
              incomingVillageIds
                .map((x: any) => Number(x))
                .filter((n: number) => Number.isFinite(n) && n > 0),
            )) as number[];
            let validIds: number[] = [];
            if (sanitized.length > 0) {
              const tenantVillages = await db
                .select({ id: villages.id })
                .from(villages)
                .where(and(eq(villages.tenantId, tenantId), inArray(villages.id, sanitized)));
              validIds = tenantVillages.map((v) => v.id);
            }
            const existingRows = await db
              .select({ villageId: sessionVillages.villageId })
              .from(sessionVillages)
              .where(and(
                eq(sessionVillages.tenantId, String(tenantId)),
                eq(sessionVillages.sessionId, sessionId),
              ));
            const before = existingRows.map((r) => r.villageId);
            const beforeSet = new Set(before);
            const afterSet = new Set(validIds);
            const toAdd = validIds.filter((id) => !beforeSet.has(id));
            const toRemove = before.filter((id) => !afterSet.has(id));
            if (toRemove.length > 0) {
              await db
                .delete(sessionVillages)
                .where(and(
                  eq(sessionVillages.tenantId, String(tenantId)),
                  eq(sessionVillages.sessionId, sessionId),
                  inArray(sessionVillages.villageId, toRemove),
                ));
            }
            if (toAdd.length > 0) {
              const baseIdx = before.length;
              await db.insert(sessionVillages).values(
                toAdd.map((vid, idx) => ({
                  tenantId,
                  sessionId,
                  villageId: vid,
                  orderIndex: baseIdx + idx,
                })),
              );
            }
          }
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

      const result: MutationResult = { outboxId: mutation.id, success: true, serverId };
      if (proximityWarnings && proximityWarnings.length > 0) {
        result.proximityWarnings = proximityWarnings;
        result.proximityNearbySessions = proximityNearby ?? [];
        // Best-effort audit so reviewers can see the offline-sync replayed
        // through a proximity warning the online path would have rejected.
        try {
          await db.insert(auditLogs).values({
            tenantId,
            userId: performedById ?? "offline-sync",
            action: "offline_sync_proximity_warning",
            entityType: "session_plan",
            entityId: serverId ? Number(serverId) : null,
            newValue: {
              warnings: proximityWarnings,
              nearbySessions: proximityNearby ?? [],
              source: "offline_outbox",
            },
          } as any);
        } catch {
          /* audit failure shouldn't block the mutation result */
        }
      }
      results.push(result);
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
