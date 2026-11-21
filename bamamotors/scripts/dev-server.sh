#!/usr/bin/env bash
# Builds and (re)starts the production worker locally on :8788 with local D1/R2.
#   scripts/dev-server.sh [--fresh]   (--fresh wipes local data and re-applies migrations)
set -euo pipefail
cd "$(dirname "$0")/.."
export WRANGLER_SEND_METRICS=false
LOG="${DEV_LOG:-/tmp/bamamotors-wrangler.log}"
pkill -f "wrangler[ ]dev --port 8788" 2>/dev/null || true
if [[ "${1:-}" == "--fresh" ]]; then rm -rf .wrangler/state; fi
[[ -f .dev.vars ]] || cp .dev.vars.example .dev.vars
npx astro build >/dev/null
npx wrangler d1 migrations apply bamamotors-db --local >/dev/null
nohup npx wrangler dev --port 8788 --ip 127.0.0.1 >"$LOG" 2>&1 &
for i in $(seq 1 60); do
  if curl -fsS -o /dev/null http://127.0.0.1:8788/robots.txt 2>/dev/null || curl -fsS -o /dev/null http://127.0.0.1:8788/ 2>/dev/null; then
    echo "BamaMotors running at http://127.0.0.1:8788 (log: $LOG)"; exit 0
  fi
  sleep 1
done
echo "Server did not start; see $LOG" >&2; tail -40 "$LOG" >&2; exit 1
