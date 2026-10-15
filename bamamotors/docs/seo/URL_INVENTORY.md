# URL Inventory — BamaMotors.com

Language for every public route: **English (en-US), LTR**. There are no localized routes. "Status" was measured on a local production build (`wrangler dev` with the production Worker bundle) on 2026-10-10. Risks marked ✔ were fixed in this pass (see SEO_IMPLEMENTATION_PLAN.md).

## Public, indexable

| URL pattern | Type / purpose | Index | Canonical | Data source | Title / description source | Structured data | Pagination & params | Status | Risk |
|---|---|---|---|---|---|---|---|---|---|
| `/` | Home: search entry, cities, guides | index | self | settings, counts, cities, posts | hard-coded, page-specific | Organization, WebSite+SearchAction, FAQPage | none | 200 | Links to empty landing pages ✔ |
| `/used-cars` | All-inventory search | index when unfiltered | `/used-cars` (`?page=N` self) | vehicles | hard-coded | BreadcrumbList, ItemList | `page`, 15 filters, `sort`; filtered → noindex; out of range → 302 to last page | 200 | — |
| `/used-cars/{city}-al` (12) | City landing page | index (unique editorial) | self; `?page=N` self | cities + live vehicles | city row | BreadcrumbList, FAQPage (city-specific), ItemList | `page`; `sort` → noindex | 200 | Out-of-range `page` = soft 404 ✔ |
| `/used-cars/{make}` (26) | Make landing page | index **only with inventory** ✔ | self | makes + vehicles | template + make | BreadcrumbList, ItemList | as above | 200 | Indexed on a 20–40-word intro with 0 cars ✔ |
| `/used-cars/{body}` (7), `/used-cars/under-{price}` (5) | Body / budget landing page | index only with inventory | self | vehicles | template | BreadcrumbList, ItemList | as above | 200 | — |
| `/used-cars/{city}/{body}`, `/used-cars/{make}/{model}` | Combination landing page | index only with inventory | self | vehicles | template | BreadcrumbList, ItemList | as above | 200 | ~180 empty combinations were linked ✔ |
| `/vehicles/{slug}` | Vehicle detail (product) | index while `active` and dealer `active`; sold → noindex; draft/archived → 404 | self | vehicles, images, dealer | `{year make model} for Sale in {city}, AL – {price}` | BreadcrumbList, Product+Car+Offer (AutoDealer seller) | none | 200 / 404 | Empty `image: []` in Product ✔; templated FAQPage ✔ |
| `/dealers` | Dealer directory | index unfiltered | `/dealers` | dealers | hard-coded | BreadcrumbList, FAQPage | `city`, `zip`, `q`, `page`; filtered → noindex | 200 | — |
| `/dealers/{slug}` | Dealer profile | index while active; pending/suspended → 404 to the public | self, `?page=N` self | dealers, profiles, reviews, vehicles | `{name} – Used Car Dealer in {city}, AL` | BreadcrumbList, AutoDealer (+AggregateRating from approved reviews only) | `page` | 200 / 404 | Out-of-range page ✔ |
| `/blog` | Guides index | index | `/blog`, `?page=N` self | blog_posts | hard-coded | BreadcrumbList, Blog | `page` | 200 | Out-of-range page = soft 404 ✔; duplicate description on page 2 ✔ |
| `/blog/{slug}` (20) | Guide (article) | index if published | self | blog_posts (Markdown) | post title / meta_description | BreadcrumbList, BlogPosting, FAQPage, HowTo (when authored) | none | 200 / 404 | 13 titles over 60 characters ✔ |
| `/blog/category/{slug}` (7) | Category archive | index | self, `?page=N` self | categories | name / description | BreadcrumbList, CollectionPage ✔ | `page` | 200 | Short descriptions ✔; out-of-range page ✔ |
| `/authors/{slug}` | Author profile | index | self | users (author_* fields) | name | BreadcrumbList, ProfilePage | none | 200 / 404 | — |
| `/financing`, `/for-dealers`, `/about`, `/how-it-works`, `/faq`, `/contact`, `/privacy`, `/terms`, `/disclaimer`, `/editorial-policy` | Content / legal pages | index | self | page source + settings | hard-coded, page-specific | BreadcrumbList (+FAQPage, HowTo, AboutPage, Organization where visible) | none | 200 | — |
| `/photo-credits` | Image attributions | noindex, follow ✔ | self | images.json | hard-coded | BreadcrumbList | none | 200 | Utility page indexed ✔ |

## Public, non-indexable (by design)

| URL pattern | Purpose | Control | Status |
|---|---|---|---|
| `/login`, `/signup`, `/forgot-password`, `/reset-password` (+ `?next=`, `?type=`) | Authentication | robots.txt Disallow + `X-Robots-Tag: noindex, nofollow` + meta noindex | 200 |
| `/logout` | Sign out | X-Robots-Tag, POST/redirect | 302 |
| Search/landing URLs with filters or `sort` | Faceted results | meta `noindex, follow`, canonical to the base path; `?*sort=` disallowed in robots.txt | 200 |
| Tracking parameters (`utm_*`, `gclid`, …) | Campaign links | canonical without the query | 200 |

## Private (authenticated)

| URL pattern | Purpose | Control | Status (anonymous) |
|---|---|---|---|
| `/account`, `/account/settings` | Shopper account | login redirect, robots.txt, X-Robots-Tag, `Cache-Control: private` | 302 → `/login?next=` |
| `/dashboard/**` (overview, vehicles, leads, profile, billing) | Dealer dashboard | same, plus dealer role check | 302 |
| `/admin/**` (22 routes) | Administration | same, plus admin role check (403 for other roles) | 302 / 403 |

## Machine endpoints

| URL | Purpose | Control | Status |
|---|---|---|---|
| `/robots.txt` | Crawl rules (production only allows crawling) | — | 200 |
| `/sitemap.xml` (index) and `/sitemap-{pages,vehicles,dealers,blog}.xml` | XML sitemaps | — | 200 |
| `/ads.txt` | AdSense authorized sellers (empty until a publisher ID is set) | — | 200 |
| `/api/**` | JSON endpoints (models, nearest ZIP, leads, saved, reviews, images, view counter, Stripe webhook) | robots.txt Disallow + X-Robots-Tag | 200 / 4xx |
| `/media/**` | Listing photos from R2 (immutable cache) | crawlable on purpose for image search | 200 / 404 |
| `/images/**`, `/fonts/**`, `/_astro/**`, `/og-default.png`, `/logo.png` | Static assets | — | 200 |

## Errors and normalization

| Case | Behavior | Status |
|---|---|---|
| Unknown path or missing slug (vehicle, dealer, post, category, author, landing) | Custom 404 page, `noindex`, no canonical ✔ | 404 |
| Trailing slash (`/used-cars/`) | Redirect to the slash-less URL | 301 |
| Uppercase path (`/Used-Cars/Birmingham-AL`) | Redirect to the lowercase URL ✔ (was 404) | 301 |
| `www.`, `*.workers.dev`, other attached domains | Redirect to `https://bamamotors.com` | 301 |
| HTTP | HSTS is sent on HTTPS responses. The HTTP→HTTPS redirect depends on the Cloudflare zone setting "Always Use HTTPS", which can't be read from this repository. Verify it from the deploy smoke test ✔ | 301 expected |
| Out-of-range `?page=` on blog, category, landing and dealer pages | 404 ✔ (was a 200 empty page) | 404 |
| `/used-cars?page=999` | Redirect to the last valid page | 302 |
