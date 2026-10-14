# Product truth map

What this project really does, based on the code, the database schema, the routes, and the tests. Where a feature is only described in copy or only in UI, it is marked as such.

## Who the product is for
- **Visitors:** U.S. adults looking for plain-English personal finance guidance, calculators, and product comparisons.
- **Owner (the only admin role):** the site owner, who signs in through Cloudflare Access to the `/admin` control room.

## Business purpose
An educational site that earns money through display advertising (Google AdSense) and, in principle, affiliate links. It does not sell products, hold customer money, or process payments.

## Data the site owns
| Data | Storage | Written by | Read by |
|---|---|---|---|
| Newsletter subscribers | D1 `subscribers` | `/api/subscribe`, `/api/confirm`, `/api/unsubscribe`, admin unsubscribe | Admin `/admin/subscribers` |
| Contact messages | D1 `contact_messages` | `/api/contact` | Admin `/admin/messages` |
| Rate-limit counters | D1 `rate_limits` | Form endpoints | Housekeeping only |
| Admin audit log | D1 `admin_audit_log` | Admin actions | Admin `/admin/audit` |
| Content (guides, topics, comparisons, products, authors) | Repository files | Maintainers, through pull requests | Build time, then static pages |
| Page analytics | Cloudflare Web Analytics | Cloudflare | Cloudflare dashboard, linked from `/admin/analytics` |

## Status of each feature

### 1. Fully implemented
- **Guides, topic pages, hubs, calculators (13), search page:** built from content files at build time. Search runs on a static index in the browser.
- **Calculators:** all 13 compute in the browser. Their data entries and pages match one-to-one.
- **Contact form:** validates input, checks the Origin header, applies rate limits, stores the message in D1, and sends an email when Resend is configured.
- **Newsletter sign-up:** double opt-in. Pending subscribers stay pending until they confirm. Confirmation email requires Resend.
- **Unsubscribe link:** removes the address.
- **Admin dashboard:** messages (triage), subscribers (filter, export, unsubscribe), analytics (first-party figures), health checks, audit log, settings. Protected on the server.
- **Public site security headers, sitemap, robots, structured data, AdSense script and ads.txt:** present and verified in the live diagnostic job.

### 2. Partially implemented
- **Newsletter delivery:** works only when `RESEND_API_KEY` and `EMAIL_FROM` are set. Without them, sign-ups are stored as pending and nothing is sent. The UI says this, and `/admin/health` reports it.
- **Contact alerts to the owner:** require `CONTACT_TO_EMAIL` and Resend. Without them, messages are saved in the admin inbox only.
- **Bot protection on the contact form:** rate limiting always applies. Turnstile applies only when `TURNSTILE_SECRET_KEY` is set.
- **Admin sign-in:** works only after the owner configures the Cloudflare Access application and its variables. Until then, `/admin` shows a closed state.
- **Affiliate links:** the provider card supports them and the disclosure text is in place, but no product record currently sets `affiliateUrl`. Today every link is a plain official link.

### 3. UI-only
- None found. Every control either does something or is labelled as unavailable. The admin "maintenance mode" card says it is not available.

### 4. Mocked
- None. There are no mocked API responses or hardcoded sample data in production paths.

### 5. Broken
- None confirmed in the last live diagnostic. Two external links reported errors in the most recent run: one American Express page (product data, returned a fetch error) and one IRS page, which I removed from the Roth guide because it returned 404. The American Express link is still open.

### 6. Unused
- The reactbits components `Aurora`, `BlurText`, `Magnet`, and `ShinyText` (see the audit, findings 1 to 4).
- The `ogl` package, used only by `Aurora`.
- The `@fontsource-variable` packages for Inter and Source Serif 4. The site uses self-hosted fonts instead.

### 7. Unknown
- **Real traffic and conversion:** only Cloudflare Web Analytics has numbers, and they are small. Search Console is not yet set up.
- **Whether AdSense approval has happened:** not known from the repository.
- **Whether the edge Worker's forwarded headers reach the admin middleware on the custom domain:** not verified from a live request, because the sandbox cannot reach the domain. The middleware fails closed if the Access header is missing, so this would show as a 403 rather than a leak.

## Critical user flows
1. **Read a guide or calculate:** works end to end and is covered by browser tests.
2. **Subscribe to the newsletter:** works up to the confirmation email, which depends on Resend.
3. **Send a contact message:** works, and the message reaches the admin inbox.
4. **Admin triage:** works in local tests; production depends on Access configuration.

## Explicitly not in this product
- Customer accounts, passwords, or login for visitors.
- Payments, orders, subscriptions, credits, points, or wallets.
- Support tickets beyond the contact form.
- AI features, SMS or WhatsApp messaging, webhooks, or job queues.
These are not implemented and are not implied by the UI. The admin dashboard reports them as not configured.
