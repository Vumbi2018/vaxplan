import { eq } from "drizzle-orm";
import { db } from "../db";
import { tenants, type Tenant } from "@shared/schema";

/**
 * Shared email transport for app notifications (supervision digest today,
 * approval notices / signup invites / password resets tomorrow).
 *
 * Transport precedence:
 *   1. SendGrid HTTP API   — if SENDGRID_API_KEY is set
 *   2. Generic SMTP        — if SMTP_HOST is set (uses dynamic `nodemailer`
 *                            import; the package is optional)
 *   3. Console fallback    — logs the message so dev/test environments still
 *                            see what *would* have been sent
 *
 * "From" address precedence:
 *   1. tenant.settings.email.fromAddress (per-tenant override, set by an
 *      operator in tenant settings)
 *   2. MAIL_FROM env var                  (platform default)
 *   3. "no-reply@vaxplan.app"             (last-resort default)
 *
 * Reply-to follows the same lookup against tenant.settings.email.replyTo /
 * MAIL_REPLY_TO and is omitted when neither is configured.
 */

export interface TenantEmailSettings {
  /** Verified sender address — must align with the tenant's SPF/DKIM. */
  fromAddress?: string;
  /** Friendly name for the From: header, e.g. "VaxPlan Zambia". */
  fromName?: string;
  /** Optional Reply-To address (defaults to none). */
  replyTo?: string;
}

export type MailerChannel = "console" | "smtp" | "sendgrid";

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Tenant the message is being sent on behalf of. Either `tenant` or
   *  `tenantId` should be supplied; if neither is given, platform defaults
   *  are used. */
  tenant?: Tenant;
  tenantId?: string;
  /** Optional override (rare — most callers should let the resolver decide). */
  fromOverride?: { address: string; name?: string };
}

export interface SendEmailResult {
  ok: boolean;
  channel: MailerChannel;
  detail?: string;
}

function readTenantEmailSettings(tenant: Tenant | undefined): TenantEmailSettings {
  if (!tenant) return {};
  const settings = (tenant.settings ?? {}) as Record<string, unknown>;
  const email = (settings.email ?? {}) as Record<string, unknown>;
  const out: TenantEmailSettings = {};
  if (typeof email.fromAddress === "string" && email.fromAddress.trim()) {
    out.fromAddress = email.fromAddress.trim();
  }
  if (typeof email.fromName === "string" && email.fromName.trim()) {
    out.fromName = email.fromName.trim();
  }
  if (typeof email.replyTo === "string" && email.replyTo.trim()) {
    out.replyTo = email.replyTo.trim();
  }
  return out;
}

async function loadTenant(input: SendEmailInput): Promise<Tenant | undefined> {
  if (input.tenant) return input.tenant;
  if (!input.tenantId) return undefined;
  const [row] = await db.select().from(tenants).where(eq(tenants.id, input.tenantId));
  return row ?? undefined;
}

export interface ResolvedSender {
  address: string;
  name?: string;
  replyTo?: string;
}

export function resolveSender(
  tenant: Tenant | undefined,
  override?: { address: string; name?: string },
): ResolvedSender {
  if (override?.address) {
    return { address: override.address, name: override.name };
  }
  const tenantEmail = readTenantEmailSettings(tenant);
  const address =
    tenantEmail.fromAddress ||
    process.env.MAIL_FROM ||
    process.env.SUPERVISION_DIGEST_FROM /* legacy */ ||
    "no-reply@vaxplan.app";
  const name = tenantEmail.fromName || process.env.MAIL_FROM_NAME || tenant?.name;
  const replyTo = tenantEmail.replyTo || process.env.MAIL_REPLY_TO || undefined;
  return { address, name, replyTo };
}

function formatAddress(addr: string, name?: string): string {
  if (!name) return addr;
  // Escape quotes in display name.
  const safeName = name.replace(/"/g, '\\"');
  return `"${safeName}" <${addr}>`;
}

async function sendViaSendgrid(
  input: SendEmailInput,
  sender: ResolvedSender,
): Promise<SendEmailResult> {
  const apiKey = process.env.SENDGRID_API_KEY!;
  const content: Array<{ type: string; value: string }> = [
    { type: "text/plain", value: input.text },
  ];
  if (input.html) content.push({ type: "text/html", value: input.html });
  const payload: Record<string, unknown> = {
    personalizations: [{ to: [{ email: input.to }] }],
    from: sender.name
      ? { email: sender.address, name: sender.name }
      : { email: sender.address },
    subject: input.subject,
    content,
  };
  if (sender.replyTo) payload.reply_to = { email: sender.replyTo };
  try {
    const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (resp.ok) return { ok: true, channel: "sendgrid" };
    const body = await resp.text().catch(() => "");
    return {
      ok: false,
      channel: "sendgrid",
      detail: `sendgrid http ${resp.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
    };
  } catch (err: any) {
    return { ok: false, channel: "sendgrid", detail: err?.message ?? String(err) };
  }
}

async function sendViaSmtp(
  input: SendEmailInput,
  sender: ResolvedSender,
): Promise<SendEmailResult> {
  let nodemailer: any;
  try {
    // Optional dependency — only required when SMTP_HOST is configured.
    // @ts-ignore — optional dependency, may not be installed
    const mod: any = await import("nodemailer");
    nodemailer = mod.default ?? mod;
  } catch (err: any) {
    return {
      ok: false,
      channel: "smtp",
      detail:
        "SMTP_HOST is set but the optional `nodemailer` package is not installed. " +
        "Run `npm install nodemailer` or unset SMTP_HOST to fall back to console.",
    };
  }
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure =
    typeof process.env.SMTP_SECURE === "string"
      ? process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1"
      : port === 465;
  const auth =
    process.env.SMTP_USER && process.env.SMTP_PASSWORD
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth,
  });
  try {
    await transport.sendMail({
      from: formatAddress(sender.address, sender.name),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: sender.replyTo,
    });
    return { ok: true, channel: "smtp" };
  } catch (err: any) {
    return { ok: false, channel: "smtp", detail: err?.message ?? String(err) };
  }
}

function logToConsole(input: SendEmailInput, sender: ResolvedSender): SendEmailResult {
  console.log(
    `[mailer] (console-only delivery — configure SENDGRID_API_KEY or SMTP_HOST to email)\n` +
      `  from: ${formatAddress(sender.address, sender.name)}\n` +
      (sender.replyTo ? `  reply-to: ${sender.replyTo}\n` : "") +
      `  to: ${input.to}\n` +
      `  subject: ${input.subject}\n` +
      `${input.text}\n`,
  );
  return { ok: true, channel: "console" };
}

/**
 * Send an email. Resolves the from-address from per-tenant settings (then
 * platform env, then default), picks a transport based on which provider
 * env vars are set, and returns a structured result so callers can log /
 * audit the channel used.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!input.to) {
    return { ok: false, channel: "console", detail: "no recipient address" };
  }
  const tenant = await loadTenant(input);
  const sender = resolveSender(tenant, input.fromOverride);

  if (process.env.SENDGRID_API_KEY) {
    return sendViaSendgrid(input, sender);
  }
  if (process.env.SMTP_HOST) {
    return sendViaSmtp(input, sender);
  }
  return logToConsole(input, sender);
}

/** Test-only — lets unit tests assert which channel would be used without
 *  actually contacting a provider. */
export function activeChannel(): MailerChannel {
  if (process.env.SENDGRID_API_KEY) return "sendgrid";
  if (process.env.SMTP_HOST) return "smtp";
  return "console";
}
