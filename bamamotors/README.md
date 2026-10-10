# BamaMotors.com

A production-ready automotive marketplace and dealer lead-generation platform for **Alabama, USA**.
Shoppers search used cars from local dealers and contact them directly; dealers manage inventory and leads;
administrators run the marketplace, content and SEO.

| | |
|---|---|
| Stack | Astro 5 (SSR) · Cloudflare Workers · D1 (SQLite) · R2 (photos) · TypeScript · vanilla JS islands |
| Pages | ~14 KB gzipped HTML, zero render-blocking CSS (inlined), ~5 KB total JS, self-hosted WOFF2 font |
| Tests | 17 unit · 22 HTTP integration (all core workflows + SEO crawl) · 16 browser E2E on mobile (390×844) and desktop (1366×900) |

## What's included

**Shoppers:** hero search (make, model, price, year, mileage, city, ZIP + radius, "use my location"), a full search page
with 15 filters and 7 sort orders, vehicle detail pages with gallery, specs, dealer-disclosed history, a payment calculator,
similar vehicles and FAQ, plus five lead types (Contact Dealer, Request Info, Request Price, Schedule Test Drive, Financing).
Also saved vehicles, an inquiry history, dealer profiles with moderated reviews, and a dealer directory with near-me search.

**Dealers** (`/dashboard`): overview analytics (views, leads/day, saves, top vehicles), notifications, inventory CRUD with
bulk actions, multi-photo upload (resized to WebP in the browser, validated by magic bytes on the server, stored in R2),
reorder/cover/delete photos, lead inbox with statuses (New → Contacted → Qualified → Converted/Closed), email replies,
internal notes, a profile with logo, hours and license, and a plan & billing page.

**Admins** (`/admin`): overview, dealers (approve/suspend/plan/feature/delete), vehicles (search, filter, bulk status,
feature, delete, create for any dealer), all leads including site-level financing leads, users (role, suspend, delete),
featured listings, subscriptions & payments, review moderation, a blog CMS (Markdown, FAQ/HowTo schema, honest "updated"
dates), categories, city landing-page content, makes & models, contact messages & email outbox, reports (CSV export),
and SEO/site settings (GA4, Search Console/Bing verification, social profiles).

**SEO:** landing pages for cities (`/used-cars/birmingham-al`), body types (`/used-cars/trucks`), budgets
(`/used-cars/under-10000`), makes (`/used-cars/toyota`), models (`/used-cars/toyota/camry`) and city + body type
(`/used-cars/birmingham-al/suvs`). Each has live price tables computed from real inventory, a featured-snippet summary,
FAQ, breadcrumbs and cross-links. Pages without inventory or unique copy are `noindex` and left out of sitemaps.
JSON-LD covers Organization, WebSite+SearchAction, BreadcrumbList, Product/Car + Offer, AutoDealer (+ AggregateRating
only from real, approved reviews), FAQPage, BlogPosting, HowTo, ItemList and ProfilePage. Also included: canonical URLs,
Open Graph/Twitter tags, a sitemap index (`/sitemap.xml`) and `robots.txt` (non-production deploys are disallowed).
12 original Alabama car-buying guides and 12 hand-written city guides ship as seed content.

**Integrity:** no scraped listings, photos or reviews, no fake dealers, no fake reviews. Every listing comes from a dealer
or an admin, and the schema has `source = 'feed'` + `feed_id` ready for licensed inventory feeds.

## Local development

Requirements: Node 22+.

```bash
cd bamamotors
npm ci
cp .dev.vars.example .dev.vars        # local-only values
npm run serve:fresh                   # build + migrate local D1 + start worker on http://127.0.0.1:8788
```

Sign up at `/signup` with `admin@bamamotors.test` (the `BOOTSTRAP_ADMIN_EMAIL` in `.dev.vars`) to become the admin.
Register a dealer at `/for-dealers`, approve it in `/admin/dealers`, then add vehicles in `/dashboard`.

`npm run dev` (Astro dev server with Cloudflare bindings emulated) also works for fast UI iteration. `npm run serve` runs
the real production Worker bundle.

### Checks

```bash
npm run lint && npm run typecheck && npm test      # ESLint, astro check, unit tests
npm run serve:fresh && npm run test:api            # HTTP integration + SEO crawl (needs running server)
npm run serve:fresh && npm run test:e2e            # Playwright, mobile + desktop, screenshots in test-results/shots
```

Run `serve:fresh` before each suite: the sign-up rate limiter (6 per IP per hour) counts test sign-ups too.

## Environment variables

| Name | Where | Purpose |
|---|---|---|
| `SITE_URL` | `wrangler.toml` `[vars]` | Canonical origin, e.g. `https://bamamotors.com` |
| `ENVIRONMENT` | vars | `production` enables indexing in robots.txt and HSTS |
| `PUBLIC_CACHE_TTL` | vars | Seconds to edge-cache anonymous public HTML (0 disables) |
| `EMAIL_FROM` | vars | From address for transactional email |
| `SESSION_SECRET` | secret | Salt for hashed IPs (rate limiting / spam) |
| `BOOTSTRAP_ADMIN_EMAIL` | secret | The first sign-up with this email becomes admin |
| `RESEND_API_KEY` | secret | Email delivery via Resend. Without it **no email is sent**: messages are only logged in Admin → Messages, and the site says so where it matters (password reset, lead confirmations) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | secret | Enables online billing |
| `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PRO` | secret | Stripe Price IDs for the $49 / $99 monthly plans |
| `STRIPE_PRICE_FEATURED` | secret | Optional Price ID for featured listings (otherwise priced from admin settings) |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | secret | Optional Cloudflare Turnstile on sign-up, lead and contact forms |

Bindings: `DB` (D1), `MEDIA` (R2), `ASSETS`. No secret is ever sent to the browser.

## Database

Schema: `migrations/0001_schema.sql`. It covers users, sessions, password resets, cities, ZIP codes, makes, models,
dealers, dealer profiles, vehicles, vehicle images, features and daily view stats, leads and lead messages, saved
vehicles, notifications, subscriptions, payments, featured listings, reviews, categories, blog posts, settings, contact
messages, the email outbox, rate limits and the audit log. It uses foreign keys, CHECK constraints, indexes and timestamps.

Seed data is generated from `/content` (cities, makes/models, categories, articles) plus 839 Alabama ZIP centroids
(from the BSD-licensed `zipcodes` package):

```bash
npm run db:seed:build      # regenerates migrations/0002 and 0003 from /content
```

Content in 0002/0003 is only the initial seed. After launch, edit it in the admin CMS.

## Deploying to Cloudflare

```bash
npx wrangler login
npx wrangler d1 create bamamotors-db            # copy database_id into wrangler.toml
npx wrangler r2 bucket create bamamotors-media
npm run db:migrate:remote
npx wrangler secret put SESSION_SECRET          # and BOOTSTRAP_ADMIN_EMAIL, RESEND_API_KEY, ...
npm run deploy
```

Then attach the `bamamotors.com` custom domain to the Worker, sign up with the bootstrap admin email, and fill in
**Admin → SEO & site settings** (contact info, GA4, verification codes, social profiles). Submit
`https://bamamotors.com/sitemap.xml` to Google Search Console and Bing Webmaster Tools.

Caching: `/_astro/*`, `/fonts/*` and `/media/*` are served `immutable` for 1 year. Anonymous public pages are cached
at the edge for `PUBLIC_CACHE_TTL` seconds; signed-in users always get fresh pages.

## Admin & dealer setup

- **Dealer approval:** new dealers start `pending`, so they can add inventory, but it stays hidden until an admin
  approves them in Admin → Dealers. To skip review, turn on "auto-approve" in settings (not recommended at launch).
- **Plans:** Free (10 listings), Basic $49/mo (75 listings, 2 featured slots), Pro $99/mo (500 listings, 10 featured
  slots, homepage placement). Limits live in `src/lib/plans.ts`.
- **Featured listings:** dealers use their included slots or buy extras. Admins can feature any vehicle.

## Stripe integration

The billing code is complete and switches on when the Stripe secrets are set:

1. In Stripe, create two recurring Prices (Basic $49, Pro $99) and optionally a one-time "Featured listing" Price.
2. Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PRO` (and optionally `STRIPE_PRICE_FEATURED`).
3. Add a webhook endpoint at `https://bamamotors.com/api/stripe/webhook` for `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted` and `invoice.payment_failed`, then set
   `STRIPE_WEBHOOK_SECRET`.

Dealers then get Stripe Checkout for upgrades and featured listings, and the Billing Portal to manage cards and
cancel. Webhooks are signature-verified (HMAC, 5-minute tolerance) and idempotent. Until Stripe is configured,
upgrades become **requests** that admins approve and invoice manually (Admin → Subscriptions), so no payment flow
is faked.

## Licensed inventory feeds (future)

`vehicles.source = 'feed'` with a unique `(dealer_id, feed_id)` is reserved for feed imports. A feed importer
(cron-triggered Worker or queue consumer) should:

1. Fetch the licensed feed for a dealer (DMS, or an aggregator such as a CSV/XML provider).
2. Upsert by `(dealer_id, feed_id)` through `saveVehicle()` (`src/lib/vehicle-save.ts`) so validation, plan limits and
   slugs stay consistent.
3. Copy photos into R2 only where the licence permits, and mark vehicles missing from the feed `sold`/`archived`.

## Content freshness plan

- Evergreen guides: review every 6–12 months. Price and financing guides: every 1–3 months.
- Publish 1–2 new guides per week, driven by Search Console queries.
- Only tick "substantial update" in the CMS when the content really changed. That keeps the visible and
  `dateModified` dates honest.
- Check Search Console and Core Web Vitals monthly, and run a full SEO audit (`npm run test:api` includes a crawler) quarterly.

## Site images

Site photos (hero, city, body-type and guide covers) are built at deploy time, not at runtime. `content/image-requests.json` lists the slots:

- `scripts/fetch-commons.mjs` fills a slot with a freely licensed Wikimedia Commons photo, and `/photo-credits` credits it.
- `scripts/generate-fal.mjs` generates an illustration for slots that have a `fal` prompt. It needs the `FAL_KEY` GitHub secret.

The results are written to `public/images/` and `src/data/images.json`, and the deploy workflow commits them back. Dealer listing photos are separate: dealers upload them, and they are stored in R2 and served from `/media/*`.

## Project layout

```
content/        seed content: cities, makes/models, categories, articles (Markdown), image slots
docs/           SEO audit (docs/seo) and engineering audit (docs/engineering)
migrations/     D1 schema + generated seed migrations
public/         fonts, favicon, logo/OG images, generated site images, _headers
scripts/        dev server, seed builder, site image pipeline, brand asset renderer
src/lib/        data access, search engine, auth, security, billing, email, SEO, markdown
src/pages/      public site, /dashboard (dealer), /admin, /account, /api
tests/          unit, integration (HTTP + SEO crawl), e2e (Playwright)
```
