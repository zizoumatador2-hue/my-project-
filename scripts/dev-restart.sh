#!/usr/bin/env bash
# Restart local wrangler dev (optionally with a fresh local database). Used by tests.
set -e
cd "$(dirname "$0")/.."
pkill -f "[w]rangler dev" 2>/dev/null || true
pkill -f "[w]orkerd" 2>/dev/null || true
sleep 1
if [ "$1" = "--fresh" ]; then rm -rf .wrangler/state; fi
npx wrangler d1 migrations apply trusttransfer-db --local >/dev/null 2>&1
nohup npx wrangler dev --port 8787 --test-scheduled > "${DEV_LOG:-/tmp/wrangler.log}" 2>&1 &
for i in $(seq 1 60); do
  curl -sf localhost:8787/api/health >/dev/null && echo "ready" && exit 0
  sleep 1
done
echo "wrangler failed to start"
tail -30 "${DEV_LOG:-/tmp/wrangler.log}"
exit 1
