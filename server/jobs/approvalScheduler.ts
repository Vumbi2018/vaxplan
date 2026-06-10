import { db } from "../db";
import { microplans, approvalRequests, users, districts, provinces, facilities } from "@shared/schema";
import { eq, and, lt, isNull, or, sql } from "drizzle-orm";
import { scheduleAtMidnight } from "./scheduler";
import { sendEmail } from "../services/mailer";
import { storage } from "../storage";
import { seedQuarterlySupervisionVisits, sendApprovalSmsForMicroplan } from "../routes";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function runApprovalScheduler(): Promise<void> {
  const now = new Date();
  console.log(`[approval-scheduler] Running daily auto-approvals and reminders check at ${now.toISOString()}`);

  try {
    // 1. Process Auto-Approvals (Microplans pending for more than 14 days)
    const pendingToApprove = await db
      .select()
      .from(microplans)
      .where(
        and(
          eq(microplans.status, "pending"),
          lt(microplans.autoApproveAt, now)
        )
      );

    console.log(`[approval-scheduler] Found ${pendingToApprove.length} microplans eligible for auto-approval.`);

    for (const mp of pendingToApprove) {
      if (!mp.tenantId) continue;
      console.log(`[approval-scheduler] Auto-approving microplan ID: ${mp.id} (Tenant: ${mp.tenantId})`);

      // Update microplan status to 'auto_approved'
      await db
        .update(microplans)
        .set({
          status: "auto_approved",
          updatedAt: now,
        })
        .where(and(eq(microplans.id, mp.id), eq(microplans.tenantId, mp.tenantId)));

      // Resolve matching pending approval request
      const matchingRequests = await db
        .select()
        .from(approvalRequests)
        .where(
          and(
            eq(approvalRequests.tenantId, mp.tenantId),
            eq(approvalRequests.entityType, "microplan"),
            eq(approvalRequests.entityId, mp.id),
            eq(approvalRequests.status, "pending")
          )
        );

      for (const req of matchingRequests) {
        await db
          .update(approvalRequests)
          .set({
            status: "approved",
            comments: "Auto-approved after 2 weeks of inactivity",
            resolvedAt: now,
            resolvedById: "system",
          })
          .where(and(eq(approvalRequests.id, req.id), eq(approvalRequests.tenantId, mp.tenantId)));
      }

      // Seed quarterly supervisory visits for facilities in scope
      try {
        const seeded = await seedQuarterlySupervisionVisits(mp.tenantId, mp as any, null);
        console.log(`[approval-scheduler] Auto-seeded ${seeded.length} supervisory visits for microplan ID ${mp.id}`);
      } catch (seedErr) {
        console.error(`[approval-scheduler] Failed to seed supervision visits for microplan ${mp.id}:`, seedErr);
      }

      // Send SMS alerts to community focal points
      try {
        await sendApprovalSmsForMicroplan(mp.tenantId, mp.id);
        console.log(`[approval-scheduler] Dispatched approval SMS to focal points for microplan ID ${mp.id}`);
      } catch (smsErr) {
        console.error(`[approval-scheduler] Failed to send approval SMS for microplan ${mp.id}:`, smsErr);
      }
    }

    // 2. Process Reminders (Microplans pending for more than 7 days without reminder sent)
    const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
    const pendingToRemind = await db
      .select()
      .from(microplans)
      .where(
        and(
          eq(microplans.status, "pending"),
          lt(microplans.submittedAt, sevenDaysAgo),
          isNull(microplans.reminderSentAt)
        )
      );

    console.log(`[approval-scheduler] Found ${pendingToRemind.length} pending microplans requiring a 1-week review reminder.`);

    for (const mp of pendingToRemind) {
      if (!mp.tenantId || !mp.facilityId) continue;
      console.log(`[approval-scheduler] Sending reminder for microplan ID: ${mp.id} (Facility ID: ${mp.facilityId})`);

      const facility = await storage.getFacility(mp.tenantId, mp.facilityId);
      if (!facility) continue;

      const recipients: string[] = [];

      // Find District Managers for this district
      if (facility.districtId) {
        const distUsers = await db
          .select({ email: users.email })
          .from(users)
          .where(
            and(
              eq(users.tenantId, mp.tenantId),
              eq(users.districtId, facility.districtId),
              or(eq(users.role, "district_manager"), sql`${users.roles}::jsonb ? 'district_manager'`)
            )
          );
        distUsers.forEach((u) => { if (u.email) recipients.push(u.email); });
      }

      // Find Provincial Coordinators for this province
      const district = await storage.getDistrict(mp.tenantId, facility.districtId);
      if (district && district.provinceId) {
        const provUsers = await db
          .select({ email: users.email })
          .from(users)
          .where(
            and(
              eq(users.tenantId, mp.tenantId),
              eq(users.provinceId, district.provinceId),
              or(eq(users.role, "provincial_coordinator"), sql`${users.roles}::jsonb ? 'provincial_coordinator'`)
            )
          );
        provUsers.forEach((u) => { if (u.email) recipients.push(u.email); });
      }

      const uniqueRecipients = Array.from(new Set(recipients));
      const messageText = `REMINDER: The microplan for Health Facility "${facility.name}" was submitted 1 week ago and is still pending review. It will be automatically approved in 7 days if no action is taken. Please review the plan in the VaxPlan system.`;

      for (const email of uniqueRecipients) {
        await sendEmail({
          to: email,
          subject: `[VaxPlan Reminder] Pending Microplan: ${facility.name}`,
          text: messageText,
          tenantId: mp.tenantId,
        });
      }

      // Update the reminderSentAt date
      await db
        .update(microplans)
        .set({
          reminderSentAt: now,
          updatedAt: now,
        })
        .where(and(eq(microplans.id, mp.id), eq(microplans.tenantId, mp.tenantId)));

      console.log(`[approval-scheduler] Sent reminder email to ${uniqueRecipients.length} reviewers for microplan ID ${mp.id}`);
    }

  } catch (error) {
    console.error("[approval-scheduler] Error in approval scheduler run:", error);
  }
}

let schedulerHandle: (() => void) | null = null;

export function startApprovalScheduler(): void {
  if (schedulerHandle) return;
  console.log("[approval-scheduler] Initializing daily microplan approvals background job.");
  schedulerHandle = scheduleAtMidnight(
    "microplan-approval-scheduler",
    async () => {
      await runApprovalScheduler();
    },
    { offsetMinutes: 45 } // Run at 00:45 UTC, staggered from other jobs
  );
}

export function stopApprovalScheduler(): void {
  if (schedulerHandle) {
    schedulerHandle();
    schedulerHandle = null;
  }
}
