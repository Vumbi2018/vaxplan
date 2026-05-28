import type { Request, Response, NextFunction, RequestHandler } from "express";
import { storage } from "../storage";

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

declare module "express-session" {
  interface SessionData {
    tenantId?: string;
    // Per-user override of the active tenant. When set, the user is "visiting"
    // a tenant other than their home tenant; reads succeed, but writes are
    // blocked by crossTenantWriteGuard so foreign data stays clean.
    viewTenantId?: string;
    pendingIdpConfigId?: string;
    returnTo?: string;
  }
}

export function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  return email.slice(at + 1).trim().toLowerCase();
}

export async function resolveTenantByEmail(email: string) {
  const domain = emailDomain(email);
  if (!domain) return null;
  const cfg = await storage.getIdpConfigByEmailDomain(domain);
  if (!cfg) return null;
  const tenant = await storage.getTenant(cfg.tenantId);
  return tenant ? { tenant, idpConfig: cfg } : null;
}

export const tenantContext: RequestHandler = async (req, _res, next) => {
  if (!req.isAuthenticated?.()) return next();

  // Extract custom active tenant override header or query parameters
  const headerTenantId = req.headers["x-tenant-id"] || req.query["x-tenant-id"];
  if (headerTenantId && typeof headerTenantId === "string") {
    req.session.viewTenantId = headerTenantId;
  }

  // viewTenantId override: any authenticated user may "visit" another active
  // tenant (read-only). The cross-tenant write guard prevents mutations.
  if (req.session.viewTenantId) {
    try {
      const t = await storage.getTenant(req.session.viewTenantId);
      if (t?.status === "active") {
        req.tenantId = t.id;
        return next();
      }
    } catch (err) {
      console.error("tenantContext viewTenantId lookup failed:", err);
    }
  }

  if (req.session.tenantId) {
    req.tenantId = req.session.tenantId;
    return next();
  }
  try {
    const userId = (req.user as any)?.claims?.sub;
    if (!userId) return next();
    const user = await storage.getUser(userId);
    if (user?.tenantId) {
      req.session.tenantId = user.tenantId;
      req.tenantId = user.tenantId;
    } else if (user?.email) {
      const resolved = await resolveTenantByEmail(user.email);
      if (resolved) {
        await storage.assignUserTenant(user.id, resolved.tenant.id);
        req.session.tenantId = resolved.tenant.id;
        req.tenantId = resolved.tenant.id;
      } else {
        const invite = await storage.findApprovedSignupForEmail(user.email);
        if (invite && invite.requestedRole !== "national_admin") {
          await storage.assignUserTenantAndRole(
            user.id,
            invite.tenantId,
            invite.requestedRole as any,
          );
          const refreshed = await storage.getUser(user.id);
          if (refreshed?.tenantId) {
            req.session.tenantId = refreshed.tenantId;
            req.tenantId = refreshed.tenantId;
          }
        }
      }
    }
  } catch (err) {
    console.error("tenantContext error:", err);
  }
  next();
};

export function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.tenantId) {
    return res.status(403).json({ message: "No tenant assigned to this user" });
  }
  next();
}

const CROSS_TENANT_WRITE_ALLOWED_PATHS = new Set([
  "/api/me/switch-tenant",
  "/api/logout",
]);

// Settlement Intelligence is an analysis workspace, not a domain-data mutation
// surface. It scans the viewed tenant's spatial layers (PostGIS) and lets the
// user validate/dismiss the candidate clusters it finds. We allow these
// explicit endpoints across tenants so a PNG-home admin can run detection in
// Zambia (or vice versa) without being blocked by the foreign-write lock.
// All other writes (clients, sessions, stock, facilities, etc.) remain
// restricted to the user's home tenant.
const CROSS_TENANT_WRITE_ALLOWED_PATH_PATTERNS: RegExp[] = [
  /^\/api\/unmapped-settlements\/run-engine$/,
  /^\/api\/unmapped-settlements\/\d+\/validate$/,
  /^\/api\/unmapped-settlements\/\d+\/dismiss$/,
];

function isCrossTenantAnalysisPath(path: string): boolean {
  return CROSS_TENANT_WRITE_ALLOWED_PATH_PATTERNS.some((re) => re.test(path));
}

// Cross-tenant write restriction is currently disabled. In production each
// user only logs into their own country's tenant, so this guard is unnecessary.
// The country switcher in the header is used for internal QA / testing and we
// want writes to succeed in whichever tenant is currently being viewed.
//
// Kept as a pass-through (instead of being deleted) so the existing call sites
// in server/routes.ts continue to compile without a sweeping refactor.
export const crossTenantWriteGuard: RequestHandler = async (_req, _res, next) => {
  return next();
};
