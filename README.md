> **Also in this repo:** [`spicevacations/`](spicevacations/README.md) — SpiceVacations.com, an Astro + Cloudflare travel affiliate site for couples (deployed by `.github/workflows/spicevacations.yml`).

# TrustTransfer — سوق الحسابات الموثّق

A trust-first marketplace for buying and selling social-media accounts (Instagram, TikTok, Snapchat, X, Facebook,
YouTube), built Cloudflare-first with a native Arabic RTL interface.

**What makes it trust-first**
- Ownership verification before any listing goes live: one-time code on the live profile, encrypted settings +
  analytics screenshots, automated fraud heuristics, and **mandatory human approval** (blocked until the checks ran).
- **Real escrow** with an explicit state machine (`pending_payment → held → transfer_in_progress →
  buyer_confirmation_window → released`, or `→ disputed → refund | release | split | resume`), atomic transitions, and
  a **reclaim-protection hold** after release.
- A guided 6-step ownership transfer with per-step performer/confirmer, timestamps, and encrypted **one-time reveal**
  for recovery email/phone and password.
- Disputes that freeze escrow, with a full arbitration console (chat incl. blocked attempts, step log, escrow events,
  listing verification history, evidence).
- Monitored chat that blocks phones/emails/links/messaging apps/off-platform payment (Arabic + English, obfuscation-aware).
- Transparent trust scores, seller wallet with configurable auto-approval, configurable tiered commission, full
  admin/ops console and audit log.

| | |
|---|---|
| Stack | Cloudflare Workers (Hono) · D1 · KV · R2 · Queues · Cron · Turnstile · Stripe · React 19 + Vite |
| Docs | [Architecture](docs/ARCHITECTURE.md) · [Security & legal review items](docs/SECURITY.md) · [Research](docs/RESEARCH.md) · [Deploy](docs/DEPLOY.md) |
| Tests | 33 unit · 8 API lifecycle/integration (incl. cron) · 14 browser E2E × {mobile 390×844, desktop 1366×900} |

## Quick start

```bash
npm ci
cp .dev.vars.example .dev.vars   # then put a 32-byte base64 key in DATA_ENCRYPTION_KEY
npm run build
./scripts/dev-restart.sh --fresh # http://localhost:8787
```

Sign up with `admin@trusttransfer.test` (from `.dev.vars` `BOOTSTRAP_ADMIN_EMAIL`) to get the superadmin console at `/admin`.

```bash
npx vitest run        # unit + API integration (dev server must be running)
npx playwright test   # full browser flows on mobile and desktop
```

## Layout

```
shared/        domain model, escrow transitions, transfer steps, commission, chat filter (used by API + UI)
worker/src/    Hono API, escrow/crypto/files/payments/fraud/trust libs, queue consumers, cron
web/src/       React SPA (RTL): public site, seller wizard, deal room, chat, wallet, admin console
migrations/    D1 schema
tests/         unit, integration (API), e2e (Playwright)
```

> Legal notice: transferring social-media accounts may violate the platforms' terms of service, and operating escrow
> may be regulated activity. See [docs/SECURITY.md](docs/SECURITY.md) — obtain legal review before commercial launch.

---

**Also in this repository:** [`distritogamer/`](distritogamer/README.md) is a separate Astro 5 static site for distritogamer.com (gaming tips, guides and settings). It has its own `package.json`, build and CI workflow and does not touch the app above.
