import { storage } from "../storage";
import {
  summarizeFacilityAlerts,
  hasFacilityAlerts,
  type FacilityStockAlertSummary,
} from "@shared/stockAlerts";
import {
  DEFAULT_STOCK_ALERT_DIGEST,
  type StockAlertDigestSettings,
} from "@shared/schema";
import { scheduleAtMidnight } from "./scheduler";


const DAY_MS = 24 * 60 * 60 * 1000;

function resolveSettings(raw: any): StockAlertDigestSettings {
  const merged = { ...DEFAULT_STOCK_ALERT_DIGEST, ...(raw ?? {}) };
  if (merged.frequency !== "daily" && merged.frequency !== "weekly") {
    merged.frequency = DEFAULT_STOCK_ALERT_DIGEST.frequency;
  }
  if (!(merged.thresholdMonths > 0)) {
    merged.thresholdMonths = DEFAULT_STOCK_ALERT_DIGEST.thresholdMonths;
  }
  if (!Array.isArray(merged.recipientRoles) || merged.recipientRoles.length === 0) {
    merged.recipientRoles = DEFAULT_STOCK_ALERT_DIGEST.recipientRoles;
  }
  return merged;
}

function intervalMsFor(freq: "daily" | "weekly"): number {
  return freq === "daily" ? DAY_MS : 7 * DAY_MS;
}

function buildBody(summary: FacilityStockAlertSummary, facilityName: string): string {
  const parts: string[] = [`${facilityName} stock alerts:`];
  if (summary.outOfStockAntigens.length) {
    parts.push(`• Out of stock: ${summary.outOfStockAntigens.join(", ")}`);
  }
  if (summary.lowStockAntigens.length) {
    parts.push(`• Low stock: ${summary.lowStockAntigens.join(", ")}`);
  }
  if (summary.expiredBatches > 0) {
    parts.push(`• Expired batches: ${summary.expiredBatches}`);
  }
  if (summary.expiringSoonBatches > summary.expiredBatches) {
    parts.push(
      `• Expiring within 30 days: ${summary.expiringSoonBatches - summary.expiredBatches}`,
    );
  }
  const farExpiry = summary.nearExpiryBatches - summary.expiringSoonBatches;
  if (farExpiry > 0) {
    parts.push(`• Expiring within 60 days: ${farExpiry}`);
  }
  return parts.join("\n");
}

export interface DigestRunResult {
  tenantsProcessed: number;
  notificationsCreated: number;
}

export async function runStockAlertDigest(now: Date = new Date()): Promise<DigestRunResult> {
  const tenants = await storage.listActiveTenants();
  let notificationsCreated = 0;
  let tenantsProcessed = 0;

  for (const tenant of tenants) {
    const settings = resolveSettings((tenant.settings as any)?.stockAlertDigest);
    if (!settings.enabled) continue;

    const lastRunIso = (tenant.settings as any)?.stockAlertDigest?.lastRunAt as
      | string
      | undefined;
    if (lastRunIso) {
      const lastRun = new Date(lastRunIso).getTime();
      // Apply a small (1h) clock-skew tolerance so we don't double-run on tick jitter.
      if (now.getTime() - lastRun < intervalMsFor(settings.frequency) - 60 * 60 * 1000) {
        continue;
      }
    }

    tenantsProcessed++;

    const [facilities, vaccineConfigs, transactions] = await Promise.all([
      storage.getFacilities(tenant.id),
      storage.getVaccineConfigs(tenant.id),
      storage.getStockTransactions(tenant.id),
    ]);
    const facilitiesById = new Map<number, (typeof facilities)[number]>(
      facilities.map((f) => [f.id, f]),
    );

    const summaries = summarizeFacilityAlerts(
      transactions,
      vaccineConfigs,
      settings.thresholdMonths,
      now,
    );

    const recipients = await storage.getUsersByTenantAndRoles(
      tenant.id,
      settings.recipientRoles ?? DEFAULT_STOCK_ALERT_DIGEST.recipientRoles!,
    );

    for (const summary of summaries) {
      if (!hasFacilityAlerts(summary)) continue;
      const facility = facilitiesById.get(summary.facilityId);
      if (!facility) continue;
      const facilityName = facility.name;

      // Deliver to every recipient assigned to this facility. Reviewers without
      // a facilityId never get facility-level digests (that's by design — they
      // use the rollup dashboard).
      const facilityUsers = recipients.filter((u) => u.facilityId === summary.facilityId);
      if (facilityUsers.length === 0) continue;

      const title = `Stock alert: ${facilityName}`;
      const body = buildBody(summary, facilityName);

      for (const user of facilityUsers) {
        await storage.createNotification({
          tenantId: tenant.id,
          userId: user.id,
          type: "stock_alert_digest",
          title,
          body,
          data: {
            facilityId: summary.facilityId,
            facilityName,
            summary,
            frequency: settings.frequency,
            generatedAt: now.toISOString(),
          },
        });
        notificationsCreated++;
      }
    }

    // Record the last run timestamp inside tenant settings so we honor frequency.
    const nextSettings = {
      ...((tenant.settings as Record<string, any>) ?? {}),
      stockAlertDigest: {
        ...((tenant.settings as any)?.stockAlertDigest ?? {}),
        ...settings,
        lastRunAt: now.toISOString(),
      },
    };
    await storage.updateTenant(tenant.id, { settings: nextSettings });
  }

  if (notificationsCreated > 0) {
    console.log(
      `[stock-alert-digest] sent ${notificationsCreated} notification(s) across ${tenantsProcessed} tenant(s)`,
    );
  }
  return { tenantsProcessed, notificationsCreated };
}

let schedulerHandle: (() => void) | null = null;

/**
 * Schedules the stock-alert digest to run once nightly at midnight UTC + 15 min.
 * Previously used setInterval every 6h starting 30s after boot — that caused
 * unnecessary DB load on startup and during peak working hours.
 *
 * The internal lastRunAt / frequency logic inside runStockAlertDigest still
 * handles daily vs weekly cadence (so the per-tenant settings are honoured).
 * The scheduler simply ensures the check happens at a low-traffic time.
 *
 * Set STOCK_ALERT_DIGEST_ENABLED=0 to disable completely (dev/test environments).
 */
export function startStockAlertDigestScheduler(): void {
  if (schedulerHandle) return;
  if (process.env.STOCK_ALERT_DIGEST_ENABLED === "0") {
    console.log("[stock-alert-digest] disabled via STOCK_ALERT_DIGEST_ENABLED=0");
    return;
  }
  schedulerHandle = scheduleAtMidnight(
    "stock-alert-digest",
    async () => {
      const result = await runStockAlertDigest();
      console.log(
        `[stock-alert-digest] nightly run — tenants=${result.tenantsProcessed} notifications=${result.notificationsCreated}`,
      );
    },
    { offsetMinutes: 15 }, // 00:15 UTC — staggered 15 min from session-archive
  );
}

export function stopStockAlertDigestScheduler(): void {
  if (schedulerHandle) {
    schedulerHandle();
    schedulerHandle = null;
  }
}

