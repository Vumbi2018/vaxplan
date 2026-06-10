#!/usr/bin/env bash
# ============================================================
# VaxPlan Docs Site — Deploy Script
# Deploys doc.vaxplan.org static site to the VPS
# Run on the VPS AFTER running scripts/deploy-vps.sh
# Usage:  bash scripts/deploy-docs.sh
# ============================================================
set -euo pipefail

APP_DIR="/var/www/vaxplan"
DOCS_DIR="/var/www/doc.vaxplan.org"
NGINX_CONF="/etc/nginx/sites-available/doc.vaxplan.org"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║     VaxPlan Docs Deploy — $(date +'%Y-%m-%d %H:%M')        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

cd "$APP_DIR"

# ── 1. Rebuild PDF + docs site ────────────────────────────────
echo "▶  [1/4] Rebuilding User Guide PDF …"
node scripts/build-user-guide-pdf.mjs 2>&1
echo "   ✔  PDF rebuilt"

echo ""
echo "▶  [2/4] Generating docs-site HTML …"
node docs-site/build.mjs 2>&1
# Also copy the freshly-built PDF into the docs-site folder
cp client/public/VaxPlan-User-Guide.pdf docs-site/VaxPlan-User-Guide.pdf
echo "   ✔  Docs site generated ($(du -sh docs-site/index.html | cut -f1))"

# ── 2. Sync to web root ───────────────────────────────────────
echo ""
echo "▶  [3/4] Deploying to $DOCS_DIR …"
mkdir -p "$DOCS_DIR"
rsync -a --delete docs-site/ "$DOCS_DIR/"
echo "   ✔  Files synced: $(ls $DOCS_DIR | wc -l) files in $DOCS_DIR"

# ── 3. Nginx config (first-time only) ────────────────────────
echo ""
echo "▶  [4/4] Configuring Nginx …"
if [ ! -f "$NGINX_CONF" ]; then
  cp scripts/vps-setup/doc.vaxplan.org.nginx "$NGINX_CONF"
  ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/doc.vaxplan.org
  echo "   ✔  Nginx config installed"
else
  echo "   ℹ  Nginx config already exists — skipping (edit $NGINX_CONF to change)"
fi

nginx -t && systemctl reload nginx
echo "   ✔  Nginx reloaded"

# ── SSL certificate (prompt) ──────────────────────────────────
if ! [ -d "/etc/letsencrypt/live/doc.vaxplan.org" ] && ! [ -d "/etc/letsencrypt/live/docs.vaxplan.org" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⚠️  No SSL certificate found for doc/docs.vaxplan.org"
  echo "   Make sure the DNS A-record for both doc.vaxplan.org"
  echo "   and docs.vaxplan.org point to this server's IP, then run:"
  echo ""
  echo "   certbot --nginx -d doc.vaxplan.org -d docs.vaxplan.org"
  echo ""
  echo "   Certbot will auto-fill SSL lines in the nginx config."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
  echo "   ✔  SSL certificate already present"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅  Docs site deployed at https://doc.vaxplan.org"
echo "   Built: $(date +'%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
