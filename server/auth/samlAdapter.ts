import type { Request, Response } from "express";
import type { TenantIdpConfig } from "@shared/schema";

const NOT_CONFIGURED = {
  status: 501,
  message:
    "SAML support is not yet enabled. Install `passport-saml` and wire it into server/auth/samlAdapter.ts.",
};

export async function startSamlLogin(
  _cfg: TenantIdpConfig,
  _req: Request,
  res: Response,
) {
  res.status(NOT_CONFIGURED.status).json(NOT_CONFIGURED);
}

export async function handleSamlCallback(
  _cfg: TenantIdpConfig,
  _req: Request,
  res: Response,
) {
  res.status(NOT_CONFIGURED.status).json(NOT_CONFIGURED);
}
