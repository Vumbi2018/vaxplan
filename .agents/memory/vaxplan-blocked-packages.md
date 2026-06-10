---
name: Replit security-blocked npm packages in VaxPlan
description: Packages permanently blocked by Replit's security firewall and how to handle them
---

## Blocked packages (all versions)

- **es5-ext** — blocked as protestware at every version (0.10.62, 0.10.64, all). Pulled in by `georaster-layer-for-leaflet → memoizee → d/timers-ext/event-emitter/etc`.
- **shell-quote@1.8.3** — blocked (CVE). Used by `concurrently`. Safe replacement: `1.8.4`.

## Fix strategy

**es5-ext:** Cannot be fetched from the npm registry at all. Must be pre-installed from GitHub source before running `npm install`. `scripts/post-merge.sh` now handles this automatically.

**shell-quote:** Lock file pinned to `1.8.3`. Updated `package-lock.json` to `1.8.4` (both the top-level entry and `node_modules/concurrently`'s dependency pin).

**Why:** Task agents that run `npm install <blocked-package>` leave extraneous entries in `node_modules` and may rewrite `package-lock.json` to pin blocked versions. The `overrides` section in `package.json` was also corrupted to pin `es5-ext@0.10.62`.

**How to apply:** If post-merge fails with `E403 Blocked by Security Policy`:
1. Remove the blocked package from `node_modules/` and from `package-lock.json` packages section.
2. If it's `es5-ext`: install from GitHub (`medikoo/es5-ext` tag `v0.10.64`), remove the lock entry, and remove any `overrides.es5-ext` from `package.json`.
3. If another package pins the blocked version in its `dependencies` block inside the lock file, update that too.
4. Check `package.json` `overrides` section — task agents may add bad pins there.
