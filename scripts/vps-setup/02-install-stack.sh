#!/bin/bash
# =============================================================================
# VaxPlan VPS Setup — Phase 2: Install Stack
# Paste into Hostinger VPS Browser Terminal
# =============================================================================
set -e

echo "📦 Updating system packages..."
apt update -y && apt upgrade -y

echo "📦 Installing Node.js 22.x..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

echo "📦 Installing build tools + git..."
apt install -y build-essential python3 git curl

echo "📦 Installing nginx..."
apt install -y nginx

echo "📦 Installing certbot..."
apt install -y certbot python3-certbot-nginx

echo "📦 Installing PM2 globally..."
npm install -g pm2

echo ""
echo "✅ Stack installed. Versions:"
node --version
npm --version
nginx -v
pm2 --version
certbot --version
git --version
echo ""
echo "🚀 Phase 2 complete!"
