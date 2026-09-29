# FountainFinances.com

Production website for **Fountain Finances**: *Smarter Money Decisions, Made Simple.* A US personal-finance education, calculator and comparison platform built as a fast static site with a small serverless API.

| | |
|---|---|
| Stack | Astro 5 (static output) · TypeScript · plain CSS (critical CSS inlined) · Cloudflare Pages + Pages Functions · D1 (SQLite) · Resend (email) |
| Content | 106 indexable pages: homepage pillar (8,400+ words), 6 hubs, 31 topic pages, 28 guides (1,500–2,600 words each), 13 calculators, 6 comparisons, trust & legal pages |
| Quality gates | 20 unit tests (finance math) · 17 Playwright tests (mobile + desktop) · `qa.mjs` site audit (SEO, links, headings, schema, word counts, sitemap) · browser sweep of every page · Lighthouse 99–100 across the board |

Detailed references: [docs/ADMIN.md](docs/ADMIN.md) (content & product management) · [docs/CONTENT-PLAN.md](docs/CONTENT-PLAN.md) (50-article architecture and refresh schedule).

---

## 1. Project structure

```
fountainfinances/
├── astro.config.mjs          site URL, sitemap (priority + lastmod), prefetch: false, rehype plugin
├── wrangler.toml             Cloudflare Pages project + D1 binding
├── migrations/0001_init.sql  D1 schema (subscribers, contact_messages, rate_limits)
├── functions/                Pages Functions (only /api/* invokes a Worker — see dist/_routes.json)
│   ├── _lib/http.ts          CSRF origin check, body parsing, validation, rate limiting, Turnstile, housekeeping
│   ├── _lib/email.ts         Resend client + confirmation email template
│   └── api/                  subscribe.ts · confirm.ts · unsubscribe.ts · contact.ts
├── public/                   _headers (security + cache), _redirects, robots.txt, global.css, fonts/, images/, js/
├── scripts/                  postbuild.mjs · qa.mjs · browser-sweep.mjs · generate-brand-images.mjs
├── src/
│   ├── content.config.ts     Zod schemas for every collection (the CMS contract)
│   ├── content/              guides/ · topics/ · hubs/ · comparisons/   (Markdown + front matter)
│   ├── data/                 site.ts · taxonomy.ts · calculators.ts · products.json · authors.json
│   ├── pillar/               personal-finance-guide.md (homepage pillar)
│   ├── lib/                  finance.ts (all calculator math) · calc-ui.ts · schema.ts (JSON-LD) · forms.ts · text.ts
│   ├── components/  layouts/  pages/  styles/critical.css
└── tests/                    unit/finance.test.ts · e2e/site.spec.ts
```

## 2. Routes

| Route | Purpose |
|---|---|
| `/` | Homepage: hero, tools, topic hubs, latest guides, comparisons, trust, **Complete Guide to Personal Finance** pillar, FAQ, newsletter |
| `/personal-finance/` `/credit/` `/banking/` `/loans/` `/mortgage/` `/insurance/` | Pillar hubs |
| `/budgeting/` `/saving-money/` `/emergency-funds/` `/debt-management/` `/financial-planning/` `/money-management/` | Personal finance topics |
| `/credit-scores/` `/credit-reports/` `/credit-cards/` `/credit-building/` `/credit-card-rewards/` `/balance-transfers/` | Credit topics |
| `/checking-accounts/` `/savings-accounts/` `/high-yield-savings/` `/cds/` `/online-banks/` `/banking-fees/` | Banking topics |
| `/personal-loans/` `/auto-loans/` `/student-loans/` `/debt-consolidation/` | Loan topics |
| `/mortgage-basics/` `/mortgage-rates/` `/first-time-home-buyers/` `/refinancing/` `/home-equity/` | Mortgage topics |
| `/auto-insurance/` `/home-insurance/` `/life-insurance/` `/renters-insurance/` | Insurance topics |
| `/guides/` and `/guides/<slug>/` | 28 guides (e.g. `/guides/how-to-build-a-budget/`) |
| `/calculators/` and `/calculators/<slug>/` | 13 calculators |
| `/best/` and `/best/<slug>/` | 6 comparisons |
| `/about/` `/editorial-standards/` `/authors/editorial-team/` `/contact/` `/faq/` | Trust center |
| `/privacy/` `/terms/` `/disclaimer/` `/affiliate-disclosure/` `/corrections/` `/accessibility/` | Legal |
| `/newsletter/` (+ `check-email`, `confirmed`, `unsubscribe`, `unsubscribed`, `error`) | Newsletter flow |
| `/search/` | Site search with type filters (noindex) |
| `/sitemap-index.xml` `/robots.txt` `/rss.xml` `/search-index.json` | Machine endpoints |
| `POST /api/subscribe` · `GET /api/confirm` · `GET|POST /api/unsubscribe` · `POST /api/contact` | API |

## 3. Calculators (all functional, all math in `src/lib/finance.ts`, unit tested)

| Calculator | Inputs → outputs |
|---|---|
| Budget | income + 8 expense categories → total, remaining, savings rate, breakdown bars |
| Loan payment | amount, APR, term → payment, total interest, total repayment, yearly schedule |
| Mortgage | price, down, rate, term, tax, insurance, PMI, HOA → P&I, taxes, insurance, PMI, total |
| Home affordability | income, debts, down, rate, tax rate, insurance, HOA, 28/36 or 31/43 → price, max payment |
| Credit card payoff | balance, APR, payment (+ goal months) → payoff time, interest, total paid, payment for goal |
| Compound interest | initial, monthly, rate, years, compounding → future value, contributions, interest, table |
| Investment growth | initial, monthly, yearly increase, return, years, inflation → nominal + real value |
| Emergency fund | 7 essential categories, months, APY, saved, deposit → target, gap, time to goal |
| Auto loan | price, down, trade-in, tax, fees, APR, term → payment, financed, interest, term table |
| Debt consolidation | up to 4 debts + loan APR/term/fee → current vs. consolidated payment, time, interest, savings |
| CD | deposit, APY, term, tax rate → maturity value, interest, after-tax, term table |
| Student loan | balance, rate, term, extra payment → payment, interest, time and interest saved |
| Home equity | value, balance, CLTV, amount, rate, term → equity, borrowable, payment, new CLTV |

Inputs are validated (`aria-invalid` + message), results update live, state is kept in the URL (shareable), a sticky result bar appears on mobile, and usage fires a consent-gated `calculator_use` event.

## 4. SEO architecture

- **Pillar → hub → topic → guide → calculator/comparison** internal linking. Every guide links back to its hub and the homepage pillar (`/#personal-finance-guide`); the pillar links to every guide, topic, calculator and comparison with descriptive anchors.
- **Metadata on every page:** unique `<title>` and description (≤160 chars, enforced by Zod + `qa.mjs`), keywords, canonical, Open Graph, Twitter card, `robots` directives.
- **JSON-LD:** Organization + WebSite (with SearchAction) on every page; BreadcrumbList; Article (author, reviewer, published/modified); FAQPage; HowTo (step guides); WebApplication (calculators); ItemList/CollectionPage (indexes); AboutPage/ContactPage.
- **Featured-snippet formatting:** 40–60 word “Quick answer” blocks, key-takeaway lists, comparison tables, numbered step lists with anchors (`#step-n`).
- **Sitemap** via `@astrojs/sitemap` with priorities and real `lastmod` from front matter; utility pages excluded. **robots.txt** allows all assets, blocks `/api/`, lists the sitemap. **RSS** at `/rss.xml`.
- **Semantic HTML:** one `<h1>`, no skipped heading levels (checked), labeled `<nav>` landmarks, `<article>`, `<section>`, `<aside>`, `<time>`.

## 5. Database schema (Cloudflare D1)

See `migrations/0001_init.sql`.

- `subscribers` — email (unique), status `pending|confirmed|unsubscribed`, **hashed** confirm/unsubscribe tokens, consent text, timestamps, source page.
- `contact_messages` — name, email, topic, message, status `new|answered|closed`.
- `rate_limits` — hashed IP buckets for fixed-window limits.

Retention promised in the Privacy Policy is enforced by opportunistic housekeeping in `functions/_lib/http.ts` (pending sign-ups 30 days, rate-limit rows 24 h, contact messages 24 months). No financial data is ever collected; calculator inputs never leave the browser.

## 6. Admin / CMS architecture

Content is **Git-based and schema-validated**: every article, topic, hub, comparison, product, author, FAQ, source and SEO field lives in typed files validated by Zod at build time — a malformed or incomplete entry fails the build instead of shipping. Authorized administrators manage content through pull requests (with CI running the full QA suite on every change). See **[docs/ADMIN.md](docs/ADMIN.md)** for step-by-step procedures, including how to add affiliate links and verified rates, and how to attach a visual Git-based CMS if non-technical editors join.

Subscribers and contact messages are managed with `wrangler d1 execute` queries documented in ADMIN.md.

## 7. Affiliate architecture

- Products live in `src/data/products.json`. `officialUrl` is always required; `affiliateUrl` is optional and is **only** set when a signed agreement exists.
- `ProviderLink.astro` renders affiliate links with `rel="sponsored noopener"`, an **“Affiliate link — we may earn a commission”** label and an “Affiliate” badge on the card; non-affiliate links show the provider’s domain.
- Clicks fire `affiliate_click` / `provider_click` events (consent-gated) with provider, product and placement.
- Comparison pages list products **alphabetically**, never ranked, with pros, cons and considerations for every product.
- Rates, fees and minimums render **only** when an editor records `{ value, asOf, sourceUrl }`; otherwise the card links to the provider’s current terms. Nothing is fabricated.

## 8. Legal & disclosure pages

About, Editorial Standards & Methodology, Contact, FAQ, Privacy Policy (consent, retention, state privacy rights, GPC, CAN-SPAM), Terms of Use, Disclaimer, Affiliate Disclosure, Corrections Policy, Accessibility statement. The footer carries a persistent “educational information only” disclaimer; guides show an editorial note; comparisons show an advertiser disclosure; calculators show an estimates-only note.

> Have a qualified attorney review the Privacy Policy and Terms (in particular the governing-law clause, which should name the state where the business is organized) before launch.

## 9. Setup (local)

Requirements: Node.js ≥ 22.18.

```bash
cd fountainfinances
npm ci
npm run dev                  # http://localhost:4321 (static pages; no /api)
npm test                     # finance math unit tests
npm run build && npm run qa  # production build + site audit

# Full stack locally (static site + Pages Functions + local D1)
cp .dev.vars.example .dev.vars          # fill in values
npm run db:migrate:local
npm run preview                         # http://localhost:8788

# Browser tests (starts `astro preview` automatically)
npx playwright install chromium
npm run test:e2e
```

## 10. Production deployment (Cloudflare Pages)

The workflow `.github/workflows/fountainfinances.yml` tests every PR and, on push to `main`, provisions D1 (idempotent), applies migrations, builds and deploys to the Pages project `fountainfinances`.

One-time setup:

1. **GitHub → Settings → Secrets and variables → Actions**
   - Secrets: `CLOUDFLARE_API_TOKEN` (permissions: *Account · Cloudflare Pages: Edit*, *Account · D1: Edit*), `CLOUDFLARE_ACCOUNT_ID`.
   - Variables (optional, public): `PUBLIC_GA_ID`, `PUBLIC_GSC_VERIFICATION`, `PUBLIC_BING_VERIFICATION`, `PUBLIC_TURNSTILE_SITE_KEY`.
2. Merge to `main` (or run the workflow manually) — the first run creates the D1 database and Pages project.
3. **Cloudflare dashboard → Workers & Pages → fountainfinances → Settings → Variables and Secrets** (Production), add:
   - `IP_HASH_SALT` (secret, long random string) — **required**
   - `RESEND_API_KEY` (secret) and `EMAIL_FROM` (e.g. `Fountain Finances <newsletter@fountainfinances.com>`) — required for newsletter confirmations
   - `CONTACT_TO_EMAIL` = `info.christopherkunz@gmail.com` — contact form notifications
   - `TURNSTILE_SECRET_KEY` (secret, optional; pair with `PUBLIC_TURNSTILE_SITE_KEY`)
   - `SITE_URL` is set in `wrangler.toml`.
4. **Custom domain:** Pages project → Custom domains → add `www.fountainfinances.com` and `fountainfinances.com`; add a redirect rule (Rules → Redirect Rules) from the apex to `https://www.fountainfinances.com` preserving path and query.
5. **Email:** in Resend, verify the `fountainfinances.com` sending domain (SPF/DKIM DNS records) before enabling the newsletter.

Manual deploy alternative: `npm run build && npx wrangler pages deploy dist --project-name fountainfinances`.

## 11. Environment variables

| Name | Where | Required | Purpose |
|---|---|---|---|
| `SITE_URL` | wrangler.toml | yes | Canonical origin for CSRF checks and email links |
| `IP_HASH_SALT` | Pages secret | yes | Salt for hashing IPs in rate limiting |
| `RESEND_API_KEY` | Pages secret | for newsletter | Email delivery |
| `EMAIL_FROM` | Pages variable | for newsletter | Sender address |
| `CONTACT_TO_EMAIL` | Pages variable | recommended | Contact form notifications |
| `TURNSTILE_SECRET_KEY` | Pages secret | optional | Bot protection on forms |
| `ALLOWED_ORIGINS` | Pages variable | optional | Extra origins allowed to POST (e.g. preview domain) |
| `PUBLIC_GA_ID` | build (GitHub variable) | optional | GA4; loads only after consent; enables cookie banner |
| `PUBLIC_GSC_VERIFICATION` | build | optional | Google Search Console meta tag |
| `PUBLIC_BING_VERIFICATION` | build | optional | Bing Webmaster Tools meta tag |
| `PUBLIC_TURNSTILE_SITE_KEY` | build | optional | Renders Turnstile (lazy-loaded) in forms |

No secrets are committed. `.dev.vars` and `.env` are git-ignored.

## 12. Analytics & tracking

GA4 is off by default. When `PUBLIC_GA_ID` is set, Consent Mode v2 starts with everything denied, a non-intrusive banner asks for opt-in, Global Privacy Control is honored, and `gtag.js` loads only after consent. Custom events: `calculator_use`, `affiliate_click`, `provider_click`, `cta_click`, `newsletter_signup`, `contact_submit`, `search`. Mark `newsletter_signup` and `affiliate_click` as key events (conversions) in GA4.

## 13. Security

Strict CSP, HSTS (preload-ready), `X-Frame-Options: DENY`, `nosniff`, restrictive Permissions-Policy, COOP. API: same-origin `Origin` check (CSRF), JSON/form content-type allow-list, 20 KB body limit, server-side validation, honeypot, per-IP rate limits (hashed), optional Turnstile, parameterized SQL, hashed single-use tokens with expiry, HTML-escaped email content, `no-store` responses. Functions run only on `/api/*`.

## 14. SEO launch checklist

- [ ] Connect `www.fountainfinances.com` and apex redirect; confirm HTTPS
- [ ] Verify the site in **Google Search Console** (set `PUBLIC_GSC_VERIFICATION` or DNS TXT) and submit `https://www.fountainfinances.com/sitemap-index.xml`
- [ ] Verify in **Bing Webmaster Tools** (set `PUBLIC_BING_VERIFICATION` or import from GSC) and submit the sitemap
- [ ] Create the GA4 property, set `PUBLIC_GA_ID`, mark key events, link GA4 ↔ Search Console
- [ ] Run `npm run qa:external` from a machine with normal internet access and fix any external link that has moved
- [ ] Test rich results for `/`, a guide, a calculator and `/faq/` in Google’s Rich Results Test
- [ ] Before displaying any rate or fee, record `{ value, asOf, sourceUrl }` for it (see ADMIN.md)
- [ ] Add real, named authors/reviewers with verifiable credentials to `authors.json` as the team grows (strong E-E-A-T signal for YMYL)
- [ ] Create official social profiles, then add them to `SITE.social` (feeds footer + Organization `sameAs`)
- [ ] Set up Google Business Profile only if the business has a qualifying physical presence
- [ ] Publish 1–2 new articles per week from docs/CONTENT-PLAN.md; follow the refresh schedule

## 15. Performance checklist (implemented)

- [x] Self-hosted variable WOFF2 fonts, preloaded, `font-display: swap`
- [x] Critical CSS inlined; `global.css` loaded non-blocking with `?v=` cache-busting (bump `CSS_VERSION` in `BaseLayout.astro` when the file changes)
- [x] `prefetch: false`; tiny per-page scripts, no framework runtime
- [x] Cache headers: `/_astro/*`, `/fonts/*`, `/global.css` immutable 1 year; HTML `no-cache`; other assets 1 hour
- [x] No layout shift (CLS 0); LCP ≈ 1.7–1.8 s under Lighthouse mobile throttling; TBT 0 ms
- [x] Functions scoped to `/api/*` via `_routes.json`
- [ ] After launch: monitor Core Web Vitals in Search Console and PageSpeed Insights

## 16. Optional improvements

- Named expert reviewers (CFP®, CPA) for YMYL guides; author profile pages per person
- Verified APY/APR data for comparison tables, refreshed on a monthly schedule (or via provider data feeds/APIs once partnerships exist)
- Affiliate network integrations and a redirect/click-log endpoint for server-side attribution
- Newsletter sending (campaigns) through the same email provider, with a simple admin export of confirmed subscribers
- Visual CMS (e.g. a Git-based CMS with OAuth) for non-technical editors — see ADMIN.md
- Additional calculators: retirement, net worth, debt-to-income, rent vs. buy, refinance break-even
- Original data studies (e.g. annual reader surveys) for link-earning and differentiation
- Spanish-language edition for US Hispanic audiences
