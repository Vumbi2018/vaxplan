import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import type { Express } from "express";
import memoize from "memoizee";
import { storage } from "../storage";
import { resolveIdpSecrets } from "./secrets";
import type { TenantIdpConfig } from "@shared/schema";

const registered = new Set<string>();

const getConfig = memoize(
  async (issuerUrl: string, clientId: string, clientSecret?: string) => {
    return await client.discovery(new URL(issuerUrl), clientId, clientSecret);
  },
  { maxAge: 3600 * 1000, normalizer: (args) => JSON.stringify(args) },
);

function strategyName(cfgId: string) {
  return `oidc:${cfgId}`;
}

export async function ensureOidcStrategy(
  cfg: TenantIdpConfig,
  callbackUrl: string,
): Promise<string> {
  const name = strategyName(cfg.id);
  if (registered.has(name)) return name;
  if (!cfg.issuerUrl || !cfg.clientId) {
    throw new Error(`OIDC config ${cfg.id} missing issuerUrl or clientId`);
  }

  const { clientSecret } = await resolveIdpSecrets(cfg);
  const oidc = await getConfig(cfg.issuerUrl, cfg.clientId, clientSecret);

  const verify: VerifyFunction = async (tokens, verified) => {
    try {
      const claims = tokens.claims() as any;
      const email = claims.email as string | undefined;
      if (!email) return verified(new Error("IdP returned no email claim"));

      await storage.upsertUser({
        id: claims.sub,
        email,
        firstName: claims.first_name ?? claims.given_name ?? null,
        lastName: claims.last_name ?? claims.family_name ?? null,
        profileImageUrl: claims.profile_image_url ?? claims.picture ?? null,
      });
      await storage.assignUserTenant(claims.sub, cfg.tenantId);

      const sessionUser: any = {
        claims,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: claims.exp,
        idpConfigId: cfg.id,
        tenantId: cfg.tenantId,
      };
      verified(null, sessionUser);
    } catch (err) {
      verified(err as Error);
    }
  };

  passport.use(
    new Strategy(
      {
        name,
        config: oidc,
        scope: "openid email profile",
        callbackURL: callbackUrl,
      },
      verify,
    ),
  );
  registered.add(name);
  return name;
}

export { strategyName as oidcStrategyName };
