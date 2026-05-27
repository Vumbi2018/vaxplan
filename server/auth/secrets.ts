import type { TenantIdpConfig } from "@shared/schema";

export interface SecretsAdapter {
  resolve(ref: string | null | undefined): Promise<string | undefined>;
}

class EnvSecretsAdapter implements SecretsAdapter {
  async resolve(ref: string | null | undefined): Promise<string | undefined> {
    if (!ref) return undefined;
    if (ref.startsWith("env:")) return process.env[ref.slice(4)];
    return process.env[ref];
  }
}

export const secrets: SecretsAdapter = new EnvSecretsAdapter();

export async function resolveIdpSecrets(cfg: TenantIdpConfig): Promise<{
  clientSecret?: string;
  cert?: string;
}> {
  return {
    clientSecret: await secrets.resolve(cfg.clientSecretRef),
    cert: await secrets.resolve(cfg.certRef),
  };
}
