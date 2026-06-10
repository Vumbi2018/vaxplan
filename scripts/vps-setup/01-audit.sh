#!/bin/bash
# =============================================================================
# VaxPlan VPS Setup — Phase 1: Audit
# Paste this entire block into the Hostinger VPS Browser Terminal
# =============================================================================
echo "====== VPS AUDIT ======"
echo ""
echo "--- Software versions ---"
node --version 2>/dev/null && echo "Node: OK" || echo "Node: NOT INSTALLED"
npm --version 2>/dev/null && echo "npm: OK" || echo "npm: NOT INSTALLED"
psql --version 2>/dev/null && echo "Postgres: OK" || echo "Postgres: NOT INSTALLED"
nginx -v 2>/dev/null && echo "Nginx: OK" || echo "Nginx: NOT INSTALLED"
pm2 --version 2>/dev/null && echo "PM2: OK" || echo "PM2: NOT INSTALLED"
certbot --version 2>/dev/null && echo "Certbot: OK" || echo "Certbot: NOT INSTALLED"
git --version 2>/dev/null && echo "Git: OK" || echo "Git: NOT INSTALLED"
echo ""
echo "--- Disk usage ---"
df -h /
du -sh /var/www/* 2>/dev/null || echo "(no /var/www dirs)"
du -sh /home/* 2>/dev/null || echo "(no /home dirs)"
echo ""
echo "--- Open ports ---"
ss -tlnp | grep -E "80 |443 |5000|5432|3000|8080" || echo "(no relevant ports open)"
echo ""
echo "--- PostgreSQL databases ---"
sudo -u postgres psql -c "\l" 2>/dev/null || echo "(postgres not running or not installed)"
echo ""
echo "--- nginx sites ---"
ls /etc/nginx/sites-enabled/ 2>/dev/null || echo "(nginx not configured)"
echo ""
echo "--- PM2 processes ---"
pm2 list 2>/dev/null || echo "(PM2 not installed)"
echo ""
echo "====== AUDIT COMPLETE ======"
