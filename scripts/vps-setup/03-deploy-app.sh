#!/bin/bash
# =============================================================================
# VaxPlan VPS Setup — Phase 3: Deploy App
# Paste into Hostinger VPS Browser Terminal
# EDIT the GITHUB_TOKEN line before running if repo is private
# =============================================================================
set -e

APP_DIR="/var/www/vaxplan"
GITHUB_REPO="Vumbi2018/vaxplan"

# ── 1. Clone repo ─────────────────────────────────────────────────────────────
echo "📂 Creating app directory..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"

if [ -d ".git" ]; then
  echo "📂 Repo exists — pulling latest from main..."
  git pull origin main
else
  echo "📂 Cloning from GitHub..."
  # For PUBLIC repo:
  git clone https://github.com/$GITHUB_REPO.git .
  # For PRIVATE repo, uncomment the line below and replace YOUR_GITHUB_TOKEN:
  # git clone https://YOUR_GITHUB_TOKEN@github.com/$GITHUB_REPO.git .
fi

# ── 2. Write .env ─────────────────────────────────────────────────────────────
echo "⚙️  Writing .env..."
cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=5005
DATABASE_URL=postgresql://neondb_owner:npg_l0nhbM1RmdFw@ep-summer-math-apxu0ime-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
SESSION_SECRET=50dc33a18a6dfca1a0d66cbef43fb5d3cc8a19732825f874c14119dedacdc8ff92dd38c94e9d917df8b186cff54f8168701149941b16f08cd873954e3c617533
MESSAGING_SENDER_NUMBER=+260963328807
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=lawrencemukombo2@gmail.com
SMTP_PASS=zihy lvav rfpg itgv
SMTP_FROM=VaxPlan Notifications <lawrencemukombo2@gmail.com>
POPULATION_REFRESH_INTERVAL_HOURS=24
SESSION_ARCHIVE_ENABLED=1
STOCK_ALERT_DIGEST_ENABLED=1
SUPERVISION_DIGEST_ENABLED=1
ENVEOF

# ── 3. Install dependencies ────────────────────────────────────────────────────
echo "📦 Installing npm dependencies..."
npm install --production=false

# ── 4. Build the app ──────────────────────────────────────────────────────────
echo "🔨 Building VaxPlan..."
npm run build

# Verify the build output exists
if [ ! -f "dist/index.cjs" ]; then
  echo "❌ Build failed — dist/index.cjs not found!"
  ls -la dist/ 2>/dev/null || echo "(dist/ directory missing)"
  exit 1
fi
echo "✅ Build successful — dist/index.cjs exists"

# ── 5. Apply database schema (safe — uses IF NOT EXISTS) ──────────────────────
echo "🗄️  Applying database schema..."
npx drizzle-kit push --config=drizzle.config.ts
echo "✅ Schema applied"

echo ""
echo "🚀 Phase 3 complete! App is built and ready."
ls -lh dist/index.cjs
