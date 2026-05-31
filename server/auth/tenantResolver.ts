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
    // a tenant other than their home tenant; both reads and writes are scoped
    // to that tenant.
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

// Tenant ids are UUIDs. The client occasionally sends a tenant *code*
// (e.g. "ZMB") in the x-tenant-id header; passing that to a uuid column makes
// Postgres throw 22P02. Guard every lookup with this so a bad header can never
// crash a request or poison the session.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const tenantContext: RequestHandler = async (req, _res, next) => {
  if (!req.isAuthenticated?.()) return next();

  const userId = (req.user as any)?.claims?.sub;

  // ─── Country isolation choke point ──────────────────────────────────────
  // Cross-country "visiting" is reserved for platform super-admins. Every other
  // account is permanently pinned to its home country: any view override (the
  // x-tenant-id header or a leftover session.viewTenantId) is ignored AND
  // cleared, so reads and writes can only ever scope to the user's home tenant.
  // We only pay the extra user lookup when an override is actually in play
  // (the common request has neither header nor viewTenantId, so this is free).
  const headerTenantRaw = req.headers["x-tenant-id"] || req.query["x-tenant-id"];
  const headerTenantId =
    typeof headerTenantRaw === "string" && UUID_RE.test(headerTenantRaw)
      ? headerTenantRaw
      : null;
  const hasOverrideIntent = !!headerTenantId || !!req.session.viewTenantId;

  let isSuperAdmin = false;
  if (hasOverrideIntent && userId) {
    try {
      const u = await storage.getUser(userId);
      isSuperAdmin = u?.isPlatformAdmin === true;
    } catch (err) {
      console.error("tenantContext super-admin check failed:", err);
    }
  }

  if (!isSuperAdmin) {
    // Non-super user (or no override): never honor a cross-country override.
    // Purge any stale viewTenantId so the user falls through to their home
    // tenant below, and ignore the header entirely.
    if (req.session.viewTenantId) delete req.session.viewTenantId;
  } else {
    // Platform super-admin: accept a well-formed UUID header as the active
    // tenant override (a tenant *code* or garbage is ignored so it can never
    // be persisted to the session or reach a uuid column).
    if (headerTenantId) {
      try {
        const t = await storage.getTenant(headerTenantId);
        if (t?.status === "active") {
          req.session.viewTenantId = t.id;
        }
      } catch (err) {
        console.error("tenantContext header tenant lookup failed:", err);
      }
    }

    // viewTenantId override: a super-admin may "visit" another active tenant.
    // Reads and writes both scope to that tenant.
    if (req.session.viewTenantId && UUID_RE.test(req.session.viewTenantId)) {
      try {
        const t = await storage.getTenant(req.session.viewTenantId);
        if (t?.status === "active") {
          req.tenantId = t.id;
          return next();
        }
        // Stale / inactive override — drop it so we fall back to home tenant.
        delete req.session.viewTenantId;
      } catch (err) {
        console.error("tenantContext viewTenantId lookup failed:", err);
        delete req.session.viewTenantId;
      }
    } else if (req.session.viewTenantId) {
      // Non-UUID value left over from an older client — purge it.
      delete req.session.viewTenantId;
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
