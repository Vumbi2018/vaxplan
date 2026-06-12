#!/bin/bash
# =============================================================================
# VaxPlan VPS Setup — Phase 4: PM2 + Nginx
# Paste into Hostinger VPS Browser Terminal
# =============================================================================
set -e

APP_DIR="/var/www/vaxplan"

# ── 1. Write PM2 ecosystem config ─────────────────────────────────────────────
echo "⚙️  Writing PM2 ecosystem config..."
cat > "$APP_DIR/ecosystem.config.cjs" << 'ECOEOF'
module.exports = {
  apps: [{
    name: 'vaxplan',
    script: 'dist/index.cjs',
    cwd: '/var/www/vaxplan',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '3G',
    env_file: '/var/www/vaxplan/.env',
    error_file: '/var/log/pm2/vaxplan-error.log',
    out_file: '/var/log/pm2/vaxplan-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
  }]
};
ECOEOF

mkdir -p /var/log/pm2

# ── 2. Start with PM2 ─────────────────────────────────────────────────────────
echo "🚀 Starting VaxPlan with PM2..."
cd "$APP_DIR"
pm2 delete vaxplan 2>/dev/null || true  # remove if already exists
pm2 start ecosystem.config.cjs
pm2 save

# Enable PM2 to start on boot
env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
systemctl enable pm2-root

# ── 3. Verify app is responding ───────────────────────────────────────────────
echo "⏳ Waiting 8s for app to boot..."
sleep 8
echo "🔍 Testing app on localhost:5005..."
if curl -sf http://localhost:5005/api/public/tenants > /dev/null; then
  echo "✅ App is responding on port 5005!"
else
  echo "⚠️  App not yet responding — checking logs..."
  pm2 logs vaxplan --lines 25 --nostream
  exit 1
fi

# ── 4. Write nginx config ─────────────────────────────────────────────────────
echo "⚙️  Configuring nginx..."
cat > /etc/nginx/sites-available/vaxplan << 'NGINXEOF'
server {
    listen 80;
    server_name vaxplan.org www.vaxplan.org;

    # Large uploads: TIFF population rasters up to 500 MB
    client_max_body_size 512M;

    location / {
        proxy_pass         http://127.0.0.1:5005;
        proxy_http_version 1.1;

        # WebSocket support (real-time sync channel)
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Forwarded headers so Express trust-proxy works correctly
        proxy_set_header Host               $host;
        proxy_set_header X-Real-IP          $remote_addr;
        proxy_set_header X-Forwarded-For    $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto  $scheme;

        # Extended timeouts for TIFF ingestion jobs
        proxy_read_timeout  600s;
        proxy_send_timeout  600s;
        proxy_connect_timeout 10s;

        # Disable buffering for SSE / streaming
        proxy_buffering off;
    }

    # Gzip
    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

    access_log /var/log/nginx/vaxplan.access.log;
    error_log  /var/log/nginx/vaxplan.error.log warn;
}
NGINXEOF

# Enable site, remove default
ln -sf /etc/nginx/sites-available/vaxplan /etc/nginx/sites-enabled/vaxplan
rm -f /etc/nginx/sites-enabled/default

# Test and reload nginx
nginx -t
systemctl enable --now nginx
systemctl reload nginx

echo ""
echo "🔍 Testing nginx → app proxy..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ -H "Host: vaxplan.org")
echo "HTTP status via nginx: $HTTP_STATUS"

echo ""
echo "======================================================"
echo "✅ PM2 + Nginx setup complete!"
echo ""
echo "📋 NEXT STEPS:"
echo "  1. Update DNS: point vaxplan.org A record → $(curl -s ifconfig.me)"
echo "  2. After DNS propagates, run:"
echo "     certbot --nginx -d vaxplan.org -d www.vaxplan.org"
echo "======================================================"
pm2 list
