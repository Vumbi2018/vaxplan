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

// When a user is "visiting" a tenant other than their home tenant, allow GETs
// but block writes so foreign data can never be edited from a switched session.
export const crossTenantWriteGuard: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated?.()) return next();
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }
  if (CROSS_TENANT_WRITE_ALLOWED_PATHS.has(req.path)) return next();

  try {
    const userId = (req.user as any)?.claims?.sub;
    if (!userId) return next();
    const user = await storage.getUser(userId);
    const homeTenantId = user?.tenantId;
    if (!homeTenantId) return next();

    // Bypass cross-tenant write restriction for platform-wide national administrators 
    // to enable multi-country configuration, boundary fetching, and onboarding.
    if (user?.role === "national_admin") {
      return next();
    }

    // Self-heal: if the session's viewTenantId override has drifted to equal
    // the user's home tenant, clear it so future requests are unambiguous.
    if (req.session.viewTenantId && req.session.viewTenantId === homeTenantId) {
      delete (req.session as any).viewTenantId;
    }

    // Defensive equality: a user whose effective view tenant equals their
    // home tenant must never be blocked, regardless of where req.tenantId
    // was sourced from.
    if (req.tenantId && req.tenantId === homeTenantId) {
      return next();
    }

    if (req.tenantId && req.tenantId !== homeTenantId) {
      return res.status(403).json({
        message:
          "You're viewing another country read-only. Switch back to your own country to make changes.",
      });
    }
    return next();
  } catch (err) {
    console.error("crossTenantWriteGuard error:", err);
    return res.status(403).json({ message: "Cross-tenant write blocked" });
  }
};
