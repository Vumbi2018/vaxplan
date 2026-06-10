#!/usr/bin/env bash
# ============================================================
# VaxPlan VPS Deployment Script
# Usage:  bash scripts/deploy-vps.sh
# Run this on the VPS inside /var/www/vaxplan after SSH-ing in.
# ============================================================
set -euo pipefail

APP_DIR="/var/www/vaxplan"
PM2_APP="vaxplan"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║          VaxPlan VPS Deployment — $(date +'%Y-%m-%d %H:%M')     ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

cd "$APP_DIR"

# ── 1. Pull latest code ──────────────────────────────────────
echo "▶  [1/5] Pulling latest code from GitHub …"
git fetch origin main
git reset --hard origin/main
echo "   ✔  Code updated to $(git rev-parse --short HEAD)"

# ── 2. Install / update dependencies ─────────────────────────
echo ""
echo "▶  [2/5] Installing dependencies …"
npm ci --prefer-offline 2>&1 | tail -5
echo "   ✔  Dependencies ready"

# ── 3. Apply database migrations ─────────────────────────────
echo ""
echo "▶  [3/5] Applying database migrations (drizzle-kit push) …"
npm run db:push 2>&1
echo "   ✔  Database schema up to date"

# ── 4. Build production bundle ───────────────────────────────
echo ""
echo "▶  [4/5] Building production bundle …"
npm run build 2>&1 | tail -20
echo "   ✔  Build complete"

# ── 4.5 Rebuild User-Guide PDF ───────────────────────────────
echo ""
echo "▶  [4.5/5] Rebuilding User Guide PDF …"
node scripts/build-user-guide-pdf.mjs 2>&1
echo "   ✔  PDF rebuilt and placed in client/public"

# ── 5. Restart PM2 ───────────────────────────────────────────
echo ""
echo "▶  [5/5] Restarting PM2 process …"
pm2 restart "$PM2_APP" --update-env || pm2 start ecosystem.config.cjs --env production
pm2 save
echo "   ✔  PM2 process restarted"


# ── Status summary ────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pm2 status
echo ""
echo "✅  Deployment complete — $(date +'%Y-%m-%d %H:%M:%S')"
echo "   Version: $(node -e "console.log(require('./package.json').version)" 2>/dev/null || echo 'unknown')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
