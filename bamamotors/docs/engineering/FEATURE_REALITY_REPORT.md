# Feature Reality Report: BamaMotors

For each feature that implied more than it did, the table records what users were told, what really happened in production (no Resend, no Stripe, no Turnstile), and the resolution:
1. Implemented
2. Disabled honestly
3. Removed
4. Documented as needing setup

| Feature | Claimed to the user | What actually happened | Resolution |
|---|---|---|---|
| Password reset email | "We've sent a reset link." | Token created, email only logged in Admin → Messages. Nobody received anything. | **2 + 4.** Without email delivery, the page now says automatic email isn't set up and tells the user to write to the contact address. The admin can relay the logged link. Enumeration safety is unchanged (same text whether or not the account exists). Setup: `RESEND_API_KEY`. |
| Lead confirmation to shopper | "A copy was emailed to you." | No email. | **2.** The sentence only appears when email delivery is configured. The lead itself was always saved and shown to the dealer, and still is. |
| Dealer lead alerts | Dealer profile: "Leads are emailed to your lead email." Free plan: "Unlimited leads by email." | No email. Leads appear in the dashboard with an in-app badge. | **2.** Copy now says leads appear under Leads (and "are emailed" only when email works). The plan perk now reads "Unlimited leads". |
| Admin notifications | Dealer sign-ups, contact messages, site leads, review submissions, plan requests and featured-listing requests all "notify admins". | Rows were written to `notifications` but **no admin screen read them**. Featured-listing requests made without Stripe were effectively lost. | **1.** Admin overview shows a Notifications panel with "Mark all read", and the admin nav shows the unread count (shared `NotificationsPanel` component). Covered by a new integration test. |
| Contact form reply time | "We usually reply within one business day." | No such commitment exists. | **2.** "We'll reply to the email address you gave." |
| Photo credits | "Photos … come from Pexels and Wikimedia Commons." | No Pexels photo is used. | **3.** Pexels removed from the copy, the code and the pipeline. |
| HTTPS | HSTS header sent; site presented as secure. | `http://bamamotors.com/` served the page over plain HTTP (200). | **1.** Production middleware 301-redirects `http:` to the canonical `https:` origin. |
| Checkout errors | Raw Stripe API message shown to dealers. | Leaked config detail; the dealer can't act on it. | **1.** The message is logged server-side; dealers see an actionable message. |
| Save vehicle (heart) | Toggles instantly. | On a network or server error the heart silently flipped back. | **1.** A toast explains the save failed. |
| Quick links and footer links to trucks, SUVs and under-$10k | Shown as browsable categories. | With no matching inventory they led to empty, noindex pages. | **1.** Shown only when the category page has listings (same rule as the sitemap). |

## Verified real (no change needed)
- **Payments:**
  - Stripe Checkout, Billing Portal and signed, idempotent webhooks.
  - Without Stripe, plan and featured requests are recorded and an admin applies them. No payment is simulated.
- **Search:** every filter, sort and radius option maps to SQL. "Use my location" calls `/api/nearest-zip`.
- **Uploads:** photos are stored in R2 and validated by magic bytes. Logo upload works.
- **Reports:** "Export CSV" downloads the table shown.
- **Live counts:** homepage stats, dashboard analytics and admin counters are all live database counts. Vehicle and dealer counts are hidden at 0 rather than faked.
- **Reviews:** stored, moderated, and the only source of AggregateRating.
- **Honeypots:** lead and contact honeypots return success on purpose (anti-spam), and nothing is stored.

## Still needs owner setup (documented, not faked)
- `RESEND_API_KEY` plus a verified sending domain, for every transactional email.
- Stripe keys and price IDs, for online billing.
- Turnstile keys, which are optional.
- Adding `bamamoutours.com` to Cloudflare, for the secondary-domain redirect.
