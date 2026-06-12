#!/bin/bash
# ============================================================
# VaxPlan — Standard VPS Deployment Script
# Location : /var/www/vaxplan/scripts/deploy-vps.sh
# Usage    : bash scripts/deploy-vps.sh
#
# RULES:
#  - Build is done LOCALLY on Windows, committed to git.
#  - VPS NEVER runs vite/tsc/esbuild — only pulls pre-built dist/.
#  - Migrations are ADDITIVE ONLY — no DROP, no TRUNCATE, no WIPE.
#  - Existing data is NEVER overwritten.
# ============================================================

set -e

APP_DIR="/var/www/vaxplan"
BRANCH="fix-line-endings"

echo ""
echo "=================================================="
echo "       VaxPlan VPS Deployment — Starting          "
echo "=================================================="

cd "$APP_DIR"

# ─────────────────────────────────────────────────────
# STEP 1: Pull latest code + pre-built dist/ from GitHub
# ─────────────────────────────────────────────────────
echo ""
echo "[1/4] Pulling latest code from GitHub (branch: $BRANCH)..."
git fetch origin
git reset --hard origin/$BRANCH
echo "      ✓ Code updated."

# ─────────────────────────────────────────────────────
# STEP 2: Install production-only dependencies
#         (no vite, no typescript, no esbuild)
#         Fast — only ~30 runtime packages
# ─────────────────────────────────────────────────────
echo ""
echo "[2/4] Installing production dependencies..."

# Clean up any broken node_modules state before install
if [ -f "node_modules/.package-lock.json" ]; then
  # Only wipe if a previous install was interrupted (body-parser corruption)
  if [ ! -d "node_modules/express" ]; then
    echo "      Detected incomplete node_modules — cleaning up..."
    rm -rf node_modules package-lock.json
    npm cache clean --force 2>/dev/null || true
  fi
fi

npm install --omit=dev --legacy-peer-deps --no-audit --no-fund
echo "      ✓ Dependencies installed."

# ─────────────────────────────────────────────────────
# STEP 3: Run safe, additive database migrations
#         Uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
#         NEVER drops or overwrites existing data
# ─────────────────────────────────────────────────────
echo ""
echo "[3/4] Running safe database migrations..."
node -e "
  require('dotenv').config();
" 2>/dev/null || true

# Run the TypeScript migrate script using the bundled tsx in node_modules
if [ -f "node_modules/.bin/tsx" ]; then
  node_modules/.bin/tsx scripts/migrate.ts
elif [ -f "node_modules/tsx/dist/cli.mjs" ]; then
  node node_modules/tsx/dist/cli.mjs scripts/migrate.ts
else
  echo "      [INFO] tsx not available in prod deps — skipping TypeScript migration."
  echo "      [INFO] Run migrations manually if schema changes are needed:"
  echo "             node scripts/migrate.js"
fi

# Also run the CJS migration scripts (always safe — no drops)
if [ -f "scripts/run-migration-020.cjs" ]; then
  node scripts/run-migration-020.cjs && echo "      ✓ Migration 020 (cold chain) applied."
fi
if [ -f "scripts/run-migration-staff-extras.cjs" ]; then
  node scripts/run-migration-staff-extras.cjs && echo "      ✓ Migration staff-extras applied."
fi

echo "      ✓ Migrations complete."

# ─────────────────────────────────────────────────────
# STEP 4: Restart the application via PM2
# ─────────────────────────────────────────────────────
echo ""
echo "[4/4] Restarting application..."
if command -v pm2 &> /dev/null; then
  pm2 restart vaxplan || pm2 start dist/index.cjs --name vaxplan --cluster-mode
  echo ""
  pm2 list
  echo "      ✓ Application restarted."
else
  echo "      [ERROR] PM2 not found. Install it: npm install -g pm2"
  exit 1
fi

echo ""
echo "=================================================="
echo "       VaxPlan Deployment Completed! ✓            "
echo "=================================================="
echo ""
echo "  App: http://$(hostname -I | awk '{print $1}'):5000"
echo "  Logs: pm2 logs vaxplan"
echo "  Status: pm2 show vaxplan"
echo ""
