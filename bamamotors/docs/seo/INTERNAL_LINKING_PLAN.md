# Internal Linking Plan — BamaMotors.com

## Measured before → after (local crawl from `/`, same data)
| Metric | Before | After |
|---|---|---|
| URLs discovered by a crawler | 250 | 80 |
| HTML pages that are noindex (crawl waste) | 181 | 14 (login/signup variants + 3 nav hubs) |
| Links from crawlable pages to empty two-level landing pages (city×body, make×model) | ~3,000 | 0 (enforced by test) |
| Broken internal links | 0 | 0 |
| Internal links to redirects | 0 | 0 |

## Rules implemented
1. **Single source of truth.** `indexableLandingPaths()` (in `src/lib/sitemap.ts`, cached 60 s) returns exactly the landing pages in the sitemap.
   - **Template links:** the home page, `/used-cars` and landing-page templates link only to those pages:
     - model chips
     - "{city} by body type"
     - other cities for a body type
     - popular makes
     - budget buckets
   - **Editorial links:** `resolveLandingLinks()` rewrites Markdown links in guides and city copy that point to an empty combination (e.g. `/used-cars/huntsville-al/suvs`) to the nearest indexable parent (`/used-cars/huntsville-al`, else `/used-cars`). They become specific again automatically once inventory exists.
2. **Hub pages stay reachable.**
   - The footer links to all 12 city pages, the guides, and legal/editorial pages.
   - The home page links to the city cards, the 6 latest guides and the dealer directory.
   - Breadcrumbs on every page reflect the real hierarchy: Home › Used Cars › Make › Model › Vehicle; Home › Car Buying Guides › Category.
3. **Contextual links.**
   - City pages link to nearby dealers and 4 recent guides.
   - Vehicle pages link to the make/model landing page (breadcrumb), the dealer and similar vehicles.
   - Guides link to official sources and to the city pages (resolved to the parent when empty).
4. **Navigation hubs that may be noindex.** The header, footer and hero link to `/used-cars/trucks`, `/used-cars/suvs` and `/used-cars/under-10000`. These are core shopper destinations. When empty they are `noindex, follow` and still pass links, so they are kept on purpose (3 URLs).
5. **Auth links** (`/login`, `/signup?next=…`) are disallowed in robots.txt and noindexed. They appear in the header for users and are not a crawl concern.

## Orphan check
Every page in the four sitemaps is reachable from `/` through links:
- vehicles: through landing pages, `/used-cars` and dealer pages
- dealers: through `/dealers` and city pages
- guides: through `/blog`, categories, home and footer

`/photo-credits` is linked from the footer and is now noindex.

## Opportunities (owner/editor)
- Every new guide should link to 2–3 related guides and the relevant city or body hub.
- When a model gains inventory, its chip reappears on the make page automatically. No editorial work is needed.
- Consider a "Related guides" block at the end of each guide (same category), implemented from real category data.

## Guarded by tests
`tests/integration/seo.test.ts` crawls from `/` and fails on:
- broken links
- links to noindex two-level landing pages
- missing self-canonicals
