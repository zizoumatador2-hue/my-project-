# TrustTransfer — Architecture

## Topology (Cloudflare-first)

```
Browser (React SPA, Arabic RTL)
   │  same-origin HTTPS, HttpOnly session cookie + CSRF header
   ▼
Cloudflare Worker `trusttransfer`
   ├─ Static assets (Workers Assets, SPA fallback, strict CSP via _headers)
   ├─ /api/*  Hono router ─────────────┬─► D1  `trusttransfer-db`   (all relational + ledger data)
   │                                   ├─► KV  `trusttransfer-config` (platform settings, read per request)
   │                                   ├─► R2  `trusttransfer-evidence` (AES-256-GCM encrypted evidence)
   │                                   ├─► Queue `tt-verification` (fraud heuristics, trust recompute)
   │                                   └─► Queue `tt-transfer` (deal events → chat system notes, trust)
   ├─ queue() consumer  (same Worker; DLQ `tt-dlq`)
   └─ scheduled() every 10 min: auto-release expired confirmation windows, cancel unpaid deals,
                                flag stalled transfers, destroy expired secrets/sessions
Stripe (Checkout + Refunds + signed webhooks)   Cloudflare Turnstile (siteverify)
```

| Concern | Service | Notes |
|---|---|---|
| API | Workers + Hono | single Worker also serves the SPA |
| Relational data | D1 | 20 tables, see `migrations/0001_init.sql` |
| Config / flags / commission | KV (+ versioned copy in D1 `settings_history`) | editable in admin, no deploy |
| Evidence files | R2 | encrypted by the app before upload; served only via short-lived signed URL + re-authorization |
| Background work | Queues | verification heuristics, trust recompute, deal event fan-out |
| Bot protection | Turnstile | signup, login, listing submission, first chat message, purchase, dispute filing |
| Payments | **Stripe (exception — not on Cloudflare)** | there is no Cloudflare payments product; the Worker calls Stripe's REST API with `fetch` and verifies webhooks with Web Crypto |
| Real-time chat | **Polling over D1 (documented choice)** | 4 s polling with exponential backoff, paused when the tab is hidden. Upgrade path: one Durable Object per conversation with WebSockets. Polling was chosen because it degrades gracefully on poor mobile networks and keeps every message in D1 for arbitration by construction |

## Escrow state machine

```
pending_payment ──paid (webhook)──► held ──seller starts step 1──► transfer_in_progress
      │                              │                                   │
      └─timeout/expired─► cancelled   └─seller withdraws─► refunded ◄─────┤
                                                                         │ ops approves step 6
                                                                         ▼
                                              buyer_confirmation_window ──buyer confirms / window expires──► released
                                                                         │                                    │
   any of held / transfer_in_progress / buyer_confirmation_window ──────►│ disputed ◄── buyer, during reclaim hold
                                                                         ▼
                                      refunded | released | split | (resume → previous state)
```

* Transitions are declared once in `shared/domain.ts` (`ESCROW_TRANSITIONS`) and enforced server-side.
* Every transition is an **atomic compare-and-set** on `deals.state_version`; all side effects (ledger rows,
  listing status, notifications, audit) are *guarded inserts* in the **same D1 batch transaction**, so money can
  never move without the matching state change (`worker/src/lib/escrow.ts`).
* Funds are **captured** at checkout and held in the platform's Stripe balance; our ledger records ownership.
  Uncaptured card authorizations expire after ~7 days, which is shorter than transfer + confirmation + dispute time.
* **Reclaim protection**: on release, the seller's net is credited with `available_at = now + reclaim_hold_days`.
  During that window the buyer may open a "reclaimed" dispute, which freezes the entry; a refund decision writes a
  reversal plus a commission reversal.

## Ownership transfer (6 steps)

| # | Step | Performer | Confirmer | Secret |
|---|---|---|---|---|
| 1 | Prepare account (2FA off, sessions out) | seller | — | — |
| 2 | Change recovery email | seller | buyer | buyer → seller |
| 3 | Change recovery phone | seller | buyer | buyer → seller |
| 4 | Password handover | seller | buyer | seller → buyer |
| 5 | Buyer confirms login & control | buyer | — | — |
| 6 | Ops verification | admin (`deals.transfer_verify`, never a party) | — | — |

Secrets are AES-256-GCM encrypted with a key derived (HKDF) per secret, revealable exactly once by the recipient
(the ciphertext is wiped in the same conditional UPDATE that marks it revealed), expire after `secret_ttl_hours`,
and are never logged or included in audit details.

## Trust score (0–100, transparent)

`base 50` `+ completed (≤30, log-scaled)` `+ tenure (≤5)` `− disputes lost (15 each, ≤40)` `− other disputes against (≤10)`
`− cancellations (6 each, ≤20)` `− chat violations (3 each, ≤15)` `± verification pass rate (seller)` `± responsiveness`.
Recomputed from real history by the queue after every closed deal, dispute decision, listing decision and chat violation.

## Fraud / stolen-account heuristics (never auto-publish)

Run by the verification queue on every submission; approval is **blocked until they have run** and while any open case exists:
duplicate claims by other sellers · evidence file hash reused across listings · previously sold handle · account
younger than threshold / future creation date · unrealistic or near-zero engagement · price per 1k followers
suspiciously low · new seller with high-value listing · seller history (rejections, lost disputes) · missing
evidence · best-effort public-profile code check. Reviewers must also type the follower count they see in the
analytics screenshot; >10 % deviation opens a high-severity case and refuses approval.

## Roles & permissions

`user`, `reviewer`, `arbiter`, `finance`, `admin`, `superadmin` → permission sets in `shared/domain.ts`.
Beyond roles, object-level rules apply: evidence only for the reviewer who **claimed** that listing (or the arbiter
**assigned** to a live dispute on it); parties can never verify, arbitrate or pay out their own deals/withdrawals;
elevated roles can only be granted by `superadmin`; role changes kill the user's sessions.
