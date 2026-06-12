#!/bin/bash
# =============================================================================
# VaxPlan — Safe Deploy, Schema Update & Seeding (Upsert) Script
# Run this on the Hostinger VPS to safely update data without dropping tables.
# Usage: bash /var/www/vaxplan/scripts/vps-setup/deploy-and-upsert.sh
# =============================================================================
set -e

APP_DIR="/var/www/vaxplan"
DOCS_DIR="/var/www/doc.vaxplan.org"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   VaxPlan Safe Deploy & Seeding (Upsert)         ║"
echo "║   Time: $(date '+%Y-%m-%d %H:%M:%S UTC')         ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

cd "$APP_DIR"

# Load env variables from .env file
if [ -f ".env" ]; then
  echo "⚙️  Loading environment configuration..."
  DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2-)
else
  echo "❌ Error: .env file not found at $APP_DIR/.env"
  exit 1
fi

# ── 0. Database Backup ──────────────────────────────────────────────────────────
echo ""
echo "🗄️  0. Backing up production database..."
mkdir -p backups
BACKUP_FILE="backups/backup_$(date +%Y%m%d_%H%M%S).sql"
pg_dump "$DATABASE_URL" -f "$BACKUP_FILE"
echo "✅ Database backup saved to: $BACKUP_FILE"

# ── 1. Pull latest code ──────────────────────────────────────────────────────────
echo ""
echo "📥 1. Pulling latest from GitHub (fix-line-endings)..."
git fetch origin
git reset --hard origin/fix-line-endings
echo "✅ Code updated to: $(git log --oneline -1)"

# ── 2. Install dependencies & build ──────────────────────────────────────────────
echo ""
echo "📦 2. Installing dependencies..."
npm install --production=false

echo "🔨 Building application..."
npx tsx script/build.ts
echo "✅ Build completed"

# ── 3. Database Schema Push (Safe) ──────────────────────────────────────────────
echo ""
echo "🗄️  3. Applying schema updates safely (without dropping tables)..."
node --env-file=.env scripts/migrate.js
echo "✅ Schema synced"

# ── 4. Upsert/Seed Development Records ──────────────────────────────────────────
echo ""
echo "🌱 4. Seeding & upserting development data (idempotent)..."

echo "👥 Upserting demo users & operational records..."
npx tsx --env-file=.env server/migrations/006-seed-demo-operational.ts

echo "🇿🇲 Upserting Zambia demo accounts..."
npx tsx --env-file=.env scripts/seed-zambia-demo-accounts.ts

echo "✅ Seeding complete."

# ── 5. Upload Docs Site ──────────────────────────────────────────────────────────
echo ""
echo "📄 5. Uploading documentation to doc.vaxplan.org..."
sudo mkdir -p "$DOCS_DIR"
sudo cp -r docs-site/* "$DOCS_DIR"/
sudo chown -R www-data:www-data "$DOCS_DIR"
sudo chmod -R 755 "$DOCS_DIR"
echo "✅ Documentation site updated"

# ── 6. Restart server ────────────────────────────────────────────────────────────
echo ""
echo "🔄 6. Restarting VaxPlan server under PM2..."
pm2 restart vaxplan --update-env || pm2 start dist/index.cjs --name vaxplan --update-env
sleep 5

# ── 7. Health check ──────────────────────────────────────────────────────────────
echo ""
echo "🔍 7. Running health check..."
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5005/api/public/tenants 2>/dev/null || echo "000")
if [ "$HTTP" = "200" ]; then
  echo "✅ Health check: HTTP $HTTP — VaxPlan is live and operational!"
else
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5005/api/public/tenants 2>/dev/null || echo "000")
  if [ "$HTTP" = "200" ]; then
    echo "✅ Health check: HTTP $HTTP (port 5005) — VaxPlan is live and operational!"
  else
    echo "❌ Health check failed. PM2 status:"
    pm2 status
    exit 1
  fi
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   🎉 Safe deployment and seeding complete!      ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
