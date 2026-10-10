# REGRESSION_RISK_MATRIX

Risk levels:
- **R0**: financial loss, data loss or privacy leak, authorization bypass, or critical outage.
- **R1**: primary user journey failure.
- **R2**: important feature or serious UX regression.
- **R3**: minor behavior or presentation issue.

Change frequency comes from `git log` on each file (total commits in this repository, as of this review). The codebase is young, so most modules have 1 to 2 commits. Risk, not churn, drives priority.

Test levels: **Unit** (vitest `tests/unit`), **Integration** (vitest `tests/integration`, real local Worker), **E2E** (Playwright, mobile and desktop), **None**.

Priority is an order of work, where 1 is first.

## A. TrustTransfer (root app)

| # | Feature | Route or module | Business importance | Failure impact | Change frequency | Security | Financial | Concurrency | Current test level | Required test level | Risk | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Session, login, CSRF on mutations | `routes/auth.ts`, `lib/auth.ts` (1-2 commits) | Gate to everything | Anyone acts as anyone | Low | High | Indirect | Low | Integration (CSRF rejection, forged webhook), E2E (signup) | Integration for login failure, lockout, session revocation, logout invalidation | R0 | 2 |
| 2 | Admin authorization | `routes/admin.ts` (`requirePerm`) | Controls refunds, payouts, roles | Staff tools exposed to users | Low (2) | High | High | Low | Integration (non-admins blocked), E2E (unauthorized redirect) | Integration for every admin write endpoint, each role level | R0 | 2 |
| 3 | Escrow state machine and release | `lib/escrow.ts`, `routes/deals.ts` (2 commits each) | Core money flow | Seller paid early, buyer loses funds, or funds stuck | Low (2) | Medium | High | High (double release) | Unit (state transitions), Integration (happy path, auto-release) | Unit for every illegal transition; Integration for double-release attempt | R0 | 1 |
| 4 | Stripe checkout and webhook | `lib/payments.ts`, `routes/deals.ts` `/webhooks/stripe` | Payment intake | Paid but no deal, or deal without payment | Low (2) | High | High | High (duplicate delivery) | Unit (signature), Integration (forged rejected) | Integration for duplicate delivery producing one payment; delayed and out-of-order events; price tamper | R0 | 1 |
| 5 | Chargily checkout and webhook (DZD) | `lib/payments.ts`, `/webhooks/chargily` | Algeria payments | Wrong amount or double credit | Low (2) | High | High | High | Integration (Algeria flow), Unit (signature) | Same as #4, plus rate rounding | R0 | 1 |
| 6 | Refunds and reversals | `refundDeal`, admin refunds | Money back to buyer | Double refund, or refund after release without reversal | Low | Medium | High | High | Integration (dispute refund, reclaim reversal), Unit | Integration for refund twice, refund after partial payout | R0 | 1 |
| 7 | Wallet withdrawals and payouts | `routes/wallet.ts`, admin withdrawals | Seller cash-out | Overdraw, double payout, wrong RIP | Low (2) | High | High | High (concurrent withdraw) | Integration (RIP validation, withdrawal), E2E (small and large) | Concurrent withdrawal test (balance cannot go negative); threshold boundary | R0 | 1 |
| 8 | Maintenance cron | `scheduled()` in `worker/src/index.ts` | Auto-release and cancel | Early release or relisting a paid deal | Low (1) | Low | High | High (cron vs webhook race) | Integration (expiry and cancel path) | Race: late webhook arriving after cancel; grace period boundary | R0 | 1 |
| 9 | Dispute freeze and arbiter split | `routes/disputes.ts`, admin disputes | Buyer and seller protection | Frozen funds released, split math wrong | Low (1) | Medium | High | Medium | Integration (freeze, split), E2E (dispute, refund) | Split totals equal escrow; freeze blocks release and withdrawal | R0 | 1 |
| 10 | Listing ownership proof and evidence privacy | `routes/listings.ts`, `lib/files.ts` (1 commit) | Protects sellers and buyers | Private proof readable by others | Low (1) | High | Medium | Low | Integration (claim required), E2E (locked until claimed) | Cross-user URL access test; expired signed URL | R0 | 2 |
| 11 | Settings changed at runtime | `lib/settings.ts`, admin `PUT /admin/settings` | Fees, holds, rates | Money rules change silently or invalidly | Low (2) | High | High | Medium | E2E (settings edit with no deploy) | Validation of bad values; change does not affect deals already in progress (to decide) | R0 | 2 |
| 12 | Fraud scoring and flags | `lib/fraud.ts`, admin fraud | Stops abuse, drives holds | Wrong holds or missed fraud | Low (1) | Medium | Medium | Low | Indirect only (fraud flags appear in unit, integration and E2E runs; no direct scoring tests) | Unit: scoring thresholds, false-positive cases | R1 | 3 |
| 13 | Queue consumers and DLQ | `queue()` in `worker/src/index.ts`, `tt-dlq` | Async verification and transfer | Stuck work, lost messages | Low | Low | Medium | High | Indirect only (queued steps run in integration and E2E; retries and dead-letter are untested) | Integration with controlled retries; dead-letter after max retries | R1 | 3 |
| 14 | Chat contact-sharing filter | `routes/chat.ts`, `shared/chatFilter.ts` | Keeps payment on platform | Off-platform deals bypass escrow | Low (1) | Medium | Medium | Low | Integration (blocked), E2E (blocked) | Unit: bypass attempts (spacing, digits, words) | R2 | 4 |
| 15 | Notifications | `routes/users.ts` | Alerts for deal steps | Missed step, duplicate alert | Low | Low | Low | Low | None (no notification assertions found in any test) | Integration: correct recipient, no duplicate | R2 | 5 |
| 16 | Buyer primary journey UI | `web/src/pages/Deals.tsx`, `DealRoom.tsx`, `ListingDetail.tsx` | Main conversion path | Buyer stuck | Low | Low | Medium | Low | E2E (journey 5 and 6, both viewports) | Keep; add loading and error states | R1 | 3 |
| 17 | Admin UI screens | `web/src/pages/admin/*` (15) | Operations | Staff cannot act | Low | Medium | Medium | Low | E2E (journey 3, 4, 9) | Smoke test per screen | R2 | 5 |
| 18 | Network failure UX | `web/src/lib` retry and offline handling | Users on bad networks | Blank screen, lost input | Low | Low | Low | Low | E2E (resilience, 5 tests) | Keep | R2 | 6 |
| 19 | Mobile and RTL layout | `web/src/styles.css`, Shell | Arabic and mobile users | Overlap, unreadable | Low | Low | Low | Low | E2E viewport runs only (no visual check) | Visual regression on 3 key pages (mobile and desktop) | R2 | 6 |
| 20 | Accessibility | forms, dialogs, focus | Compliance, usability | Keyboard users blocked | Low | Low | Low | Low | None | axe checks on key journeys; focus order in forms and dialogs | R2 | 6 |
| 21 | Build and typecheck | `npm run build`, `typecheck` | Everything ships through this | Broken deploy | Medium | Low | Low | Low | CI and deploy job (typecheck, unit only); build runs in CI | Build in deploy job; integration and E2E as release gate | R1 | 2 |
| 22 | Schema and migrations | `migrations/0001`, `0002` | Data integrity | Migration breaks production data | Low (2 files) | Medium | High | Low | None (applied in local test state only) | Migration apply test on a copy; constraint tests (unique, foreign keys) | R0 | 2 |

## B. ChayStore (`chaystore/`, static site)

| # | Feature | Route or module | Business importance | Failure impact | Change frequency | Security | Financial | Concurrency | Current test level | Required test level | Risk | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 23 | Build and internal links | `astro build`, `scripts/check-links.mjs` | Site ships correctly | Broken pages or links | Medium (7 on home page) | Low | Low | Low | Build-time script (46 pages, 0 problems) and deploy gate | Keep; add test of JSON-LD presence | R2 | 6 |
| 24 | SEO metadata | `layouts/BaseLayout.astro`, sitemap, robots | Search visibility (revenue source) | Lost rankings | Medium | Low | Medium | Low | Partial (title, description, canonical, one H1 in check script) | Keep; add sitemap contents and robots test | R2 | 5 |
| 25 | Contact and affiliate pages | `contact.astro`, footer | Trust and compliance | Broken contact path | Low | Low | Medium | Low | Link check only | Smoke test on contact link | R3 | 7 |
| 26 | Visual layout | Hero, gallery, React islands | Look and feel | Layout break on mobile | Medium | Low | Low | Low | None | Visual regression on home and one guide, mobile and desktop | R3 | 7 |

## Priority order (summary)

1. R0 money flows: escrow (#3), Stripe (#4), Chargily (#5), refunds (#6), withdrawals (#7), cron (#8), disputes (#9).
2. R0 security and privacy: authentication (#1), admin authorization (#2), evidence privacy (#10), settings (#11), schema and migrations (#22), build gate (#21).
3. R1 and R2 behavior: fraud (#12), queue and DLQ (#13), buyer journey UI (#16), chat (#14), notifications (#15).
4. Presentation: accessibility (#20), visual regression (#19), admin smoke (#17), ChayStore SEO (#24), ChayStore visual (#26).

Each R0 row requires reliable automated tests before the change is considered regression-protected.
