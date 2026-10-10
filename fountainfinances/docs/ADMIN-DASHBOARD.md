# Admin dashboard

A server-rendered control room for what this website actually stores: contact messages, newsletter subscribers, website health, first-party analytics and an audit log. It runs on Cloudflare Pages Functions and D1, with no client-side JavaScript. For content editing (guides, products, authors), see [ADMIN.md](ADMIN.md).

## Routes
| Route | Purpose |
|---|---|
| `/admin` | Overview: health score, key figures, sign-up chart, recent messages and admin activity |
| `/admin/messages` | Contact inbox: filter by status and date range, search, read, change status |
| `/admin/subscribers` | Newsletter list: filter, search, CSV export (logged), unsubscribe with typed confirmation |
| `/admin/analytics` | First-party figures for the selected period, 30-day charts, daily CSV export |
| `/admin/health` | Live checks for the database, sign-in, email and optional services; environment variable presence |
| `/admin/audit` | Audit log of every sensitive action: search, export |
| `/admin/settings` | Read-only configuration and masked secret status |

Every `/admin` page and form is protected by `functions/admin/_middleware.ts`, which runs on the server before any handler.

## Security model
- **Sign-in:** Cloudflare Access. Each request carries a signed JWT. `functions/_lib/access.ts` verifies the RS256 signature, issuer, audience and expiry, and fails closed.
- **Allowlist:** optional `ADMIN_EMAILS`. If set, only those emails pass, even if Access lets them in.
- **Writes:** state-changing requests must come from the same site (Origin check), because the browser sends the Access cookie automatically.
- **Secrets:** the dashboard shows whether a secret is set, never its value. The end-to-end test checks that the salt never appears in any page.
- **Audit:** status changes, unsubscribes and exports write a row with actor, target, old and new values, reason, and a hashed IP.
- **Crawlers:** `/admin` is in `robots.txt`, and every admin response sends `X-Robots-Tag: noindex` and a strict Content-Security-Policy with no scripts.

## Set up in production
1. **Create an Access application** in Cloudflare Zero Trust for `fountainfinances.com/admin*` (and `fountainfinances.pages.dev/admin*`). Use a policy that allows only the owner's email, with a one-time PIN or your identity provider.
2. **Set Pages environment variables** (Pages project → Settings → Variables):
   - `ACCESS_TEAM_DOMAIN`: your team domain, e.g. `yourteam.cloudflareaccess.com`.
   - `ACCESS_AUD`: the Application Audience (AUD) tag shown on the Access application.
   - `ADMIN_EMAILS`: the owner's email.
   These are configuration, not secrets. Secrets (`IP_HASH_SALT`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`) stay in Pages as encrypted variables.
3. **Deploy.** The deploy workflow applies `migrations/0002_admin_audit.sql` to D1 automatically.
4. **Open `/admin`** and sign in with the owner email. Check `/admin/health` until the sign-in and database checks show Working.

Until step 2 is done, `/admin` shows "Admin access is not configured" and stays closed.

## First admin
There is no admin account table. Access is the account: the owner is whoever the Access policy allows and `ADMIN_EMAILS` lists. To add an admin, add their email to both the Access policy and `ADMIN_EMAILS`.

## Testing locally
```bash
npm run build
npx wrangler d1 migrations apply fountainfinances-db --local
npx wrangler pages dev dist --port 8788 \
  --binding ACCESS_TEAM_DOMAIN=example.cloudflareaccess.com \
  --binding ACCESS_AUD=test-aud \
  --binding ACCESS_JWKS_JSON='{"keys":[...]}' \
  --binding ADMIN_EMAILS=owner@example.com \
  --binding IP_HASH_SALT=local-salt
```
`ACCESS_JWKS_JSON` lets you sign test tokens with your own key. In production, leave it unset so the key set is fetched from Cloudflare.

Unit tests: `node --test tests/unit/*.test.ts` covers signature, audience, issuer, expiry, algorithm and allowlist checks, plus CSV injection and date ranges.

## Limitations
- Customer accounts, payments, orders, subscriptions, credits, support tickets, roles beyond owner, AI replies and webhooks do not exist in this website, so they are not in the dashboard. Each needs its own data model and provider first.
- Traffic sources, devices and countries are in Cloudflare Web Analytics; the dashboard links there rather than duplicating them.
- Server errors are in Cloudflare Pages logs, not in D1.
