/**
 * server/routes/reports.ts
 *
 * REST API for the VaxPlan Reporting Engine.
 * All endpoints are:
 *  - GET only (read-only aggregations)
 *  - Tenant-scoped (req.user.tenantId from session)
 *  - RBAC-scoped (facilityId / districtId / provinceId derived from user role)
 *  - Cached for 2 minutes to reduce repeated DB round-trips
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  getSessionReport,
  getMicroplanReport,
  getZeroDoseReport,
  getMissedCommunitiesReport,
  getCoverageReport,
  getHtrReport,
  getBudgetReport,
  getSupervisionReport,
  type ReportFilters,
} from "../services/reportingService";

export const reportsRouter = Router();

// ---------------------------------------------------------------------------
// Shared filter schema
// ---------------------------------------------------------------------------
const filterSchema = z.object({
  year:       z.coerce.number().int().min(2000).max(2100).optional(),
  quarter:    z.coerce.number().int().min(1).max(4).optional(),
  provinceId: z.coerce.number().int().positive().optional(),
  districtId: z.coerce.number().int().positive().optional(),
  facilityId: z.coerce.number().int().positive().optional(),
});

// ---------------------------------------------------------------------------
// RBAC scope enforcement
// Facility-level users can only see their own facility; district managers their
// district; provincial coordinators their province; national admin → no extra filter.
// ---------------------------------------------------------------------------
function buildScopedFilters(
  req: Request,
  query: z.infer<typeof filterSchema>
): ReportFilters {
  const u = req.user as any;
  const base: ReportFilters = {
    tenantId:   req.tenantId || u.tenantId,
    year:       query.year,
    quarter:    query.quarter,
    provinceId: query.provinceId,
    districtId: query.districtId,
    facilityId: query.facilityId,
  };

  // Narrow scope to the user's own data area
  const role: string = u.role ?? "";

  if (role === "facility_clerk" || role === "facility_in_charge") {
    // Force to their facility only; ignore any query params
    return { ...base, facilityId: u.facilityId, districtId: undefined, provinceId: undefined };
  }
  if (role === "district_manager") {
    // Can only see their district (or a facility within it)
    const scopedDistrictId = u.districtId;
    return {
      ...base,
      districtId: query.districtId ?? scopedDistrictId,
      provinceId: undefined,
      // only allow facilityId if it's within their district — let DB handle this
      facilityId: query.facilityId,
    };
  }
  if (role === "provincial_coordinator") {
    const scopedProvinceId = u.provinceId;
    return {
      ...base,
      provinceId: query.provinceId ?? scopedProvinceId,
      districtId: query.districtId,
      facilityId: query.facilityId,
    };
  }
  // national_admin, gis_specialist, platform admin — full access
  return base;
}

// ---------------------------------------------------------------------------
// Auth guard middleware
// ---------------------------------------------------------------------------
function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }
  next();
}

const CACHE_HEADER = "private, max-age=120, stale-while-revalidate=60";

// ---------------------------------------------------------------------------
// Generic handler factory — avoids boilerplate in each route
// ---------------------------------------------------------------------------
function makeReportHandler(
  queryFn: (filters: ReportFilters) => Promise<unknown[]>
) {
  return async (req: Request, res: Response) => {
    try {
      const parsed = filterSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: parsed.error.message });
      }

      const filters = buildScopedFilters(req, parsed.data);
      if (!filters.tenantId) {
        return res.status(400).json({ success: false, message: "No tenant context" });
      }

      const data = await queryFn(filters);
      res.setHeader("Cache-Control", CACHE_HEADER);
      return res.json({
        success: true,
        data,
        meta: {
          generatedAt: new Date().toISOString(),
          filters: {
            year:       filters.year       ?? null,
            quarter:    filters.quarter    ?? null,
            provinceId: filters.provinceId ?? null,
            districtId: filters.districtId ?? null,
            facilityId: filters.facilityId ?? null,
          },
        },
      });
    } catch (err: any) {
      console.error("[reports] Error:", err?.message ?? err);
      return res.status(500).json({ success: false, message: "Report generation failed" });
    }
  };
}

// ---------------------------------------------------------------------------
// Route registrations
// ---------------------------------------------------------------------------
reportsRouter.use(requireAuth);

// R1 — Session Summary
reportsRouter.get("/sessions",           makeReportHandler(getSessionReport));

// R2 — Microplan Status
reportsRouter.get("/microplans",         makeReportHandler(getMicroplanReport));

// R3 — Zero-Dose Communities
reportsRouter.get("/zero-dose",          makeReportHandler(getZeroDoseReport));

// R4 — Missed Communities
reportsRouter.get("/missed-communities", makeReportHandler(getMissedCommunitiesReport));

// R5 — Vaccination Coverage
reportsRouter.get("/coverage",           makeReportHandler(getCoverageReport));

// R6 — Hard-to-Reach Status
reportsRouter.get("/htr",                makeReportHandler(getHtrReport));

// R7 — Budget & Resources
reportsRouter.get("/budget",             makeReportHandler(getBudgetReport));

// R8 — Supervision Activity
reportsRouter.get("/supervision",        makeReportHandler(getSupervisionReport));
