# SpiceVacations.com

**Discover your next escape.** A fast, SEO-first travel affiliate site for U.S. couples: romantic getaways, adults-only and all-inclusive resorts, beach vacations and honest deal timing across the USA, Mexico and the Caribbean.

| | |
|---|---|
| Stack | Astro 5 (static) · TypeScript strict · Cloudflare Workers + Static Assets · Workers KV · Workers Rate Limiting · Zod |
| Content | 12 destinations · 30 resorts · 9 vacation types · 6 deal-timing pages · 29 cluster guides (~44,000 words) · ~8,200-word pillar homepage |
| Pages | 107 static pages + 107 generated Open Graph images, sitemap index, robots.txt |
| Quality | Lighthouse (mobile) 97–99 performance, 100 accessibility / best practices / SEO · 20 unit tests · browser crawl of 103 pages at 375/768/1440 px |

---

## Local setup

```bash
cd spicevacations
npm ci
npm run dev            # http://localhost:4321 — static pages; the planner falls back to in-browser ranking
npm run preview        # build + wrangler dev — full site incl. /api/* and /go/* on http://localhost:8787
```

Useful scripts:

| Script | What it does |
|---|---|
| `npm run build` | Generates the illustration library, builds the site, then fails if any page lacks one H1, a title, description or canonical, has inline scripts (CSP), placeholder text, or a hard-coded partner URL |
| `npm run check` | `astro check` + Worker type-check (zero errors required) |
| `npm test` | Unit tests: affiliate resolver, planner, validation, CSV import, Worker (CSRF, rate-limited forms, `/go/`) |
| `npm run report:content` | **SEO report for editors:** missing/weak meta titles & descriptions, thin content, broken internal links, keyword cannibalization, missing pillar backlinks |
| `npm run audit:seo` | Audits the built HTML: duplicate titles/descriptions, hreflang, JSON-LD validity, BreadcrumbList, alt text, broken links, sitemap ↔ noindex consistency, robots.txt |
| `npm run qa` | Playwright crawl (needs `npm run preview` running): every page, links, console errors, overflow at 375/768/1440, menu, save, search, planner, contact form |
| `npm run import:content` | Bulk import from CSV/JSON (see below) |
| `npm run icons` | Regenerates favicons, app icons, manifest and brand SVGs from the master mark |

Copy `.env.example` to `.env` (build-time) and `.dev.vars` (Worker secrets for `wrangler dev`) as needed. Nothing is required to run the site.

## Project layout

```
spicevacations/
  src/content/            ← all editorial content (Markdown + frontmatter), validated by src/content.config.ts
    destinations/ resorts/ guides/ vacation-types/ deals/ pages/ (homepage pillar chapters)
  src/data/affiliates.json ← Affiliate Link Registry (partners, tracking IDs, defaults, per-item overrides)
  src/data/site.ts         ← site settings, navigation, footer
  src/lib/                 ← affiliate resolver, content helpers, JSON-LD builders, planner/search core, Zod schemas
  src/components/          ← design system (cards, AffiliateButton, PartnerSlot, Accordion, Breadcrumbs, Logo…)
  src/pages/               ← routes; dynamic routes generate one page per content entry
  src/scripts/             ← progressive enhancement (motion, consent-gated analytics, search, planner)
  worker/                  ← Cloudflare Worker: /api/plan, /api/contact, /api/newsletter, /go/*, LLM adapter
  public/                  ← icons, manifest, brand files, _headers (security headers + CSP), /admin (CMS)
  scripts/                 ← build/audit/import/QA tooling
  tests/                   ← Vitest unit tests
```

## Adding content (no code changes)

Every page type is generated from `src/content`. Add a file, run `npm run report:content`, commit — a new page, sitemap entry, OG image, search-index entry and planner candidate appear automatically.

- **Destination:** `src/content/destinations/<slug>.md`. Copy an existing file (e.g. `florida.md`). The file name is the URL: `/destinations/<slug>/`.
- **Resort / hotel:** `src/content/resorts/<slug>.md`, set `destination:` to a destination slug. Add `rating:` **only** with a real, sourced value (`value`, `count`, `source`, `url`) — otherwise no rating is shown anywhere.
- **Guide / article:** `src/content/guides/<slug>.md`. Required: `title`, `metaTitle` (≤62), `metaDescription` (110–165), `primaryKeyword` (must be unique across guides), `category` (a vacation-type slug), `snippet` (the 40–60-word "Quick answer" shown first for featured snippets). Optional `howTo` renders steps with HowTo schema; `faqs` render an accordion with FAQPage schema. Link back to the pillar page (`](/)`) — the report enforces it.
- **Deal timing:** `src/content/deals/<slug>.md`. We never publish prices; describe *when* value tends to appear.
- **Vacation type:** `src/content/vacation-types/<slug>.md`.

Images: every entry has an original illustrated scene (`scene` + `palette`). To use a licensed photo, set `image: /uploads/<file>.jpg`, `imageAlt` and `imageCredit`.

### Bulk import (hundreds of entries)

```bash
npm run import:content -- --collection resorts --file data/resorts.csv --dry-run
npm run import:content -- --collection resorts --file data/resorts.csv
npm run report:content && npm run build
```

CSV header = frontmatter field names. List fields use `|` (`features: Spa|Beachfront|Adults-only`), nested fields use dots (`rating.value`), and a `body` column becomes the Markdown body. JSON input is an array of the same objects. Existing files are skipped unless `--overwrite`.

### Editing content in the CMS

`/admin` runs [Decap CMS](https://decapcms.org) with a schema mirroring the content model (required SEO fields with length checks, slug validation, relations between destinations/resorts/guides, editorial workflow = draft → review → publish via pull requests, live-site preview links). To enable GitHub login, deploy a GitHub OAuth proxy (for example the open-source "decap-proxy" or "sveltia-cms-auth" Cloudflare Worker), then set `backend.base_url` in `public/admin/config.yml`. Every published change is a Git commit, which triggers CI and a deploy.

## Affiliate engine

- **One registry:** `src/data/affiliates.json` lists partners (name, network, product types, URL template with `{query}`, tracking parameter + ID, UTM defaults, `active` flag), a default partner per product type, and optional per-item overrides.
- **One resolver:** every CTA calls `getAffiliateUrl()` (`src/lib/affiliate.ts`) and renders through `AffiliateButton` / `PartnerSlot`. Components never contain partner URLs.
- **Tracked redirects:** HTML only ever links to `/go/<kind>/<slug>/<product>/` with `rel="sponsored nofollow noopener"` and `target="_blank"`. The Worker looks the id up in the build-generated `/go-map.json`, increments a per-day KV click counter (no personal data) and 302-redirects. The browser also fires an `affiliate_click` analytics event.
- **Never a dead button:** if no active partner exists for a product type (cruise, car and insurance ship inactive), the button falls back to our own page or the planner.
- **To connect a network:** set `trackingParam` and `trackingId` for the partner (e.g. Booking.com `aid`, Expedia `affcid`, Viator `pid`), or change `urlTemplate` to your network's deep-link format, then rebuild. To add cruises/cars/insurance, fill in the inactive partner's `urlTemplate` and set `active: true`. For an API-based feed (live prices/availability), implement it behind `searchItems()`/`plan()` in `src/lib/planner-core.ts` or as a new Worker route; only render prices returned live by the provider.
- Monetization slots for hotel, resort, flight, cruise, car, tour and insurance modules exist as `PartnerSlot` (destination and resort sidebars, guide sidebars). Sponsored content must be labeled "Sponsored" (see affiliate disclosure).

## Plan My Vacation

`/plan-my-vacation/` is a five-step form plus a free-text box ("I have $2,500 for 5 days. We are a couple departing from New York and want a romantic beach vacation."). It posts to `/api/plan` (Worker), which validates input with Zod, rate-limits per IP (20/min), parses the free text (budget, days, travelers, departure city, style, interests, month, destination), converts the budget into a value/mid-range/splurge *style* heuristic, and ranks only real destinations and resorts from the site's index — with plain-language reasons. It never invents prices or availability. If the API is unreachable (e.g. `astro dev`), the same ranking runs in the browser.

### Switching the planner to an LLM

```bash
npx wrangler secret put ANTHROPIC_API_KEY
# wrangler.jsonc → vars: "PLANNER_PROVIDER": "llm"  (optional: "PLANNER_LLM_MODEL")
npm run deploy
```

`worker/llm.ts` uses the Anthropic SDK: the rule engine first shortlists 15 real candidates, then Claude re-ranks them and writes the reasons as structured JSON. Any id not in the shortlist is discarded, the prompt forbids prices/ratings/availability, and on any error the rule-based result is returned. No UI changes needed.

## Forms, security & privacy

- Contact and newsletter forms work without JavaScript (POST + 303 redirect) and are enhanced with fetch. Server-side Zod validation, honeypot field, time-trap, per-IP rate limiting (Workers Rate Limiting binding), same-origin CSRF check (`Origin`/`Sec-Fetch-Site`), optional Cloudflare Turnstile (`TURNSTILE_SECRET_KEY` + `PUBLIC_TURNSTILE_SITE_KEY`). No personal data in URLs.
- Contact messages are stored in KV for 180 days; set `RESEND_API_KEY` + `CONTACT_TO` to also forward them by email. Newsletter sign-ups are stored in KV keyed by a hash of the email (export them to your email provider).
- `public/_headers`: CSP (`script-src 'self'` — the build fails on inline scripts), HSTS, X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy, COOP. The Worker adds the same headers to API responses.
- Cookie consent banner: analytics (Plausible via `PUBLIC_PLAUSIBLE_DOMAIN` and/or GA4 via `PUBLIC_GA4_ID`) load only after "Accept all". Google Consent Mode v2 defaults all storage to `denied` until then. Events: `affiliate_click`, `search`, `planner_submit`, `newsletter_signup`, `contact_submit`, `save_item`.

## Photos (Pexels) & cinematic effects

- `scripts/fetch-photos.mjs` searches Pexels for every destination, resort, guide, vacation type and deal (query = `photoQuery` frontmatter, a curated map, or a derived query), and self-hosts WebP versions at 640/960/1600px in `public/photos/` with a manifest in `src/data/photos.json`. Both are git-ignored and cached in CI.
- Set the repository secret `PEXELS_API_KEY` (free at pexels.com/api). Without it the build uses the original SVG illustrations.
- Resort photos are labeled "representative photo of the area" and every photo is credited on the page and at `/photo-credits/`.
- Effects (`src/scripts/cinema.ts` + "Cinematic layer" in `global.css`) are inspired by ReactBits: blur/split text, shiny and gradient text, film grain, light leak, letterbox intro, tilted cards with glare, spotlight cards, magnetic buttons, count-up stats, scroll-velocity marquee and scroll-driven hero. All are disabled under `prefers-reduced-motion`, and pointer effects run only on mouse devices.

## Google AdSense

- Set repository variable `PUBLIC_ADSENSE_CLIENT` (`ca-pub-…`) to add the `google-adsense-account` meta tag, load AdSense and generate `/ads.txt`. Optionally set `PUBLIC_ADSENSE_SLOT_ARTICLE` for the labeled in-article slot on guides (Auto ads work without it).
- Until configured, no ad code, empty slots or placeholder publisher IDs are shipped.
- For EEA/UK/Swiss visitors, enable Google's certified CMP (Privacy & messaging) in AdSense.

## SEO implementation

Unique titles/descriptions (validated), exactly one H1 per page (build-enforced), logical H2/H3, self-referencing canonicals, `hreflang="en-US"` + `x-default`, Open Graph + Twitter cards with a generated 1200×630 image per page, sitemap index (`@astrojs/sitemap`, 5,000 URLs per file, noindex pages excluded), robots.txt, breadcrumbs on all inner pages. JSON-LD graph on every page: Organization, WebSite + SearchAction, WebPage, BreadcrumbList, plus Article, FAQPage, HowTo, TouristDestination, Resort (LodgingBusiness), ItemList and CollectionPage where relevant. Pillar–cluster linking: the homepage pillar links to every guide with keyword-rich anchors; every guide links back to the pillar and to related guides, destinations and resorts. Utility pages (`/search/`, `/saved/`, thank-you pages, `/brand/`, 404/500) are `noindex`.

## Brand

Palette tokens live in `src/styles/global.css` (`--navy #0B1F3A`, `--coral #FF5A36`, `--gold #FFB627`, `--teal #14B8A6`, `--cream #FFF8F0`, `--ink #111827`, plus accessible text variants `--coral-text #B8321A` and `--teal-text #0F766E`). Fraunces (headlines) and Inter (body) are self-hosted variable fonts. The logo is an inline SVG component (`src/components/Logo.astro`) — horizontal, stacked, icon-only, one-color white and navy — with a sunrise animation on load and a shimmer on hover (both disabled under `prefers-reduced-motion`). Brand guidelines with clear space, minimum size, misuse rules and verified WCAG contrast ratios: `/brand/`. Downloadable files: `/brand/*.svg`, `/icons/*`, `favicon.svg/.ico`, `site.webmanifest`.

## Deployment (Cloudflare)

The Worker `spicevacations` serves the static build from Workers Static Assets; only `/api/*` and `/go/*` run code. Bindings in `wrangler.jsonc`: KV namespace `DATA`, rate limiters `FORM_LIMITER` and `PLAN_LIMITER`.

- **Automatic:** `.github/workflows/spicevacations.yml` runs content report → type-check → tests → build → SEO audit on every PR, and deploys on pushes to `main` using the repository's existing `CLOUDFLARE_API_TOKEN` secret (token needs Workers Scripts:Edit, Workers KV:Edit, and Zone/Workers Routes:Edit for the custom domain).
- **Manual:** `npx wrangler login && npm run deploy`.
- **Connect SpiceVacations.com:** add the domain to Cloudflare (Websites → Add a site) and switch the registrar's nameservers to the two Cloudflare nameservers shown. The next deploy attaches `spicevacations.com` and `www.spicevacations.com` to the Worker automatically (or add them under Workers → spicevacations → Settings → Domains & Routes). Canonicals and the sitemap already use `https://spicevacations.com` (`SITE_URL`).
- Vercel is not needed; if you ever prefer it, the static `dist/` deploys anywhere, but `/api/*` and `/go/*` would need to be ported to serverless functions.

## Decisions & assumptions

1. **Astro 5 static + Cloudflare Worker instead of Next.js + Sanity.** The master prompt asked for Astro 5 and a Cloudflare launch; a static site gives the best Core Web Vitals and zero server cost. "ISR" is replaced by fast full rebuilds (~20 s) triggered by content commits.
2. **Git-based content (Content Collections + Decap CMS) instead of a hosted CMS.** No vendor account or API keys needed, content is versioned, schema-validated at build time and editable in a browser at `/admin`.
3. **Plain CSS design system with tokens** instead of Tailwind; vanilla TypeScript + CSS for motion instead of Framer Motion (no React runtime → less JS, better INP).
4. **American English.** The site targets U.S. travelers, so it is LTR `en-US` (the Arabic RTL note in the template did not fit this audience).
5. **Original illustrations instead of stock photos.** The build environment could not download from Unsplash/Pexels, and hot-linking unverified photo IDs risks broken images. Every entry has an on-brand SVG scene; editors can add licensed photos per entry.
6. **No prices, no ratings, no reviews.** None were verified, so none are shown ("Prices vary. Check availability."). The rating filter was therefore not added to search; ratings appear automatically once real sourced values are entered.
7. **Default partners are active without tracking IDs** (Booking.com hotels/resorts, Expedia flights, Viator tours) so CTAs lead to useful live search results today; add your IDs to start earning.
8. **Contact email** is `info.christopherkunz@gmail.com` as provided. No personal bios or credentials were invented; articles are attributed to the "SpiceVacations Editorial Team."
9. **Facts:** only well-established resorts and facts were used, with "confirm directly" notes for policies that change (minimum ages, inclusions, reservation systems). Please review content before launch and update dates as you edit.

## Recommendations

- Apply to affiliate programs and add tracking IDs; add a cruise, car-rental and travel-insurance partner.
- Add licensed photography for top pages (keep `imageAlt`), and real author profiles once you have them.
- Set up Google Search Console and Bing Webmaster Tools, submit `sitemap-index.xml`, and monitor titles in the Performance report.
- Connect a newsletter provider (export KV sign-ups or send them to your ESP from the Worker).
- Keep publishing cluster guides (the model supports hundreds) and refresh `updated` dates when you revise content.
