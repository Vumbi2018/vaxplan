---
name: Free IP-geolocation providers (server-side)
description: Which free IP->location APIs actually work from the server over HTTPS
---

When resolving request IP -> coarse location (country/region/city) from the
Node server, the provider choice is a trap on free tiers:

- **ip-api.com** — HTTPS is pro-only; the free endpoint is **http://** (cleartext,
  leaks the IP in transit). Server-side `https://ip-api.com/...` returns 403.
- **ipwho.is** — `https://ipwho.is/{ip}` works from a browser but returns
  **403 `{"success":false,"message":"CORS is not supported on the Free plan"}`**
  for server-side (non-browser-origin) requests. Looks fine in a quick `curl`
  from one path but fails inside the app.
- **ipapi.co** — `https://ipapi.co/{ip}/json/` works server-side over HTTPS on
  the free tier (set a `User-Agent`). Returns `country_name`, `region`, `city`.
  Free limits ~1000/day, 30000/month — fine with caching. This is the one in use.

**How to apply:** Keep lookups best-effort: short timeout, in-memory cache of
**successes only** (caching a failure poisons that IP for the whole TTL), and
coalesce concurrent in-flight lookups per IP into one outbound request
(fire-and-forget page-view tracking otherwise hammers the provider and trips its
rate limit -> everything resolves to "Unknown").

**Why:** Switched providers twice (ip-api HTTP -> ipwho.is -> ipapi.co) before
locations resolved; the failures were silent ("Unknown") because the lookup
swallows errors by design. Verify a provider with a **server-side** fetch in the
actual Node runtime, not just curl or the browser.
