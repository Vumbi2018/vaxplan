import { db } from "../db";
import { tenants, tenantIdpConfigs } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const PNG_TENANT_CODE = "PNG";
const REPLIT_DISPLAY_NAME = "Replit Auth (PNG)";
const REPLIT_DOMAIN = "replit.local";

export async function seedReplitIdpConfig() {
  const replId = process.env.REPL_ID;
  const issuer = process.env.ISSUER_URL ?? "https://replit.com/oidc";
  if (!replId) {
    console.log("[seed] REPL_ID not set, skipping Replit IdP seed");
    return;
  }

  const [png] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.code, PNG_TENANT_CODE));
  if (!png) {
    console.log("[seed] PNG tenant not found, skipping Replit IdP seed");
    return;
  }

  const existing = await db
    .select()
    .from(tenantIdpConfigs)
    .where(
      and(
        eq(tenantIdpConfigs.tenantId, png.id),
        eq(tenantIdpConfigs.displayName, REPLIT_DISPLAY_NAME),
      ),
    );
  if (existing.length > 0) return;

  await db.insert(tenantIdpConfigs).values({
    tenantId: png.id,
    protocol: "oidc",
    displayName: REPLIT_DISPLAY_NAME,
    emailDomain: REPLIT_DOMAIN,
    issuerUrl: issuer,
    clientId: replId,
    clientSecretRef: null,
    isActive: false,
  });
  console.log("[seed] Replit IdP config recorded for PNG tenant (inactive — informational only)");
}
