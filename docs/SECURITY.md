# Security model, residual risk, and items requiring legal review

This system is built defensively, but **it is not "100 % secure"** and no claim of that kind should be made to users.

## Controls implemented

| Area | Control |
|---|---|
| Sessions | 256-bit random token in `__Host-` HttpOnly Secure SameSite=Lax cookie; only its SHA-256 is stored; 7-day expiry; rotated on login; other sessions killed on password change, role change, suspension |
| Passwords | PBKDF2-SHA256, 100k iterations (Workers maximum), per-user salt, constant-time compare, account lock after 8 failures, timing-equalized unknown-account path |
| CSRF | Origin/Referer must match app origin on every mutation + per-session synchronizer token (`X-CSRF-Token`) + SameSite |
| XSS | React escaping only (no `innerHTML`), strict CSP (`script-src 'self' challenges.cloudflare.com`, no inline scripts, no `data:` fonts), evidence served with `CSP: sandbox` + `nosniff` |
| SQL injection | 100 % bound parameters; dynamic `ORDER BY`/filters come from server-side whitelists |
| Input validation | Zod schemas on every body; control/bidi-override characters stripped; upload MIME sniffed from magic bytes (PNG/JPEG/WEBP/PDF), 8 MB cap; JSON bodies > 256 KB rejected |
| Rate limiting | D1 fixed-window counters: signup/IP, login/IP + /account, listing create/submit, evidence upload, buy, chat (30/min), dispute, secrets, reveal, withdrawals |
| Bots | Turnstile verified server-side; **fails closed in production** when unconfigured |
| Authorization | permission per operation + object-level ownership checks; conflict-of-interest guards (no self-review, self-arbitration, self-payout, self-verification) |
| Evidence | App-level AES-256-GCM, HKDF per-object key bound to the R2 key as AAD, R2 at-rest encryption underneath; 2-minute HMAC-signed URLs bound to viewer + context and re-authorized on every fetch; every view audited |
| Transfer secrets | encrypted, one-time reveal (atomic wipe), TTL, cron destruction, never logged |
| Payout details | encrypted; decrypted only for finance on an approved withdrawal; audited |
| Payments | Stripe webhook HMAC signature (v1) verified with 5-minute tolerance; event-id idempotency table; session id + amount + currency cross-checked; late payment after cancellation auto-refunded; chargebacks open a high-severity case and freeze the deal |
| Money integrity | integer cents; escrow compare-and-set + guarded side effects in one transaction; withdrawal debit conditional on available balance inside the same statement batch |
| Audit | append-only `audit_log` for every sensitive action (who, what, when, IP), no secrets in details |
| Headers | HSTS, X-Frame-Options DENY / frame-ancestors none, Referrer-Policy, Permissions-Policy, `Cache-Control: no-store` on API |

- Local payments: Chargily webhooks are HMAC-verified, idempotent per event id, and checked against the deal's session, amount and currency. BaridiMob receipts are AES-GCM encrypted in R2 and served only through short-lived signed URLs to finance staff or the buyer; buyer refund RIPs are encrypted and revealing one is audited. A finance reviewer cannot confirm a payment on a deal they are party to.

## Residual risk (known, accepted or needing future work)

- BaridiMob/CCP confirmation relies on a human checking the platform's account statement; forged receipts are caught only if staff check the real balance, not the image.
- Chargily refunds and CCP payouts are manual, so they depend on finance staff executing and recording them.

1. **Platform account recovery is outside our control.** A determined seller can sometimes reclaim an account via
   the social platform's own support channels long after the reclaim-protection window. Mitigated (hold period,
   dispute + reversal, trust penalties), not eliminated.
2. **Screenshot evidence can be forged.** Humans review it and heuristics look for reuse/mismatch, but image
   forensics is not implemented.
3. **Automated code check is best-effort.** Most platforms block anonymous scraping; reviewers must confirm manually
   (enforced by the UI and API).
4. **Chat filter is heuristic.** Creative obfuscation (images of numbers, spelled-out handles in unusual forms) can
   pass. Attempts are logged, repeat offenders flagged, and full transcripts are available to arbiters.
5. **D1 rate limiting is per-window, per-key** and can be bypassed by distributed IPs; add Cloudflare WAF/Rate
   Limiting rules in front for volumetric abuse.
6. **Payouts are manual bank transfers recorded by finance** (with reference). Stripe Connect payouts are a natural
   next step and remove manual IBAN handling.
7. **Single encryption master key** (`DATA_ENCRYPTION_KEY`). Rotation requires a re-encryption job (not yet built).
8. **No email delivery provider** is wired, so there is no email verification or email notifications yet
   (in-app notifications only). Add one (e.g. via a Worker-compatible provider) before launch.
9. **KYC/identity verification of users is not implemented** (see legal section).

## Legal / compliance points that require qualified legal review before launch

- Holding third-party funds in Algerian dinars (escrow via a CCP account) and converting from USD may require authorization under Bank of Algeria / foreign-exchange rules.

* **Platform Terms of Service exposure.** Most social platforms prohibit selling or transferring accounts.
  Operating this marketplace may expose the company to account terminations, cease-and-desist letters or claims.
  The product shows prominent disclaimers (not a guarantee), but counsel must assess the business risk per market.
* **Money transmission / payment services regulation.** Holding buyer funds for a third party and paying them out
  later is regulated escrow / money transmission / payment services activity in many jurisdictions (e.g. US state
  MTL regimes, EU PSD2, GCC central-bank rules). Options include partnering with a licensed escrow provider or using
  Stripe Connect with the platform as an agent of the payee. **Do not operate the escrow commercially without this
  analysis.**
* **KYC / AML.** Depending on jurisdiction and volumes, identity verification of sellers (and possibly buyers),
  sanctions screening, transaction monitoring and suspicious-activity reporting may be mandatory.
* **Consumer protection & dispute rules**, cooling-off rights, and enforceability of arbitration decisions.
* **Data protection** (GDPR, Saudi PDPL, UAE PDPL…): lawful basis for storing verification screenshots that may
  contain personal data, retention periods, DSR handling, cross-border transfer (D1/R2 location hints).
* **Tax**: marketplace facilitator/VAT obligations on commission, and seller income reporting.
* **Minors & content**: the prohibited-content policy must be reviewed against local law.

The policy pages in the app are an operational draft and are labelled as requiring legal review.
