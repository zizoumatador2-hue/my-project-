# Search Architecture Map — BamaMotors.com

Audit date: 2026-10-10. Based on the repository on branch `ccr-949c33b0-3w3w8k` and a full local crawl (250 URLs) of the production build with test inventory, plus production database counts.

## 1. Website purpose
BamaMotors is a **two-sided automotive marketplace for Alabama, USA**. Licensed dealerships list used vehicles; shoppers search, compare and contact the dealer directly. It also publishes original car-buying guides. Classification: **marketplace + content website (hybrid)**. It is not a local business with a storefront: there is no public street address, phone number or opening hours, and none should be invented.

## 2. Primary audience
- Car shoppers in Alabama (US English, mobile-first), searching for terms like "used cars for sale in Birmingham AL", "used trucks Alabama" and "used cars near me".
- Alabama dealerships (franchise and independent) looking for listings and leads.

## 3. Primary conversion
- Shopper: a lead to a dealer (Contact, Request Price, Test Drive, Financing) from a vehicle page.
- Dealer: dealer sign-up on `/for-dealers` (Free/Basic/Pro plans).
- Secondary: AdSense impressions on content pages (publisher ID not yet configured).

## 4. Public route inventory (summary — full list in URL_INVENTORY.md)
Home; vehicle search `/used-cars`; landing pages `/used-cars/{city|body|price|make}` and `/used-cars/{city}/{body}`, `/used-cars/{make}/{model}`; vehicle detail `/vehicles/{slug}`; dealer directory `/dealers` and profiles `/dealers/{slug}`; blog `/blog`, posts `/blog/{slug}`, categories `/blog/category/{slug}`, authors `/authors/{slug}`; content pages (financing, for-dealers, about, how-it-works, faq, contact, privacy, terms, disclaimer, editorial-policy, photo-credits); auth pages (login, signup, forgot/reset password).

## 5. Indexable route inventory
Home, `/used-cars`, `/dealers`, static content pages, 12 city pages (unique editorial), landing pages **with live inventory**, active vehicle pages, active dealer profiles, blog index (and real paginated pages), 20 published guides, categories with posts, author page.

## 6. Non-indexable route inventory
`/admin/*`, `/dashboard/*`, `/account/*`, `/api/*`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/logout`, filtered/sorted search URLs, landing pages without inventory or editorial content, sold/draft/archived vehicles, pending/suspended dealers, draft posts, 404s.

## 7. Rendering model
- **Astro 5 SSR** (`output: 'server'`) on **Cloudflare Workers** (`@astrojs/cloudflare`), D1 (SQLite) for data, R2 for listing photos.
- All public content, metadata, links and JSON-LD are rendered on the server. Client JS (~5 KB) only adds progressive enhancement (gallery, saved vehicles, count-up, reveal animations). **No critical content depends on client-side rendering.**
- CSS is inlined (`inlineStylesheets: 'always'`); one self-hosted WOFF2 font is preloaded.
- Anonymous public HTML is edge-cached for 120 s; signed-in users bypass the cache.
- `trailingSlash: 'never'`; middleware 301-redirects trailing slashes and non-canonical hosts (www, workers.dev, other attached domains) to `SITE_URL`.

## 8. Content sources
| Source | Used for |
|---|---|
| D1 `vehicles`, `vehicle_images` (R2), `dealers`, `dealer_profiles`, `reviews` | Listings, dealer pages, ratings (approved reviews only) |
| D1 `cities` (seeded from `content/cities.mjs`) | 12 city landing pages with unique intro/body/FAQ |
| D1 `makes`/`models` (seeded from `content/makes.mjs`) | Make/model landing pages |
| D1 `blog_posts`, `categories`, `users` (author) — seeded from `content/posts/*.md`, editable in `/admin/posts` | Guides, categories, author page |
| D1 `settings` (admin) | Site name, contact email, verification codes, GA4, AdSense ID |
| `src/data/images.json` + `public/images` | Stock photos (Wikimedia Commons, credited) and fal.ai illustrations |

## 9. Current metadata system
Centralized in `src/layouts/BaseLayout.astro`. Each page passes `title`, `description`, `canonical`, `noindex`, `ogImage`, `ogType`, `published`, `modified`, `prev`/`next` and `jsonLd`. The layout appends `| BamaMotors`, truncates descriptions to 160 characters, and emits the canonical, robots, Open Graph and Twitter tags. `lang="en-US"`, `dir="ltr"`, `og:locale=en_US`.

## 10. Current structured-data system
`src/lib/seo.ts` holds the helpers (Organization, WebSite+SearchAction, BreadcrumbList, FAQPage, ItemList). `src/components/JsonLd.astro` serializes them safely, escaping `<` as `<`. Pages add their own types: vehicle (Product+Car with Offer and an AutoDealer seller), dealer (AutoDealer, plus AggregateRating only from approved reviews), BlogPosting, HowTo, ProfilePage.

## 11. Current crawl controls
- `robots.txt` (dynamic): production allows `/` and disallows admin, dashboard, account, api, auth pages and `?sort=` URLs; non-production deployments get `Disallow: /`. It references `sitemap.xml`.
- `X-Robots-Tag: noindex, nofollow` and `Cache-Control: private` on every private prefix.
- `<meta name="robots">` set per page; `noindex, follow` on thin, filtered, sold and paginated-filter pages.
- Sitemap index with 4 child sitemaps: pages, vehicles, dealers, blog.

## 12. Major SEO risks (detailed in CRAWL_AND_INDEX_REPORT.md)
1. **Soft 404s:** out-of-range pagination (`/blog?page=99`, `/used-cars/{landing}?page=N`) returns 200 and is indexable.
2. **Crawl waste:** landing pages link to ~180 non-indexable empty landing pages (model and city×body combinations), about 3,000 internal links per crawl.
3. **Thin make pages:** make pages are indexable on a 20–40-word intro even with zero listings (production currently has 0 listings).
4. **Long titles:** 13 guide titles exceed about 60 characters with the brand suffix (up to 94).
5. **Weak metadata** on blog category pages (descriptions under 70 characters) and duplicate descriptions on paginated blog pages.
6. **Generic social image:** the Open Graph image is the default on 45 of 66 indexable pages, although page-specific photos exist (city covers, guide covers, page banners).
7. 404 responses print a canonical to `/404`; uppercase URLs return 404 instead of redirecting.
8. The sitemap index `lastmod` is always "today", not derived from content.
9. **Marketplace has no inventory yet** (production: 0 vehicles, 0 active dealers). This is a business blocker for search visibility on commercial queries, not a technical one.
