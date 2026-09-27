# Deploying TrustTransfer

## Already provisioned (Cloudflare account connected to this project)

| Resource | Name | ID |
|---|---|---|
| D1 | `trusttransfer-db` | `c82773a8-0135-4e60-bfbc-04a933e5be90` (schema `0001_init.sql` applied) |
| KV | `trusttransfer-config` | `89b98aa3b4be453cb0b3c48d99e0639e` |
| R2 | `trusttransfer-evidence` | — |
| Queues | `tt-verification`, `tt-transfer`, `tt-dlq` | created by the deploy workflow if missing |

## Required secrets

GitHub → Settings → Secrets and variables → Actions:

| Secret | Purpose |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Workers Scripts:Edit, D1:Edit, Queues:Edit, Workers KV:Edit, R2:Edit, Turnstile:Edit |
| `CLOUDFLARE_ACCOUNT_ID` | account id |

Worker secrets. The deploy workflow **generates `SESSION_SECRET` and `DATA_ENCRYPTION_KEY` once** (only if the worker doesn't have them yet), **creates a Turnstile widget** for the workers.dev host, and sets `APP_URL` automatically. Any value you add as a GitHub secret with the same name overrides that:

| Worker secret | How to get it |
|---|---|
| `SESSION_SECRET` | `openssl rand -base64 48` |
| `DATA_ENCRYPTION_KEY` | `openssl rand -base64 32` (**exactly 32 bytes; back it up — losing it makes evidence/secrets unreadable**) |
| `STRIPE_SECRET_KEY` | Stripe dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → endpoint `https://<your-domain>/api/webhooks/stripe`, events `checkout.session.completed`, `checkout.session.expired`, `charge.dispute.created` |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare dashboard → Turnstile → add widget for your domain |
| `BOOTSTRAP_ADMIN_EMAIL` | the first account that signs up with this email becomes `superadmin` |

Also set `APP_URL` in `wrangler.toml` `[vars]` to the production origin.

In production the Worker **refuses** to run with the sandbox payment provider and **fails closed** on Turnstile
if its secret is missing.

## Deploy

Push to `main` (or run the *Deploy* workflow manually). It runs typecheck + unit tests, builds the SPA, creates
queues if needed, applies D1 migrations, syncs secrets, and runs `wrangler deploy`.

Manual equivalent:

```bash
npm ci && npm run build
npx wrangler queues create tt-verification; npx wrangler queues create tt-transfer; npx wrangler queues create tt-dlq
npx wrangler d1 migrations apply trusttransfer-db --remote
npx wrangler secret put SESSION_SECRET   # …repeat for each secret
npx wrangler deploy
```

## Local development

```bash
npm ci
cp .dev.vars.example .dev.vars   # and generate DATA_ENCRYPTION_KEY
npm run build
./scripts/dev-restart.sh --fresh # wrangler dev on :8787 with local D1/KV/R2/Queues
npx vitest run                   # unit + API integration (needs the dev server)
npx playwright test              # browser E2E, mobile + desktop
```

Local dev uses `PAYMENT_PROVIDER=sandbox`: a stand-in checkout page that emits **signed Stripe-format webhooks**
through the exact production verification path. Turnstile is skipped only when no secret is configured *and*
`ENVIRONMENT` is not `production`.
