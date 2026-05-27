import type { Express, Request, Response, NextFunction } from "express";
import passport from "passport";
import { z } from "zod";
import { storage } from "../storage";
import { ensureOidcStrategy, oidcStrategyName } from "./oidcAdapter";
import { startSamlLogin, handleSamlCallback } from "./samlAdapter";
import { emailDomain, resolveTenantByEmail } from "./tenantResolver";

const discoverBody = z.object({ email: z.string().email() });

/*
// Original Code: Dynamically reads req.get("host") which is susceptible to host header spoofing
function callbackUrl(req: Request, configId: string) {
  return `${req.protocol}://${req.get("host")}/api/sso/callback/${configId}`;
}
*/

// Updated Code: Safe Callback Host Resolution using APP_URL environment variable to prevent host header spoofing
function callbackUrl(req: Request, configId: string) {
  const baseUrl = process.env.APP_URL 
    ? process.env.APP_URL.replace(/\/$/, "") 
    : `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}/api/sso/callback/${configId}`;
}


// Only accept same-origin relative paths (no scheme, no protocol-relative `//`).
function safeReturnTo(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/")) return undefined;
  if (value.startsWith("//") || value.startsWith("/\\")) return undefined;
  return value;
}

export function registerSsoRoutes(app: Express) {
  app.post("/api/sso/discover", async (req, res) => {
    const parsed = discoverBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "email is required" });
    }
    const domain = emailDomain(parsed.data.email);
    if (!domain) return res.status(400).json({ message: "Invalid email" });

    const resolved = await resolveTenantByEmail(parsed.data.email);
    if (!resolved) {
      return res
        .status(404)
        .json({ message: `No tenant configured for domain ${domain}` });
    }
    res.json({
      tenant: {
        id: resolved.tenant.id,
        name: resolved.tenant.name,
        code: resolved.tenant.code,
      },
      idpConfig: {
        id: resolved.idpConfig.id,
        protocol: resolved.idpConfig.protocol,
        displayName: resolved.idpConfig.displayName,
      },
      loginUrl: `/api/sso/login/${resolved.idpConfig.id}`,
    });
  });

  app.get(
    "/api/sso/login/:configId",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const cfg = await storage.getIdpConfig(req.params.configId);
        if (!cfg || !cfg.isActive) {
          return res.status(404).json({ message: "IdP config not found" });
        }
        const safe = safeReturnTo(req.query.returnTo);
        if (safe) req.session.returnTo = safe;
        req.session.pendingIdpConfigId = cfg.id;

        if (cfg.protocol === "oidc") {
          await ensureOidcStrategy(cfg, callbackUrl(req, cfg.id));
          return passport.authenticate(oidcStrategyName(cfg.id), {
            scope: ["openid", "email", "profile"],
          })(req, res, next);
        }
        if (cfg.protocol === "saml") {
          return startSamlLogin(cfg, req, res);
        }
        res.status(400).json({ message: `Unsupported protocol ${cfg.protocol}` });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/sso/callback/:configId",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const cfg = await storage.getIdpConfig(req.params.configId);
        if (!cfg) return res.status(404).json({ message: "IdP config not found" });

        if (cfg.protocol === "oidc") {
          await ensureOidcStrategy(cfg, callbackUrl(req, cfg.id));
          const target = safeReturnTo(req.session.returnTo) ?? "/";
          return passport.authenticate(oidcStrategyName(cfg.id), {
            successReturnToOrRedirect: target,
            failureRedirect: "/",
          })(req, res, next);
        }
        if (cfg.protocol === "saml") {
          return handleSamlCallback(cfg, req, res);
        }
        res.status(400).json({ message: `Unsupported protocol ${cfg.protocol}` });
      } catch (err) {
        next(err);
      }
    },
  );
}
