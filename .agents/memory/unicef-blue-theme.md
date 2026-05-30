---
name: UNICEF blue brand palette
description: The theme is keyed to UNICEF cyan; rules for keeping primary buttons AA-readable.
---

# UNICEF blue theming

The app theme (CSS custom properties in `client/src/index.css`, both `:root` and `.dark`) is keyed to **UNICEF blue = #1CABE2 ≈ hsl(197 78% 50%)**. Neutrals are cooled to hue ~200–205 so any tint reads as cyan, not generic blue.

**Rule:** `--primary` carries white text (`--primary-foreground: 0 0% 100%` in light mode), so in **light mode** primary must be dark enough for WCAG AA 4.5:1 — use **`197 80% 36%`** (≈4.73:1). The bright `#1CABE2` cyan is reserved for *text/accent on light backgrounds* (links, hero accent word, charts), never as a button fill behind white text.

**Why:** A first pass set `--primary` to `197 80% 41%` (only 3.78:1) and white-on-bright-cyan gradients (sky-400 ≈ 2.1:1), failing AA. Darkening primary to 36% and starting branded gradients at `from-primary`/`sky-700`+ fixed it.

**How to apply:** When adding branded gradients with white text (e.g. Landing brand panel, sidebar logo), keep stops at `primary`/`sky-600`+ and use literal `text-white/..` — not `text-primary-foreground/..`, because in dark mode `--primary-foreground` is dark navy and would invert to unreadable dark text over a dark gradient.
