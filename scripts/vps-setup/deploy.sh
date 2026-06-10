#!/bin/bash
# =============================================================================
# VaxPlan — VPS Deploy Script
# Run this in the VPS browser terminal after pushing to GitHub
# Usage: bash /var/www/vaxplan/scripts/vps-setup/deploy.sh
# =============================================================================
set -e

APP_DIR="/var/www/vaxplan"
LOG_FILE="/var/log/pm2/deploy.log"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   VaxPlan Deploy — $(date '+%Y-%m-%d %H:%M:%S UTC')   ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

cd "$APP_DIR"

# ── Pull latest code ──────────────────────────────────────────────────────────
echo "📥 Pulling latest from GitHub (main)..."
git fetch origin main
BEFORE=$(git rev-parse HEAD)
git reset --hard origin/main
AFTER=$(git rev-parse HEAD)

if [ "$BEFORE" = "$AFTER" ]; then
  echo "ℹ️  No new commits. Force-rebuilding anyway..."
fi
echo "✅ Code: $(git log --oneline -1)"

# ── Install dependencies (only if package.json changed) ────────────────────
if git diff --name-only "$BEFORE" "$AFTER" 2>/dev/null | grep -q "package"; then
  echo "📦 package.json changed — running npm install..."
  npm install
else
  echo "⏭️  package.json unchanged — skipping npm install"
fi

# ── Build ─────────────────────────────────────────────────────────────────────
echo ""
echo "🔨 Building (Vite + esbuild)..."
# Build only (skip db:push — run that separately if schema changed)
npx tsx script/build.ts
echo "✅ Build complete: dist/index.cjs ($(du -sh dist/index.cjs | cut -f1))"

# ── Schema push (only if drizzle files changed) ───────────────────────────────
if git diff --name-only "$BEFORE" "$AFTER" 2>/dev/null | grep -q "shared/schema\|drizzle.config\|migrations/"; then
  echo "🗄️  Schema files changed — pushing to DB..."
  printf '\n' | npx drizzle-kit push --config=drizzle.config.ts && echo "✅ Schema synced"
else
  echo "⏭️  Schema unchanged — skipping db:push"
fi

# ── Restart PM2 ───────────────────────────────────────────────────────────────
echo ""
echo "🔄 Restarting VaxPlan..."
pm2 restart vaxplan --update-env
sleep 5

# ── Health check ──────────────────────────────────────────────────────────────
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/public/tenants 2>/dev/null || echo "000")
if [ "$HTTP" = "200" ]; then
  echo "✅ Health check: HTTP $HTTP — VaxPlan is live"
else
  echo "❌ Health check failed: HTTP $HTTP"
  echo "Last 30 log lines:"
  pm2 logs vaxplan --lines 30 --nostream
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   ✅ Deploy complete!                            ║"
printf "║   Version: %-38s ║\n" "$(node -e "console.log(require('./package.json').version)" 2>/dev/null || echo "unknown")"
printf "║   Commit:  %-38s ║\n" "$(git log --oneline -1)"
echo "╚══════════════════════════════════════════════════╝"
pm2 list
