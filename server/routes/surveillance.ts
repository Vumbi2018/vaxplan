import { Router } from "express";
import { db } from "../db";
import { 
  vpdLinelistTemplates, 
  tenantVpdConfigurations, 
  surveillanceCases, 
  labSamples,
  insertSurveillanceCaseSchema,
  insertVpdLinelistTemplateSchema,
  insertTenantVpdConfigurationSchema,
  insertLabSampleSchema,
  populationData
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { dispatchNotification } from "../services/uce";
import { isAuthenticated, ensureDbUserFromSession } from "../replitAuth";
import { requireTenant } from "../auth/tenantResolver";
import { requireDbUser } from "../auth/loadDbUser";

export const surveillanceRouter = Router();

// Middleware to ensure user is authenticated and tenant is resolved
surveillanceRouter.use(isAuthenticated, requireTenant, requireDbUser);

// ============================================================================
// VPD LINELIST TEMPLATES
// ============================================================================

surveillanceRouter.get("/templates", async (req: any, res) => {
  try {
    const templates = await db
      .select()
      .from(vpdLinelistTemplates)
      .where(eq(vpdLinelistTemplates.tenantId, req.tenantId));
    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

surveillanceRouter.post("/templates", async (req: any, res) => {
  try {
    const parsed = insertVpdLinelistTemplateSchema.parse({
      ...req.body,
      tenantId: req.tenantId,
      createdByUserId: req.user?.id,
    });
    const [created] = await db.insert(vpdLinelistTemplates).values(parsed).returning();
    res.json(created);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

surveillanceRouter.patch("/templates/:id", async (req: any, res) => {
  try {
    const [updated] = await db
      .update(vpdLinelistTemplates)
      .set({ ...req.body, updatedAt: new Date() })
      .where(
        and(
          eq(vpdLinelistTemplates.id, req.params.id),
          eq(vpdLinelistTemplates.tenantId, req.tenantId)
        )
      )
      .returning();
      
    if (!updated) {
      return res.status(404).json({ message: "Template not found" });
    }
    
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

surveillanceRouter.delete("/templates/:id", async (req: any, res) => {
  try {
    const [deleted] = await db
      .delete(vpdLinelistTemplates)
      .where(
        and(
          eq(vpdLinelistTemplates.id, req.params.id),
          eq(vpdLinelistTemplates.tenantId, req.tenantId)
        )
      )
      .returning();
      
    if (!deleted) {
      return res.status(404).json({ message: "Template not found" });
    }
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================================
// TENANT CONFIGURATIONS
// ============================================================================

surveillanceRouter.get("/config", async (req: any, res) => {
  try {
    const configs = await db
      .select()
      .from(tenantVpdConfigurations)
      .where(eq(tenantVpdConfigurations.tenantId, req.tenantId));
    res.json(configs);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

surveillanceRouter.post("/config", async (req: any, res) => {
  try {
    const parsed = insertTenantVpdConfigurationSchema.parse({
      ...req.body,
      tenantId: req.tenantId,
    });
    const [created] = await db
      .insert(tenantVpdConfigurations)
      .values(parsed)
      .onConflictDoUpdate({
        target: [tenantVpdConfigurations.tenantId, tenantVpdConfigurations.disease],
        set: {
          isActive: parsed.isActive,
          targetIncidenceRate: parsed.targetIncidenceRate,
          alertThreshold: parsed.alertThreshold,
          notifyRoles: parsed.notifyRoles,
          updatedAt: new Date()
        }
      })
      .returning();
    res.json(created);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// ============================================================================
// SURVEILLANCE CASES
// ============================================================================

surveillanceRouter.get("/cases", async (req: any, res) => {
  try {
    const cases = await db
      .select()
      .from(surveillanceCases)
      .where(eq(surveillanceCases.tenantId, req.tenantId));
    res.json(cases);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

surveillanceRouter.get("/cases/kpis", async (req: any, res) => {
  try {
    const popResult = await db
      .select({
        total: sql<number>`sum(${populationData.totalPopulation})`,
        under5: sql<number>`sum(${populationData.under5Population})`
      })
      .from(populationData)
      .where(eq(populationData.tenantId, req.tenantId));

    const totalPop = popResult[0]?.total || 0;
    const under5Pop = popResult[0]?.under5 || 0;
    // Proxy for under 15 population if not explicitly available, roughly 40-45% of total in many developing countries, 
    // or we can use under5 * 3 as a heuristic. We'll use total * 0.45.
    const under15Pop = Math.round(totalPop * 0.45);

    const cases = await db
      .select()
      .from(surveillanceCases)
      .where(eq(surveillanceCases.tenantId, req.tenantId));

    const afpCases = cases.filter(c => c.disease === "afp" && c.dateOfOnset.getFullYear() === new Date().getFullYear());
    const measlesCases = cases.filter(c => c.disease === "measles" && c.dateOfOnset.getFullYear() === new Date().getFullYear());

    // Non-polio AFP rate = (Total non-polio AFP cases in children < 15 / Total children < 15) * 100,000
    // We assume currently all AFP cases are non-polio unless confirmed as polio, for proxy we use total AFP cases.
    const afpRate = under15Pop > 0 ? ((afpCases.length / under15Pop) * 100000).toFixed(2) : "0.00";
    const measlesRate = totalPop > 0 ? ((measlesCases.length / totalPop) * 100000).toFixed(2) : "0.00";

    res.json({
      totalPopulation: totalPop,
      under15Population: under15Pop,
      afpRate,
      measlesRate,
      totalAfpCases: afpCases.length,
      totalMeaslesCases: measlesCases.length
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

surveillanceRouter.post("/cases", async (req: any, res) => {
  try {
    const parsed = insertSurveillanceCaseSchema.parse({
      ...req.body,
      tenantId: req.tenantId,
      investigatorUserId: req.user?.id,
    });
    
    const [created] = await db.insert(surveillanceCases).values(parsed).returning();
    
    // Check if this disease triggers real-time notifications
    const [config] = await db
      .select()
      .from(tenantVpdConfigurations)
      .where(
        and(
          eq(tenantVpdConfigurations.tenantId, req.tenantId),
          eq(tenantVpdConfigurations.disease, created.disease)
        )
      );
      
    if (config?.isActive && (config.notifyRoles as any[])?.length > 0) {
      // Dispatch omnichannel alerts via UCE
      const messageBody = `VPD ALERT: New suspected ${created.disease.toUpperCase()} case reported at Facility ID ${created.facilityId}. Patient: ${created.patientName}. Date of Onset: ${created.dateOfOnset.toISOString().split('T')[0]}.`;
      
      // Dispatch immediately to the UCE pipeline in the background
      // dispatchNotification({
      //   tenantId: req.tenantId,
      //   recipientId: "broadcaster",
      //   messageType: "vpd_alert",
      //   templateName: "vpd_alert",
      //   templateData: {
      //     roles: config.notifyRoles as string[],
      //     message: messageBody,
      //     facilityId: created.facilityId
      //   }
      // }).catch(err => {
      //   console.error("Failed to dispatch VPD alert via UCE:", err);
      // });
    }

    res.json(created);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

surveillanceRouter.patch("/cases/:id", async (req: any, res) => {
  try {
    const [updated] = await db
      .update(surveillanceCases)
      .set({ ...req.body, updatedAt: new Date() })
      .where(
        and(
          eq(surveillanceCases.id, req.params.id),
          eq(surveillanceCases.tenantId, req.tenantId)
        )
      )
      .returning();
      
    if (!updated) {
      return res.status(404).json({ message: "Case not found" });
    }
    
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

surveillanceRouter.delete("/cases/:id", async (req: any, res) => {
  try {
    const [deleted] = await db
      .delete(surveillanceCases)
      .where(
        and(
          eq(surveillanceCases.id, req.params.id),
          eq(surveillanceCases.tenantId, req.tenantId)
        )
      )
      .returning();
      
    if (!deleted) {
      return res.status(404).json({ message: "Case not found" });
    }
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================================
// LAB SAMPLES
// ============================================================================

surveillanceRouter.get("/cases/:caseId/samples", async (req: any, res) => {
  try {
    const [parentCase] = await db
      .select({ id: surveillanceCases.id })
      .from(surveillanceCases)
      .where(and(eq(surveillanceCases.id, req.params.caseId), eq(surveillanceCases.tenantId, req.tenantId)));
    if (!parentCase) return res.status(404).json({ message: "Case not found or access denied" });
    const samples = await db
      .select()
      .from(labSamples)
      .where(eq(labSamples.caseId, req.params.caseId));
    res.json(samples);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

surveillanceRouter.post("/cases/:caseId/samples", async (req: any, res) => {
  try {
    const [parentCase] = await db
      .select({ id: surveillanceCases.id })
      .from(surveillanceCases)
      .where(and(eq(surveillanceCases.id, req.params.caseId), eq(surveillanceCases.tenantId, req.tenantId)));
    if (!parentCase) return res.status(404).json({ message: "Case not found or access denied" });
    const parsed = insertLabSampleSchema.parse({
      ...req.body,
      caseId: req.params.caseId,
    });
    const [created] = await db.insert(labSamples).values(parsed).returning();
    res.json(created);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

surveillanceRouter.patch("/samples/:id", async (req: any, res) => {
  try {
    const [existing] = await db
      .select({ id: labSamples.id })
      .from(labSamples)
      .innerJoin(surveillanceCases, eq(labSamples.caseId, surveillanceCases.id))
      .where(
        and(
          eq(labSamples.id, req.params.id),
          eq(surveillanceCases.tenantId, req.tenantId)
        )
      );
      
    if (!existing) {
      return res.status(404).json({ message: "Lab sample not found or access denied" });
    }

    const [updated] = await db
      .update(labSamples)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(labSamples.id, req.params.id))
      .returning();
      
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

surveillanceRouter.delete("/samples/:id", async (req: any, res) => {
  try {
    const [existing] = await db
      .select({ id: labSamples.id })
      .from(labSamples)
      .innerJoin(surveillanceCases, eq(labSamples.caseId, surveillanceCases.id))
      .where(
        and(
          eq(labSamples.id, req.params.id),
          eq(surveillanceCases.tenantId, req.tenantId)
        )
      );
      
    if (!existing) {
      return res.status(404).json({ message: "Lab sample not found or access denied" });
    }

    await db.delete(labSamples).where(eq(labSamples.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});
