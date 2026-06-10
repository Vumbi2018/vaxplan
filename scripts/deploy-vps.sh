#!/bin/bash
# VaxPlan Hostinger VPS Deployment Script
# Run this on your VPS terminal to pull, build, migrate, and deploy.

set -e

echo "=================================================="
echo "          Starting VaxPlan VPS Deployment         "
echo "=================================================="

# 1. Pull latest code from GitHub
echo -e "\n[1/4] Pulling latest code changes..."
git pull origin main

# 2. Install dependencies
echo -e "\n[2/4] Installing dependencies..."
npm install --legacy-peer-deps --no-audit

# 3. Build project and run migrations
echo -e "\n[3/4] Building production assets & running db:push..."
npm run build

# 4. Restart or start application server
echo -e "\n[4/4] Starting application server..."
if command -v pm2 &> /dev/null
then
    echo "PM2 detected. Restarting vaxplan service..."
    pm2 restart vaxplan || pm2 start dist/index.cjs --name vaxplan
    echo "Deployment successful! Running processes:"
    pm2 list
else
    echo "PM2 is not installed. Running standard startup (blocking terminal)..."
    echo "Tip: Run 'npm install -g pm2' to run VaxPlan in the background."
    npm start
fi

echo -e "\n=================================================="
echo "         VPS Deployment Completed Successfully!    "
echo "=================================================="
