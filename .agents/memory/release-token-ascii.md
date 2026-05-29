---
name: release-token-ascii
description: Why the RELEASE_DOWNLOAD_TOKEN (and any token sent via HTTP header) must be ASCII-only.
---

# Release download token must be ASCII-only

The `/release/vaxplan-source-*.tar.gz` endpoint authenticates headless build
scripts via a `RELEASE_DOWNLOAD_TOKEN` sent in the `x-release-token` header (or
`?token=` query). Tokens that contain non-ASCII characters silently fail.

**Why:** HTTP header values are transported as bytes and Node parses them as
latin1, so a token with multibyte UTF-8 characters arrives with a *different*
length than `String.length` reports at the source (e.g. 34 chars / 36 bytes →
server sees 36 latin1 chars). The constant-time compare then never matches and
the request falls through to admin-session auth, returning 401 even though the
"same" token was supplied.

**How to apply:** Always generate the token as ASCII (hex via
`crypto.randomBytes(n).toString('hex')` is safest — no URL/shell/header
escaping issues). The gate `.trim()`s both sides to absorb stray
whitespace/newlines from pasting, but trimming cannot fix non-ASCII content.
If a token check "should match but returns 401", check byte length vs string
length first: `Buffer.byteLength(t,'utf8') !== t.length` means non-ASCII.
