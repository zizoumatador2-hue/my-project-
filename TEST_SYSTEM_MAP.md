# TEST_SYSTEM_MAP

Scope: this repository has two products. The main one is **TrustTransfer** at the repository root. **ChayStore** lives in `chaystore/` and is a static content site. This map covers both, but TrustTransfer carries the financial and security risk.

Facts below come from reading the code, the tests, and the CI files. Items marked *inferred* are conclusions from code structure, not confirmed behavior.

## 1. Product purpose

**TrustTransfer** (root): a marketplace where a seller lists an item, a buyer pays into escrow, a guided transfer moves the item or its access, the buyer confirms, and funds are released to the seller's wallet. Sellers withdraw funds. Disputes freeze escrow and an arbiter can split or refund. Payment rails include Stripe and Chargily (Algeria: Edahabia, BaridiMob/CCP). Operations staff review listings, evidence, fraud signals, payments, refunds and withdrawals.

**ChayStore** (`chaystore/`): a static Astro site of tea guides. Monetized by ads and affiliate links, with no login, database, payments or API. Its regression risk is limited to build integrity, broken links and SEO metadata.

## 2. Stack and entry points

| Area | TrustTransfer (root) | ChayStore (`chaystore/`) |
|---|---|---|
| Runtime | Cloudflare Worker (`worker/src/index.ts`) | Static build (Astro 5) |
| Front end | React + Vite (`web/`, SPA with `not_found_handling = single-page-application`) | Astro pages + a few React islands |
| API | `/api/*` routes in `worker/src/routes/` | None |
| Database | Cloudflare D1 (`DB`, migrations in `migrations/`) | None |
| Storage | R2 bucket `EVIDENCE` (encrypted uploads) | Static files in `public/` |
| Config | KV `CONFIG` (settings) | None |
| Queues | `tt-verification` and `tt-transfer` with dead-letter `tt-dlq` | None |
| Cron | `*/10 * * * *` calls `scheduled()` (maintenance) | None |
| Shared code | `shared/domain.ts`, `shared/chatFilter.ts` | None |

Worker entry points (`worker/src/index.ts`):
- `fetch`: routes, with a middleware that skips session and CSRF checks for `/api/webhooks/*` because those are authenticated by signature instead.
- `queue`: consumes verification and transfer messages.
- `scheduled`: runs maintenance, including auto-release of confirmed deals and cancellation of unpaid deals past the payment window (with a 5-minute grace period for in-flight webhooks).

## 3. Routes and modules (TrustTransfer)

- **Auth** (`routes/auth.ts`, `lib/auth.ts`): `signup`, `login`, `logout`, `me`, `password`, `csrf`, session cookie handling, `requireUser`, `requirePerm`, `can`.
- **Users and notifications** (`routes/users.ts`): profile, notifications and read-marking, file reads.
- **Listings** (`routes/listings.ts`, `lib/trust.ts`, `lib/fraud.ts`): create, edit, delete, list, seller's own listings, ownership-proof upload and file access, automated checks.
- **Chat** (`routes/chat.ts`): conversations and messages, with contact-sharing filter (`shared/chatFilter.ts`) and repeat-offender flagging.
- **Deals and escrow** (`routes/deals.ts`, `lib/escrow.ts`, `lib/payments.ts`): create checkout from a listing, Stripe and Chargily webhooks, sandbox payment, state transitions (`canTransition`, `transition`), transfer steps, one-time transfer secrets, confirmation and release, refund.
- **Disputes** (`routes/disputes.ts`): open a dispute, notes, evidence files, freeze and resolution.
- **Wallet and withdrawals** (`routes/wallet.ts`): balance, withdrawal requests, RIP validation for CCP withdrawals.
- **Admin** (`routes/admin.ts`): overview, listings review, fraud queue, deals, disputes, withdrawals, payments, refunds, users and roles, reports, audit log, settings (`PUT /admin/settings`).
- **Settings** (`lib/settings.ts`): runtime configuration in KV, including rates and holds. Changes take effect without deploy.
- **Files** (`lib/files.ts`): MIME sniffing, encrypted at rest (`putEncrypted` and `getDecrypted`), signed URLs (`signFileUrl`, `verifyFileToken`).
- **Audit** (`lib/audit.ts`): admin and money actions are recorded.
- **Rate limit and Turnstile** (`lib/ratelimit.ts`, `lib/turnstile.ts`): abuse protection on auth and public forms.

## 4. Front-end surfaces (TrustTransfer `web/src/pages/`)

Public: `Home`, `Browse`, `ListingDetail`, `Policies`, `Auth`.
Authenticated: `Sell`, `SellEditor`, `Messages`, `Deals`, `DealRoom`, `Dispute`, `Wallet`, `Account`, `Profile`, `Notifications`, `SandboxCheckout`.
Admin: `admin/*` (15 screens including `Settings`, `Withdrawals`, `LocalPayments`, `Audit`, `Fraud`, `Reviews`).

## 5. Critical user journeys

1. Signup and RTL shell (new user lands in the Arabic interface).
2. Seller creates listing with ownership proof, then submits.
3. Ops review: evidence locked until claimed; mismatch blocks approval; approval.
4. Ops edits settings with no deploy.
5. Buyer discovers, chats (contact sharing blocked), buys with a declined card, then pays.
6. Guided transfer with one-time secrets, ops verification, buyer confirmation, release.
7. Wallet: small withdrawal auto-approved; larger one needs manual approval and payout.
8. Dispute: freeze, statements and evidence, arbiter refund.
9. Admin: users and roles, reports, audit trail.
10. Algeria: Chargily Edahabia payment, BaridiMob transfer with receipt and finance verification.
11. Resilience: server errors show retryable state; offline banner; chunk load failure; slow network.
12. Unauthorized users redirected and blocked from admin.

## 6. Critical business rules (inferred from code and existing tests)

- Money in escrow is held until the buyer confirms or the confirmation window expires (auto-release by cron).
- A deal that is not paid within its window is cancelled and the listing is relisted.
- A dispute freezes escrow; only an arbiter can split or refund.
- Withdrawals above a threshold need manual approval.
- Webhook events must have valid signatures and must not create duplicate effects.
- Transfer secrets are one-time.
- Evidence and private files are readable only by the owner, claimed parties, or ops, and only through signed URLs.
- Contact sharing in chat is blocked before a deal is paid.

## 7. Security boundaries

- Session cookie plus CSRF token on every mutation, except signed webhooks.
- Role and permission checks: `requireUser`, `requirePerm`, `can`.
- Admin APIs under `/api/admin/*`.
- Webhooks: `/api/webhooks/stripe` and `/api/webhooks/chargily`, verified with `verifyStripeSignature` and `verifyChargilySignature`.
- Encrypted file storage with `DATA_ENCRYPTION_KEY`; signed file URLs with `SESSION_SECRET`.
- Turnstile on public forms; rate limits on auth.

## 8. Financial boundaries

- Stripe checkout (`createCheckout`), refunds (`refund`).
- Chargily checkout and webhook (`createChargilyCheckout`), DZD pricing at an admin-set rate (`chargilyMode`, settings).
- Escrow ledger and wallet balances. A double deduction or double release would be a direct loss.
- Withdrawals and payouts (manual and automatic thresholds).
- Refund reversals of released proceeds.
- Platform fee and hold settings editable by admins at runtime.

## 9. Data-integrity boundaries

- D1 schema from migrations `0001_init.sql` and `0002_local_payments.sql`.
- State machine for deals (`canTransition`), enforced server-side.
- Audit log for admin and money actions.
- Queue retries (max 5) with a dead-letter queue.
- Cron maintenance races with webhooks (grace period exists to mitigate this).

## 10. External dependencies

| Service | Used for | Test approach today |
|---|---|---|
| Stripe | card checkout, webhook | sandbox/test mode via `PAYMENT_PROVIDER`; webhook signature unit-tested |
| Chargily | Algeria checkout and webhook | sandbox mode; signature unit-tested |
| Cloudflare D1, KV, R2, Queues | data, settings, files, async work | local wrangler emulation (`wrangler dev --port 8787`) |
| Cloudflare Turnstile | bot protection | *not verified* (test key handling not reviewed) |
| Email provider | notifications | *not reviewed*; no email sending code was confirmed in this pass |
| Cloudflare Pages/Workers | deploy | CI deploy job (see baseline) |

## 11. Existing test coverage

| Suite | Files | Tests | What it covers |
|---|---|---|---|
| Unit (`tests/unit/core.test.ts`) | 1 | 12 `it` blocks | core domain logic, signatures, refund, escrow, evidence rules |
| Integration (`tests/integration/lifecycle.test.ts`) | 1 + client helper | 10 `it` blocks | full escrow happy path, dispute split, post-release reclaim, chat filter, cron expiry and cancel, Algeria flow, CCP RIP validation, forged webhook rejection, CSRF rejection, admin API blocking |
| E2E (`tests/e2e/*.spec.ts`) | 2 specs + helpers | 15 tests × 2 viewports (mobile Pixel 7, desktop 1366×900) = 30 runs | the 12 journeys in section 5 |

Vitest reports **45 passing** tests with the Worker running.

## 12. Untested or weakly tested high-risk areas

Confirmed by searching the test files:

- **Idempotency of webhooks.** No test named or asserting duplicate-delivery behavior for Stripe or Chargily. `duplicate` appears only in one unit test. Highest priority.
- **Suspended and deleted users.** The word "suspend" does not appear in any test. Session revocation after role change is untested.
- **Dead-letter queue and queue retries.** `dlq` is not tested.
- **Private files and cross-user access.** Evidence URLs are tested for "need a claim", but there is no explicit test that user A cannot read user B's file through a valid-looking URL.
- **Maintenance cron edge cases.** Only the basic expiry and cancel path is covered. Race between a late webhook and the cron cancel is not.
- **Refund after partial payout** and **double withdrawal** under concurrent requests. No concurrency test exists.
- **Settings change with money impact** (fee or hold changes applied mid-deal). Not tested.
- **Password reset and email verification flows.** No reset or email-verification code exists in `worker`, `shared`, or `web/src` (checked by search). Only change-password (`POST /auth/password`) exists. Signup and login are protected by Turnstile.
- **Accessibility** and **visual regression**: no tests exist.
- **Lint and formatting**: no scripts exist.
- **ChayStore**: no tests except `check:links` (build-time integrity script).

## 13. Current CI behavior

- `.github/workflows/ci.yml` (`CI`): runs on pull requests and on pushes to `main`. Steps: `npm ci`, `npm run typecheck`, `npm run build`, copy `.dev.vars.example` to `.dev.vars` with a random key, start the Worker with `scripts/dev-restart.sh --fresh`, `npx vitest run`, install Chromium, `npx playwright test`, and upload artifacts on failure.
- `.github/workflows/deploy.yml` (`Deploy`): on push to `main`, runs `npm run typecheck` and `npx vitest run tests/unit`, then builds and deploys with wrangler. It does **not** run integration tests, E2E tests, or the production build as a separate gate.
- `.github/workflows/chaystore-deploy.yml` (`ChayStore (Cloudflare Pages)`): on push to `chaystore/**` and manual dispatch. Runs `npm run build` and `npm run check:links` in `chaystore/` before deploy; a failed check stops the deploy.
- `live-check.yml`, `pexels-images.yml`, `chaystore-fal-images.yml`: operational helpers, not tests.

Important gap: **the deploy job runs only typecheck and unit tests**, and it does not wait for the `CI` workflow to pass. A regression that only the integration or E2E tests catch can reach production.
