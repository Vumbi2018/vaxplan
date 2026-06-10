#!/bin/bash
# =============================================================================
# VaxPlan — Nginx Performance Optimization
# Run once in VPS terminal to maximize nginx performance
# =============================================================================
set -e

echo "⚡ Applying nginx performance optimizations..."

cat > /etc/nginx/sites-available/vaxplan << 'NGINX'
# ── Upstream ──────────────────────────────────────────────────────────────────
upstream vaxplan_backend {
    server 127.0.0.1:3001;
    keepalive 32;
}

# ── HTTP → HTTPS redirect ─────────────────────────────────────────────────────
server {
    listen 80;
    listen [::]:80;
    server_name vaxplan.org www.vaxplan.org png.vaxplan.org zmb.vaxplan.org;
    return 301 https://$host$request_uri;
}

# ── HTTPS ─────────────────────────────────────────────────────────────────────
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name vaxplan.org www.vaxplan.org png.vaxplan.org zmb.vaxplan.org;

    # SSL
    ssl_certificate     /etc/letsencrypt/live/vaxplan.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vaxplan.org/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # SSL performance
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_buffer_size     4k;

    # ── Gzip ──────────────────────────────────────────────────────────────────
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_buffers 16 8k;
    gzip_types
        text/plain text/css text/xml text/javascript
        application/json application/javascript application/xml
        application/rss+xml application/atom+xml
        image/svg+xml font/truetype font/opentype;

    # ── Client limits ──────────────────────────────────────────────────────────
    client_max_body_size 512M;
    client_body_buffer_size 128k;

    # ── Security headers ──────────────────────────────────────────────────────
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # ── Static asset caching ──────────────────────────────────────────────────
    location ~* \.(js|css|woff2?|ttf|otf|eot|ico|svg|png|jpg|jpeg|gif|webp|avif)$ {
        proxy_pass         http://vaxplan_backend;
        proxy_http_version 1.1;
        proxy_set_header   Connection "";
        proxy_set_header   Host               $host;
        proxy_set_header   X-Real-IP          $remote_addr;
        proxy_set_header   X-Forwarded-For    $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto  $scheme;
        # Cache static assets for 7 days in browser
        add_header Cache-Control "public, max-age=604800, immutable" always;
        expires 7d;
        proxy_cache_bypass 0;
    }

    # ── Main proxy ────────────────────────────────────────────────────────────
    location / {
        proxy_pass         http://vaxplan_backend;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection $connection_upgrade;
        proxy_set_header   Host               $host;
        proxy_set_header   X-Real-IP          $remote_addr;
        proxy_set_header   X-Forwarded-For    $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto  $scheme;
        proxy_read_timeout  600s;
        proxy_send_timeout  600s;
        proxy_buffering     off;
        proxy_buffer_size   16k;
    }

    access_log /var/log/nginx/vaxplan.access.log combined buffer=32k flush=5s;
    error_log  /var/log/nginx/vaxplan.error.log warn;
}
NGINX

# ── Global nginx optimizations ────────────────────────────────────────────────
cat > /etc/nginx/conf.d/performance.conf << 'PERF'
# WebSocket upgrade map
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

# Connection optimizations
keepalive_timeout    65;
keepalive_requests   1000;
send_timeout         60s;
tcp_nopush           on;
tcp_nodelay          on;
server_tokens        off;

# Proxy cache settings
proxy_connect_timeout   10s;
proxy_read_timeout      600s;
proxy_send_timeout      600s;
PERF

nginx -t && systemctl reload nginx
echo "✅ Nginx optimized and reloaded"
echo ""
echo "Optimizations applied:"
echo "  ✅ Gzip compression (level 5, all text types)"
echo "  ✅ Static asset browser caching (7 days)"
echo "  ✅ SSL session cache (10 min)"
echo "  ✅ HTTP keepalive (32 connections)"
echo "  ✅ WebSocket upgrade map"
echo "  ✅ Security headers"
echo "  ✅ PNG + ZMB tenant subdomains added to nginx"
