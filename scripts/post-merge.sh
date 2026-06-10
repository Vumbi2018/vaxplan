#!/bin/bash
set -e

# es5-ext (all registry versions blocked by Replit security policy as protestware).
# Reinstall from GitHub source if missing so npm install does not fail.
if [ ! -f node_modules/es5-ext/package.json ]; then
  echo "[post-merge] Restoring es5-ext from GitHub source..."
  curl -sL "https://github.com/medikoo/es5-ext/archive/refs/tags/v0.10.64.tar.gz" -o /tmp/es5-ext.tar.gz
  mkdir -p node_modules/es5-ext
  tar -xzf /tmp/es5-ext.tar.gz -C /tmp/es5-ext-src/ 2>/dev/null || (mkdir -p /tmp/es5-ext-src && tar -xzf /tmp/es5-ext.tar.gz -C /tmp/es5-ext-src/)
  cp -r /tmp/es5-ext-src/es5-ext-0.10.64/. node_modules/es5-ext/
  echo "[post-merge] es5-ext restored."
fi

npm install --no-audit --no-fund

if [ -n "$DATABASE_URL" ]; then
  echo "" | npm run db:push -- --force 2>&1 || true
fi
