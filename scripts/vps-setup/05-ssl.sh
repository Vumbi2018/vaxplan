#!/bin/bash
# =============================================================================
# VaxPlan VPS Setup — Phase 5: SSL Certificate
# Run ONLY after DNS has propagated (vaxplan.org → 72.60.233.213)
# Check propagation first: https://dnschecker.org/#A/vaxplan.org
# =============================================================================
set -e

echo "🔒 Obtaining SSL certificate from Let's Encrypt..."
certbot --nginx \
  -d vaxplan.org \
  -d www.vaxplan.org \
  --non-interactive \
  --agree-tos \
  -m lawrencemukombo2@gmail.com \
  --redirect

echo ""
echo "🔄 Testing auto-renewal..."
certbot renew --dry-run

echo ""
echo "✅ SSL configured! VaxPlan is now available at https://vaxplan.org"
echo ""
echo "📋 Final nginx status:"
systemctl status nginx --no-pager
echo ""
echo "📋 PM2 status:"
pm2 list
