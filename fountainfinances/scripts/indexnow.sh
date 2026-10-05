#!/usr/bin/env bash
# Submits every sitemap URL to IndexNow (Bing, Yahoo, DuckDuckGo, Yandex, Seznam…) so new and
# updated pages are crawled within hours. Runs only when www.fountainfinances.com serves this build.
set -uo pipefail
KEY=2d37b51220901b323a44e71fca9ace63
HOST=www.fountainfinances.com
if ! curl -fsS -m 20 "https://$HOST/$KEY.txt" | grep -q "$KEY"; then
  echo "::notice::$HOST does not serve this site yet (DNS not connected) — skipping IndexNow."
  exit 0
fi
URLS=$(grep -ho '<loc>[^<]*' dist/sitemap-*.xml | sed 's/<loc>//' | jq -R . | jq -s .)
BODY=$(jq -n --arg host "$HOST" --arg key "$KEY" --argjson urls "$URLS" '{host:$host,key:$key,keyLocation:("https://"+$host+"/"+$key+".txt"),urlList:$urls}')
CODE=$(curl -sS -m 30 -o /tmp/indexnow.out -w '%{http_code}' -X POST https://api.indexnow.org/indexnow -H 'content-type: application/json; charset=utf-8' --data "$BODY")
echo "IndexNow: submitted $(echo "$URLS" | jq length) URLs → HTTP $CODE $(cat /tmp/indexnow.out)"
[ -n "${GITHUB_STEP_SUMMARY:-}" ] && echo "- IndexNow: $(echo "$URLS" | jq length) URLs submitted (HTTP $CODE)" >> "$GITHUB_STEP_SUMMARY"
exit 0
