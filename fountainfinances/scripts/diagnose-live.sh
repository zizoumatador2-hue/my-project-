#!/usr/bin/env bash
# Live-site diagnostics: DNS, what each hostname serves, crawl/index signals, form endpoints.
# Writes a Markdown report to the job summary. Never fails the job.
set -uo pipefail
PAGES=https://fountainfinances.pages.dev
HOSTS=("https://fountainfinances.com" "https://www.fountainfinances.com" "$PAGES")
out() { echo "$1"; [ -n "${GITHUB_STEP_SUMMARY:-}" ] && echo "$1" >> "$GITHUB_STEP_SUMMARY"; }

out "## Live diagnostics"
out "### DNS"
for h in fountainfinances.com www.fountainfinances.com; do
  out "- \`$h\` NS: $(dig +short NS fountainfinances.com | tr '\n' ' ') · A/CNAME: $(dig +short "$h" | tr '\n' ' ')"
done

out "### What each hostname serves"
for u in "${HOSTS[@]}"; do
  H=$(curl -sS -o /tmp/body -D - -m 20 "$u/" 2>&1)
  code=$(echo "$H" | grep -m1 -E '^HTTP' | awk '{print $2}')
  loc=$(echo "$H" | grep -i '^location:' | tr -d '\r' | cut -d' ' -f2-)
  robots=$(echo "$H" | grep -i '^x-robots-tag:' | tr -d '\r' | cut -d' ' -f2-)
  server=$(echo "$H" | grep -i '^server:' | tr -d '\r' | cut -d' ' -f2-)
  title=$(grep -o '<title>[^<]*' /tmp/body 2>/dev/null | head -1 | sed 's/<title>//')
  canon=$(grep -o '<link rel="canonical" href="[^"]*' /tmp/body 2>/dev/null | head -1 | sed 's/.*href="//')
  ours=$(grep -q 'Fountain Finances' /tmp/body 2>/dev/null && echo yes || echo NO)
  out "- \`$u\` → HTTP ${code:-error} ${loc:+→ $loc} · server: ${server:-?} · our site: **$ours** · x-robots-tag: ${robots:-none} · title: ${title:-–} · canonical: ${canon:-–}"
done

out "### Crawl signals on $PAGES"
out "- robots.txt: $(curl -s -m 15 "$PAGES/robots.txt" | tr '\n' ' ' | cut -c1-200)"
SM=$(curl -s -m 15 "$PAGES/sitemap-0.xml")
out "- sitemap-0.xml: $(echo "$SM" | grep -c '<loc>' ) URLs; first: $(echo "$SM" | grep -o '<loc>[^<]*' | head -1 | sed 's/<loc>//')"
for base in https://fountainfinances.com "$PAGES"; do
  curl -s -m 15 "$base/guides/what-is-apr/" -D /tmp/gh -o /tmp/gb
  G=$(grep -i '^x-robots-tag' /tmp/gh | tr -d '\r')
  out "- $base guide page x-robots-tag: ${G:-none} · meta robots: $(grep -o '<meta name="robots" content="[^"]*' /tmp/gb | sed 's/.*content="//')"
done

out "### AdSense"
out "- https://fountainfinances.com/ads.txt → $(curl -s -m 15 -w ' (HTTP %{http_code})' https://fountainfinances.com/ads.txt | tr '\n' ' ')"
out "- AdSense script on homepage: $(curl -s -m 15 https://fountainfinances.com/ | grep -o 'adsbygoogle.js?client=ca-pub-[0-9]*' | head -1 || echo missing)"

out "### Search engine presence"
for q in "site:fountainfinances.com" "site:fountainfinances.pages.dev"; do
  n=$(curl -s -m 20 -A 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' "https://www.bing.com/search?q=$(printf %s "$q" | jq -sRr @uri)&setlang=en-US&cc=US" | grep -o 'class="sb_count"[^<]*<[^>]*>[^<]*' | sed 's/<[^>]*>//g;s/class="sb_count"//' | head -1)
  out "- Bing \`$q\`: ${n:-no results shown}"
done

out "### Forms (validation-only requests, nothing is stored)"
for base in https://fountainfinances.com "$PAGES"; do
  for ep in subscribe contact; do
    R=$(curl -s -m 20 -o /tmp/f -w '%{http_code}' -X POST "$base/api/$ep" -H "origin: $base" -H 'accept: application/json' -H 'content-type: application/x-www-form-urlencoded' --data 'email=not-an-email&name=x&message=short')
    out "- $base/api/$ep → HTTP $R $(cut -c1-160 /tmp/f)"
  done
done
out "- www redirect: $(curl -s -m 15 -o /dev/null -w '%{http_code} → %{redirect_url}' https://www.fountainfinances.com/guides/)"
exit 0
