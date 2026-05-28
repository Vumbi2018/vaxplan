# Email delivery setup

VaxPlan ships a single mailer module (`server/services/mailer.ts`) used by
every notification consumer (today: the weekly supervision digest; future:
approval notices, signup invites, password resets). This document describes
how to wire it up in a production tenant.

## How the mailer picks a transport

On each call, the mailer looks at environment variables — **in this order** —
and uses the first transport it finds configured:

1. **SendGrid HTTP API** — used when `SENDGRID_API_KEY` is set. No extra
   dependency required (uses `fetch`).
2. **Generic SMTP** — used when `SMTP_HOST` is set. Requires the optional
   `nodemailer` package: `npm install nodemailer`.
3. **Console fallback** — logs the message to stdout. This is the dev
   default and ensures nothing silently disappears in test environments.

## How the "from" address is resolved

Per-tenant settings win, then platform defaults:

1. `tenant.settings.email.fromAddress` (and optional `fromName`, `replyTo`)
2. `MAIL_FROM` env var (with `MAIL_FROM_NAME` / `MAIL_REPLY_TO`)
3. Legacy fallback: `SUPERVISION_DIGEST_FROM`
4. Hard-coded default: `no-reply@vaxplan.app`

To set a per-tenant sender, an operator updates the tenant's `settings`
JSON column:

```json
{
  "email": {
    "fromAddress": "no-reply@health.gov.zm",
    "fromName": "VaxPlan Zambia",
    "replyTo": "vaxplan-support@health.gov.zm"
  }
}
```

This lets each Ministry of Health send mail from their own verified domain
so recipients see a familiar sender and SPF/DKIM alignment passes.

## Environment variables (platform-level)

| Variable | Purpose |
| --- | --- |
| `SENDGRID_API_KEY` | SendGrid API key. When set, SendGrid is used. |
| `SMTP_HOST` | SMTP server hostname (e.g. `smtp.sendgrid.net`). |
| `SMTP_PORT` | SMTP port. Defaults to `587`. |
| `SMTP_SECURE` | `true` to force TLS-on-connect. Auto-detected when port is `465`. |
| `SMTP_USER` | SMTP username (optional). |
| `SMTP_PASSWORD` | SMTP password (optional, treat as secret). |
| `MAIL_FROM` | Default From: address (platform-wide). |
| `MAIL_FROM_NAME` | Default display name for the From: header. |
| `MAIL_REPLY_TO` | Default Reply-To address. |
| `APP_BASE_URL` | Used in email bodies for deep links. |

## DNS records required (per tenant sending domain)

For mail to actually land in inboxes, the domain in `fromAddress` must
authorize the provider you're using. Add the following records on the
tenant's sending domain (e.g. `health.gov.zm`).

### SPF (TXT on the apex)

Pick whichever applies, or combine includes when using multiple providers:

```
v=spf1 include:sendgrid.net ~all
v=spf1 include:_spf.your-smtp-provider.com ~all
```

You should only ever publish **one** SPF record per domain — combine
`include:` entries instead of duplicating the record.

### DKIM (provider-specific CNAMEs)

* **SendGrid** — In the SendGrid dashboard, run *Sender Authentication →
  Authenticate Your Domain*. SendGrid issues 3 `CNAME` records of the form
  `s1._domainkey.health.gov.zm → s1.domainkey.uXXXXXX.wlYYYY.sendgrid.net`.
  Publish all three; verification can take a few minutes.
* **Generic SMTP** — Follow your provider's DKIM setup. Most issue one or
  two `CNAME` or `TXT` records under `*._domainkey.health.gov.zm`.

### DMARC (TXT on `_dmarc`)

Start in monitoring mode, then tighten:

```
_dmarc.health.gov.zm. TXT "v=DMARC1; p=none; rua=mailto:dmarc-reports@health.gov.zm"
```

Once SPF + DKIM are passing for at least a week of `p=none` reports,
escalate to `p=quarantine` and eventually `p=reject`.

## Turning email on for a new tenant — checklist

1. Decide the sending domain with the tenant (e.g. `health.gov.zm`).
2. Publish SPF, DKIM, and DMARC records on that domain.
3. Verify the domain in SendGrid (or your SMTP provider's dashboard).
4. Set `SENDGRID_API_KEY` (or `SMTP_HOST` + creds) on the deployment.
5. Set `MAIL_FROM` to a sensible platform default, or skip and rely on
   per-tenant `tenant.settings.email.fromAddress`.
6. Update the tenant's `settings` JSON to include the `email` block above.
7. Trigger a dry-run of the supervision digest (set
   `SUPERVISION_DIGEST_INTERVAL_MINUTES=1` briefly, or call
   `runSupervisionDigestForTenant(tenantId, { dryRun: false })`) to confirm
   the audit log records `channel: "sendgrid"` (or `"smtp"`) instead of
   `"console"`.

## Local development

Leave all mail-related env vars unset — the mailer will log every message
to the console (prefixed `[mailer]`) so you can see what *would* have been
sent without bothering real recipients.
