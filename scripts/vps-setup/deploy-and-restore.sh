#!/bin/bash
# =============================================================================
# VaxPlan — Full Deploy, Database Restore & Doc Site Upload Script
# Run this on the Hostinger VPS
# Usage: bash /var/www/vaxplan/scripts/vps-setup/deploy-and-restore.sh
# =============================================================================
set -e

APP_DIR="/var/www/vaxplan"
DOCS_DIR="/var/www/doc.vaxplan.org"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   VaxPlan Full Deploy & Database Restore         ║"
echo "║   Time: $(date '+%Y-%m-%d %H:%M:%S UTC')         ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

cd "$APP_DIR"

# ── 1. Pull latest code ──────────────────────────────────────────────────────────
echo "📥 1. Pulling latest from GitHub (main)..."
git fetch origin main
git reset --hard origin/main
echo "✅ Code updated to: $(git log --oneline -1)"

# Load env variables from .env file
if [ -f ".env" ]; then
  echo "⚙️  Loading environment configuration..."
  DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2-)
else
  echo "❌ Error: .env file not found at $APP_DIR/.env"
  exit 1
fi

# ── 2. Install dependencies & build ──────────────────────────────────────────────
echo ""
echo "📦 2. Installing dependencies..."
npm install --production=false

echo "🔨 Building application..."
npx tsx script/build.ts
echo "✅ Build completed"

# ── 3. Database Restore ─────────────────────────────────────────────────────────
echo ""
echo "🗄️  3. Unzipping and restoring development database..."
if [ -f "local_dump.sql.zip" ]; then
  echo "🔓 Unzipping database archive..."
  unzip -o local_dump.sql.zip
  
  echo "📥 Importing SQL dump into production database..."
  psql "$DATABASE_URL" -f local_dump.sql
  echo "✅ Database restore completed successfully."
else
  echo "⚠️  local_dump.sql.zip not found. Skipping database restore."
fi

# ── 4. Upload Docs Site ──────────────────────────────────────────────────────────
echo ""
echo "📄 4. Uploading documentation to doc.vaxplan.org..."
sudo mkdir -p "$DOCS_DIR"
sudo cp -r docs-site/* "$DOCS_DIR"/
sudo chown -R www-data:www-data "$DOCS_DIR"
sudo chmod -R 755 "$DOCS_DIR"
echo "✅ Documentation site updated"

# ── 5. Restart server ────────────────────────────────────────────────────────────
echo ""
echo "🔄 5. Restarting VaxPlan server under PM2..."
pm2 restart vaxplan --update-env || pm2 start dist/index.cjs --name vaxplan --update-env
sleep 5

# ── 6. Health check ──────────────────────────────────────────────────────────────
echo ""
echo "🔍 6. Running health check..."
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5005/api/public/tenants 2>/dev/null || echo "000")
if [ "$HTTP" = "200" ]; then
  echo "✅ Health check: HTTP $HTTP — VaxPlan is live and operational!"
else
  # Fallback to check port 5005 if production port differs
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
echo "║   🎉 Full deployment and restore complete!       ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
