#!/bin/bash
# =============================================================================
# VaxPlan — Complete VPS Setup Script
# Ubuntu 24.04 LTS | KVM1 | 72.60.233.213
# Paste this entire script into the Hostinger VPS Browser Terminal
# =============================================================================
set -e

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   VaxPlan VPS Setup — Starting...            ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Firewall ───────────────────────────────────────────────────────────────────
echo "🔥 Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "✅ Firewall configured"

# ── System update ──────────────────────────────────────────────────────────────
echo "📦 Updating system..."
apt update -y && apt upgrade -y -q

# ── Node.js 22.x ──────────────────────────────────────────────────────────────
if node --version 2>/dev/null | grep -q "v22"; then
  echo "✅ Node.js 22.x already installed: $(node --version)"
else
  echo "📦 Installing Node.js 22.x..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt install -y nodejs
  echo "✅ Node.js installed: $(node --version)"
fi

# ── Build tools, git, nginx, certbot ──────────────────────────────────────────
echo "📦 Installing build tools, git, nginx, certbot..."
apt install -y build-essential python3 git nginx certbot python3-certbot-nginx -q
echo "✅ System packages installed"

# ── PM2 ───────────────────────────────────────────────────────────────────────
if pm2 --version &>/dev/null; then
  echo "✅ PM2 already installed: $(pm2 --version)"
else
  echo "📦 Installing PM2..."
  npm install -g pm2
  echo "✅ PM2 installed: $(pm2 --version)"
fi

# ── Clone or update repo ───────────────────────────────────────────────────────
echo ""
echo "📂 Setting up app directory..."
mkdir -p /var/www/vaxplan
cd /var/www/vaxplan

if [ -d ".git" ]; then
  echo "📂 Repo exists — pulling latest main branch..."
  git pull origin main
else
  echo "📂 Cloning https://github.com/Vumbi2018/vaxplan ..."
  git clone https://github.com/Vumbi2018/vaxplan.git .
fi
echo "✅ Code ready ($(git rev-parse --short HEAD))"

# ── Environment variables ──────────────────────────────────────────────────────
echo "⚙️  Writing .env..."
cat > /var/www/vaxplan/.env << 'ENVEOF'
NODE_ENV=production
PORT=5000
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
echo "✅ .env written"

# ── Install dependencies ───────────────────────────────────────────────────────
echo ""
echo "📦 Installing npm dependencies (this takes 1-2 min)..."
npm install
echo "✅ Dependencies installed"

# ── Build ─────────────────────────────────────────────────────────────────────
echo ""
echo "🔨 Building VaxPlan for production (this takes 2-3 min)..."
npm run build
echo "✅ Build complete"

# Verify build output
if [ ! -f "dist/index.cjs" ]; then
  echo "❌ ERROR: dist/index.cjs not found after build!"
  echo "Build output:"
  ls -la dist/ 2>/dev/null || echo "(no dist directory)"
  exit 1
fi
echo "✅ dist/index.cjs exists ($(du -sh dist/index.cjs | cut -f1))"

# ── PM2 ecosystem config ───────────────────────────────────────────────────────
echo ""
echo "⚙️  Configuring PM2..."
mkdir -p /var/log/pm2

cat > /var/www/vaxplan/ecosystem.config.cjs << 'ECOEOF'
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

# Stop existing instance if any
pm2 delete vaxplan 2>/dev/null || true

# Start
pm2 start ecosystem.config.cjs
pm2 save

# Boot startup
env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root | tail -1 | bash 2>/dev/null || true
systemctl enable pm2-root 2>/dev/null || true

echo "✅ PM2 started"

# ── Verify app is running ──────────────────────────────────────────────────────
echo "⏳ Waiting 10s for app to boot..."
sleep 10

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/public/tenants 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ App is responding — HTTP $HTTP_CODE"
else
  echo "⚠️  App returned HTTP $HTTP_CODE — checking logs..."
  pm2 logs vaxplan --lines 30 --nostream
  echo ""
  echo "Continuing with nginx setup anyway..."
fi

# ── Nginx ─────────────────────────────────────────────────────────────────────
echo ""
echo "⚙️  Configuring nginx..."
cat > /etc/nginx/sites-available/vaxplan << 'NGINXEOF'
server {
    listen 80;
    server_name vaxplan.org www.vaxplan.org _;

    client_max_body_size 512M;

    location / {
        proxy_pass         http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host               $host;
        proxy_set_header   X-Real-IP          $remote_addr;
        proxy_set_header   X-Forwarded-For    $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto  $scheme;
        proxy_read_timeout  600s;
        proxy_send_timeout  600s;
        proxy_buffering     off;
    }

    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript image/svg+xml;

    access_log /var/log/nginx/vaxplan.access.log;
    error_log  /var/log/nginx/vaxplan.error.log warn;
}
NGINXEOF

ln -sf /etc/nginx/sites-available/vaxplan /etc/nginx/sites-enabled/vaxplan
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl restart nginx
echo "✅ Nginx configured and running"

# ── Final test ─────────────────────────────────────────────────────────────────
echo ""
VPS_IP=$(curl -s ifconfig.me 2>/dev/null || echo "72.60.233.213")
HTTP_NGINX=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ -H "Host: vaxplan.org" 2>/dev/null || echo "000")

echo "╔══════════════════════════════════════════════════════╗"
echo "║   ✅  VaxPlan VPS Setup Complete!                    ║"
echo "╠══════════════════════════════════════════════════════╣"
printf "║   VPS IP    : %-38s ║\n" "$VPS_IP"
printf "║   App HTTP  : %-38s ║\n" "HTTP $HTTP_CODE on :5000"
printf "║   Nginx     : %-38s ║\n" "HTTP $HTTP_NGINX on :80"
echo "╠══════════════════════════════════════════════════════╣"
echo "║   NEXT STEPS:                                        ║"
echo "║   1. Test:  http://72.60.233.213  in your browser   ║"
echo "║   2. DNS:   Set vaxplan.org A → 72.60.233.213       ║"
echo "║   3. Wait ~5-15 min for DNS to propagate            ║"
echo "║   4. SSL:   certbot --nginx -d vaxplan.org          ║"
echo "║             -d www.vaxplan.org                       ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
pm2 list
