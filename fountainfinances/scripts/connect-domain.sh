#!/usr/bin/env bash
# Connects fountainfinances.com (apex) and www.fountainfinances.com to the Cloudflare Pages project.
#   CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID must be set. Safe to run repeatedly.
# Steps: Pages custom domains → DNS records (if the zone is in this account) → apex→www redirect rule.
set -uo pipefail
DOMAIN=fountainfinances.com
PROJECT=fountainfinances
TARGET=$PROJECT.pages.dev
API=https://api.cloudflare.com/client/v4
AUTH=(-H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json")
cf() { curl -sS "${AUTH[@]}" "$@"; }
errors() { jq -r '[.errors[]?.message] | join("; ")'; }
summary() { echo "$1"; [ -n "${GITHUB_STEP_SUMMARY:-}" ] && echo "$1" >> "$GITHUB_STEP_SUMMARY"; }

summary "### Custom domain: $DOMAIN"

# 1) Zone in this account?
ZONE_JSON=$(cf "$API/zones?name=$DOMAIN&account.id=$CLOUDFLARE_ACCOUNT_ID")
ZONE_ID=$(echo "$ZONE_JSON" | jq -r '.result[0].id // empty')
if [ -z "$ZONE_ID" ]; then
  if [ "$(echo "$ZONE_JSON" | jq -r .success)" != true ]; then
    summary "- Zone lookup failed: $(echo "$ZONE_JSON" | errors) (token may lack 'Zone: Read')"
  fi
  CREATE=$(cf -X POST "$API/zones" --data "{\"name\":\"$DOMAIN\",\"account\":{\"id\":\"$CLOUDFLARE_ACCOUNT_ID\"},\"type\":\"full\"}")
  ZONE_ID=$(echo "$CREATE" | jq -r '.result.id // empty')
  if [ -n "$ZONE_ID" ]; then
    summary "- Added zone $DOMAIN to Cloudflare."
  else
    summary "- Could not add the zone: $(echo "$CREATE" | errors)"
  fi
fi
if [ -n "$ZONE_ID" ]; then
  Z=$(cf "$API/zones/$ZONE_ID")
  summary "- Zone status: **$(echo "$Z" | jq -r .result.status)**"
  summary "- Nameservers to set at the registrar: **$(echo "$Z" | jq -r '.result.name_servers | join(", ")')**"
fi

# 2) Pages custom domains
for host in "www.$DOMAIN" "$DOMAIN"; do
  R=$(cf -X POST "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROJECT/domains" --data "{\"name\":\"$host\"}")
  if [ "$(echo "$R" | jq -r .success)" = true ]; then
    summary "- Pages domain $host added."
  else
    summary "- Pages domain $host: $(echo "$R" | errors)"
  fi
done

# 3) DNS records (proxied CNAMEs; apex uses CNAME flattening)
if [ -n "$ZONE_ID" ]; then
  for host in "www.$DOMAIN" "$DOMAIN"; do
    EXIST=$(cf "$API/zones/$ZONE_ID/dns_records?name=$host")
    ID=$(echo "$EXIST" | jq -r '.result[0].id // empty')
    TYPE=$(echo "$EXIST" | jq -r '.result[0].type // empty')
    CONTENT=$(echo "$EXIST" | jq -r '.result[0].content // empty')
    if [ -z "$ID" ]; then
      R=$(cf -X POST "$API/zones/$ZONE_ID/dns_records" --data "{\"type\":\"CNAME\",\"name\":\"$host\",\"content\":\"$TARGET\",\"proxied\":true,\"ttl\":1}")
      [ "$(echo "$R" | jq -r .success)" = true ] && summary "- DNS: CNAME $host → $TARGET created." || summary "- DNS $host: $(echo "$R" | errors)"
    elif [ "$TYPE" = CNAME ] && [ "$CONTENT" = "$TARGET" ]; then
      summary "- DNS: $host already points to $TARGET."
    else
      summary "- DNS: $host already has a $TYPE record ($CONTENT); left unchanged — point it to $TARGET manually if this site should replace it."
    fi
  done

  # 4) Redirect apex → www (single redirect rule, keeps path and query)
  RULE='{"rules":[{"description":"fountainfinances.com to www","expression":"(http.host eq \"'$DOMAIN'\")","action":"redirect","action_parameters":{"from_value":{"status_code":301,"target_url":{"expression":"concat(\"https://www.'$DOMAIN'\", http.request.uri.path)"},"preserve_query_string":true}}}]}'
  R=$(cf -X PUT "$API/zones/$ZONE_ID/rulesets/phases/http_request_dynamic_redirect/entrypoint" --data "$RULE")
  [ "$(echo "$R" | jq -r .success)" = true ] && summary "- Redirect $DOMAIN → www.$DOMAIN (301) active." || summary "- Redirect rule: $(echo "$R" | errors)"
fi

# 5) Current Pages domain status
cf "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROJECT/domains" \
  | jq -r '.result[]? | "- \(.name): \(.status)\(if .verification_data.error_message then " — " + .verification_data.error_message else "" end)"' \
  | while read -r line; do summary "$line"; done
exit 0
