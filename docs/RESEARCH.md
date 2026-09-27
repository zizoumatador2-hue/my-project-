# Competitive research → design decisions

Researched how escrow-based digital-asset marketplaces (domain escrow services, game-account marketplaces,
freelance platforms with escrow) handle verification, escrow and disputes, and what users complain about.
No visual design, copy or specific UX pattern was copied; TrustTransfer has its own identity (deep ink + vault
green + brass "seal", Readex Pro / IBM Plex Sans Arabic, RTL-native layout) and voice (precise, calm, financial).

| Observed gap / complaint | Evidence | TrustTransfer response |
|---|---|---|
| **Account reclaim after sale** is the most common fraud: seller finishes the "trade" then recovers the account through the platform's recovery flow days later | game-account marketplace safety guides (e.g. PlayerAuctions after-sale protection, Z2Market, Valorant "middleman pullback" write-ups) | Recovery email + phone changes are explicit, buyer-confirmed steps; seller proceeds sit in a configurable **reclaim-protection hold** after release; buyer can open a *reclaimed* dispute in that window which **freezes** the funds; refund decision reverses proceeds and commission |
| **Slow / opaque fund release** frustrates sellers | escrow industry articles on cash-flow pressure, BBB complaints about escrow providers | Release rules are shown up front; a visible countdown on the confirmation window; **auto-release** by cron if the buyer is silent; wallet splits *available / on hold / in escrow / frozen* with the exact next release date |
| **Weak ownership verification** | marketplaces relying on screenshots or seller statements only | one-time code on the live profile + settings and analytics screenshots + reviewer must re-type the follower count seen (±10 %) + heuristics (duplicate claims, reused screenshot hashes, age/engagement/price anomalies) + **mandatory human approval** that is blocked until checks ran |
| **Poor dispute transparency** | complaints that decisions feel arbitrary | Parties see a dispute timeline (statements, evidence, arbiter requests, decision with written reasoning). Arbiters see chat (incl. blocked attempts), step-by-step timestamped transfer log, escrow events, listing verification history and evidence, in one console |
| **Off-platform scams** (move to WhatsApp/Telegram, pay by PayPal/crypto) | general marketplace scam guidance | Server-side detection of phones (incl. Arabic-Indic digits and spelled-out numbers), emails (incl. "at/dot" obfuscation), links, messaging apps, handles, **off-platform payment words** (Arabic + English); blocked messages never reach the other party, are logged, and repeat attempts open a fraud case |
| Credentials pasted into chat and left forever | common in manual middleman trades | dedicated encrypted **one-time reveal** channel with TTL; chat warns and blocks |
| Capture timing: card authorizations expire (~7 days) | Stripe docs on placing holds | capture at checkout and hold on-platform with an internal ledger instead of relying on uncaptured holds |

Sources:
- https://www.i-payout.com/blog/what-is-marketplace-escrow-and-why-does-it-matter
- https://www.cs-cart.com/blog/marketplace-escrow/
- https://www.bbb.org/us/ca/san-francisco/profile/escrow-services/escrowcom-1116-876680/complaints
- https://www.playerauctions.com/about/safe-account-trade/
- https://support.playerauctions.com/hc/en-us/articles/4402691743257-How-does-after-sale-protection-work
- https://z2market.com/blog/how-to-verify-game-account-authenticity-before-buying-in-2026-the-ultimate-safety-guide-2
- https://wisdomganga.com/valorant-account-trading-scams/
- https://docs.stripe.com/payments/place-a-hold-on-a-payment-method
