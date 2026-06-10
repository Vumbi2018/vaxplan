/**
 * microplanApprovalCron.ts
 *
 * Background job that runs every 6 hours and:
 *  1. Sends a 7-day reminder to district officials for microplans still "pending"
 *     after 7 days without action.
 *  2. Auto-approves microplans that have been pending for ≥14 days without a
 *     district-level decision ("silence = consent" policy).
 *
 * Both thresholds are configurable via environment variables:
 *   MICROPLAN_REMINDER_DAYS   (default: 7)
 *   MICROPLAN_AUTO_APPROVE_DAYS (default: 14)
 */

import { storage } from "../storage";
import { db } from "../db";
import { eq, and, lt, isNull } from "drizzle-orm";
import { notifications, users, microplans, approvalRequests } from "@shared/schema";

const HOUR_MS  = 60 * 60 * 1000;
const DAY_MS   = 24 * HOUR_MS;

function envDays(envVar: string, defaultDays: number): number {
  const raw = process.env[envVar];
  const val = raw ? parseInt(raw, 10) : defaultDays;
  return Number.isFinite(val) && val > 0 ? val : defaultDays;
}

// ─── Core job ──────────────────────────────────────────────────────────────
export async function runMicroplanApprovalCron(now: Date = new Date()): Promise<{
  reminders: number;
  autoApproved: number;
}> {
  const reminderDays    = envDays("MICROPLAN_REMINDER_DAYS", 7);
  const autoApproveDays = envDays("MICROPLAN_AUTO_APPROVE_DAYS", 14);

  const reminderThreshold    = new Date(now.getTime() - reminderDays    * DAY_MS);
  const autoApproveThreshold = new Date(now.getTime() - autoApproveDays * DAY_MS);

  let reminders    = 0;
  let autoApproved = 0;

  const tenants = await storage.listActiveTenants();

  for (const tenant of tenants) {
    try {
      // Fetch all pending microplans for this tenant that have a submittedAt
      const pendingMicroplans = await db
        .select()
        .from(microplans)
        .where(
          and(
            eq((microplans as any).tenantId, tenant.id),
            eq((microplans as any).status, "pending"),
          )
        );

      for (const mp of pendingMicroplans) {
        const submittedAt: Date | null = (mp as any).submittedAt ? new Date((mp as any).submittedAt) : null;
        if (!submittedAt) continue;

        // ── Auto-approve: pending ≥ autoApproveDays ────────────────────────
        if (submittedAt <= autoApproveThreshold) {
          try {
            // Create an approval record marked as auto-approved
            await db.insert(approvalRequests as any).values({
              tenantId: tenant.id,
              entityType: "microplan",
              entityId: mp.id,
              currentLevel: "district",
              status: "approved",
              comments: `Auto-approved after ${autoApproveDays} days without district action.`,
              requestedById: null,
              resolvedAt: now,
              resolvedById: null,
            }).catch(() => {});

            // Update microplan status and set autoApprovedAt
            await storage.updateMicroplan(tenant.id, mp.id, {
              status: "approved",
              autoApprovedAt: now,
            } as any).catch(() => {});

            // Notify facility in-charge
            const facilityUsers = await db.select({ id: users.id })
              .from(users)
              .where(and(
                eq(users.tenantId, tenant.id),
                eq(users.facilityId as any, (mp as any).facilityId as any),
              ));
            for (const u of facilityUsers) {
              await db.insert(notifications).values({
                tenantId: tenant.id,
                userId: u.id,
                type: "microplan_auto_approved",
                title: "Microplan auto-approved",
                body: `Your microplan was automatically approved after ${autoApproveDays} days. You may proceed with implementation.`,
                data: { microplanId: mp.id } as any,
              }).catch(() => {});
            }

            autoApproved++;
            console.log(`[microplan-cron] Auto-approved microplan ${mp.id} for tenant ${tenant.id}`);
          } catch (err) {
            console.warn(`[microplan-cron] Failed to auto-approve microplan ${mp.id}:`, err);
          }
          continue; // no reminder needed if auto-approved
        }

        // ── 7-day reminder: pending ≥ reminderDays and not yet reminded ────
        if (submittedAt <= reminderThreshold) {
          const alreadyReminded = (mp as any).reminderSentAt != null;
          if (alreadyReminded) continue;

          try {
            // Get district users for the facility
            const allFacilities = await storage.getFacilities(tenant.id);
            const fac = allFacilities.find((f: any) => f.id === (mp as any).facilityId);
            if (!fac?.districtId) continue;

            const districtUsers = await db.select({ id: users.id, role: users.role })
              .from(users)
              .where(and(
                eq(users.tenantId, tenant.id),
                eq(users.districtId as any, fac.districtId as any),
              ));

            const targets = districtUsers.filter((u: any) =>
              ["district_coordinator", "district_supervisor", "national_admin", "provincial_coordinator"].includes(u.role)
            );

            for (const u of targets) {
              await db.insert(notifications).values({
                tenantId: tenant.id,
                userId: u.id,
                type: "microplan_approval_reminder",
                title: `⏰ Reminder: Microplan awaiting approval — ${fac.name}`,
                body: `A microplan for ${fac.name} has been pending for ${reminderDays} days. It will be auto-approved in ${autoApproveDays - reminderDays} more days if no action is taken.`,
                data: { microplanId: mp.id, facilityId: fac.id } as any,
              }).catch(() => {});
            }

            // Mark reminder sent
            await storage.updateMicroplan(tenant.id, mp.id, {
              reminderSentAt: now,
            } as any).catch(() => {});

            reminders++;
            console.log(`[microplan-cron] Sent ${reminderDays}-day reminder for microplan ${mp.id}`);
          } catch (err) {
            console.warn(`[microplan-cron] Failed to send reminder for microplan ${mp.id}:`, err);
          }
        }
      }
    } catch (err) {
      console.warn(`[microplan-cron] Error processing tenant ${tenant.id}:`, err);
    }
  }

  if (reminders > 0 || autoApproved > 0) {
    console.log(`[microplan-cron] Done — reminders: ${reminders}, auto-approved: ${autoApproved}`);
  }

  return { reminders, autoApproved };
}

// ─── Scheduler ─────────────────────────────────────────────────────────────
let schedulerHandle: NodeJS.Timeout | null = null;

export function startMicroplanApprovalCron(): void {
  if (schedulerHandle) return;
  const intervalHours = 6; // Check every 6 hours
  const intervalMs = intervalHours * 60 * 60 * 1000;
  console.log(`[microplan-cron] scheduler started — checking every ${intervalHours}h | reminder=${envDays("MICROPLAN_REMINDER_DAYS",7)}d | auto-approve=${envDays("MICROPLAN_AUTO_APPROVE_DAYS",14)}d`);

  const tick = () => {
    runMicroplanApprovalCron().catch((err) => {
      console.error("[microplan-cron] cycle threw:", err);
    });
  };

  // First run after 60s to allow server warmup
  setTimeout(tick, 60_000);
  schedulerHandle = setInterval(tick, intervalMs);
}

export function stopMicroplanApprovalCron(): void {
  if (schedulerHandle) {
    clearInterval(schedulerHandle);
    schedulerHandle = null;
  }
}
