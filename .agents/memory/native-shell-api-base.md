---
name: Native shell API base + credentialed CORS
description: Why packaged Capacitor/Electron shells need a remote API base, a stable custom origin, and a strict credentialed-CORS allowlist
---

# Native shells (Capacitor Android / Electron Windows) calling the API

Packaged shells serve the UI from a **local origin**, not from the API server:
- Capacitor Android: `https://localhost` (androidScheme "https")
- Electron: must use a custom **privileged + secure + corsEnabled** scheme
  (`app://local`) with `protocol.handle` over `dist/public`. `file://` gives a
  null origin (breaks credentialed CORS) and breaks absolute `/assets` paths.

Because the UI origin ≠ the API origin, every relative `/api/...` call resolves
against the *shell* origin and 404s / returns index.html (the classic
"Unexpected token '<' … not valid JSON" Android error). Fix:
- Client baked `VITE_API_BASE_URL` (the deployed/dev domain) + a fetch
  interceptor that rewrites only `/api` paths to that base AND forces
  `credentials:"include"`. Note a relative `new Request("/api/x")` is already
  resolved to `app://local/api/x` before the interceptor sees it — so the
  rewriter must also recognise the **local app origins** and re-route their
  `/api` pathname, not just bare relative strings.
- Vite `base:"./"` only for native builds (relative assets for file://-style
  custom scheme); keep `base:"/"` for web.
- Session cookie `sameSite:"none"` when secure, so it flows cross-site.

**Why:** without all four (remote base, custom secure origin, forced
credentials, SameSite=None) the packaged app either can't reach the API or
can't keep its auth cookie.

## CORS must never wildcard with credentials
`Access-Control-Allow-Credentials: true` + reflecting an arbitrary origin =
any other site on that wildcard can read this app's authenticated responses.
Use an **explicit allowlist** of the fixed native origins only
(`https://localhost`, `capacitor://localhost`, `app://local`). Do NOT wildcard
`*.replit.dev` / `*.replit.app`. Gate any `http://localhost:*` dev origin to
`NODE_ENV !== "production"`.

## Electron protocol handler path-traversal
Containment with `filePath.startsWith(root)` is bypassable via sibling
prefixes (`/root/../publicity` still startsWith `/root/public`). Use
`path.relative(root, resolved)` and reject when it is `""`, starts with `..`,
or is absolute; otherwise fall back to index.html.
