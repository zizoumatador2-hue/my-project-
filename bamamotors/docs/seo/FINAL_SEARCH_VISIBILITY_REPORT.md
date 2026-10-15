# Final Search Visibility Report — BamaMotors.com

Date: 2026-10-10 · Scope: the entire `bamamotors/` application (Astro 5 SSR on Cloudflare Workers + D1/R2).

## 1. Website classification
A two-sided **automotive marketplace** for Alabama dealers and shoppers, plus an editorial **content site** of car-buying guides. English (en-US) only. Not a local business itself; dealer profiles are the local entities.

## 2. Routes audited
- **77 route files:** 27 public page templates (incl. 404), 22 admin, 8 dealer dashboard, 2 account, 9 API, 1 media proxy, 8 endpoints (robots.txt, 5 sitemaps, ads.txt, logout).
- **Crawled before the fixes:** 250 URLs from `/` and the sitemaps.
- **Crawled after the fixes:** 80 URLs.
- **Edge cases probed:** 30 (missing slugs, case, slash, tracking/sort/page parameters, private routes, error pages).
- **Sitemap check:** every one of the 74 sitemap URLs fetched.

## 3. Indexability findings
- **S0 (privacy / accidental indexing):** none.
- **S1:**
  - soft-404 pagination
  - make pages indexed without inventory
  - ~3,000 internal links into ~180 empty noindex pages
  - **All fixed.**

## 4. Crawl findings
- Verified working: one-hop redirects, canonical host and trailing-slash handling, filters and sort noindexed, 404s for missing records.
- Fixed:
  - uppercase URLs now 301
  - error pages have no canonical
  - changed vehicle/post slugs now 301 instead of 404
  - out-of-range pages now 404

## 5. Metadata improvements
- Brand suffix only when the title stays ≤ 60 characters: 0 indexable titles over 60, down from 13.
- 6 dedicated SEO titles for long guides.
- 0 duplicate descriptions (was 1).
- Category descriptions are now built from real data.
- Paginated pages are numbered.
- `/photo-credits` is noindex.

## 6. Canonical improvements
- Self-canonicals are enforced by test on every indexable page.
- No canonical on 404s.
- Pagination uses self-canonicals, not canonicals to page 1.
- Full rules in CANONICALIZATION_RULES.md.

## 7. Sitemap status
**Healthy.** Index plus 4 child sitemaps. Only canonical, indexable 200 URLs (verified by test). Real `lastmod` values only; the fake index date was removed. Make pages are listed only with inventory.

## 8. Robots status
**Healthy.** Production allows public pages and disallows admin, dashboard, account, API, auth and `?sort=`. Non-production environments disallow everything. Private responses also carry `X-Robots-Tag`.

## 9. Structured-data status
**Valid**: 0 parse errors and 0 missing required properties across all page types.

Types in use:
- Organization
- WebSite + SearchAction
- BreadcrumbList
- Product + Car + Offer (AutoDealer seller)
- AutoDealer (aggregateRating only from approved reviews)
- BlogPosting
- Blog
- CollectionPage (new)
- ProfilePage
- AboutPage
- HowTo
- ItemList
- FAQPage, now limited to unique and visible FAQs

Removed:
- templated FAQPage markup on generic landing and vehicle pages
- an empty `image: []`
- null seller fields

## 10. AEO improvements
- Existing direct-answer patterns verified: Quick-answer paragraphs, visible FAQs, explicit pricing on For Dealers, "not a lender" on Financing.
- Superlative scan: clean.
- The guide "Updated" date now shows only when it differs from publication.
- Gaps that need owner facts are listed in AEO_CONTENT_MAP.md.

## 11. Internal-linking improvements
- Crawlable URL space reduced from 250 to 80.
- Noindex pages linked from the site: 181 → 14.
- Empty-combination links: about 3,000 → 0 (enforced by test).
- Editorial links resolve to the nearest indexable page.

## 12. Performance improvements
- Baseline was already strong: 12–17 KB gzipped HTML, 4.6 KB of JS site-wide, inlined CSS, a preloaded font, sized images.
- Added a 30-day cache for `/images/*` and cheap 404s.

## 13. International and Arabic SEO
**Not applicable.** Single locale (en-US, LTR) with no Arabic public content. No hreflang is needed. The checklist for a future locale is in INTERNATIONAL_SEO_MAP.md.

## 14. Automated tests added (`tests/integration/seo.test.ts`, `tests/integration/flows.test.ts`, `tests/unit/lib.test.ts`)
Existing tests: status, one H1, heading order, unique titles, description presence and length, absolute canonical, JSON-LD parse, alt text, `lang`, broken links, sitemap URLs 200 + indexable, 404 + security headers.

**New:**
- On every indexable page:
  - title ≤ 65 characters
  - description ≥ 50 characters
  - self-referencing canonical
  - absolute `og:image`
  - no empty JSON-LD image array
- Links into noindex landing combinations fail the test.
- Error pages and out-of-range pagination: 404 + noindex + no canonical.
- One-hop URL normalization: uppercase, trailing slash, tracking parameters.
- Private and machine routes stay out of the index (robots.txt, 302/403, X-Robots-Tag).
- The sitemap index has no fake lastmod.
- Vehicle slug change → 301 to the new URL.
- Unit test for `resolveLandingLinks`.

**Results:** unit 19/19, integration 26/26, browser e2e 16/16 (mobile + desktop).

## 15. Remaining content gaps
- **Production has 0 vehicles and 0 active dealers.** Vehicle, make, body, price and model pages have no inventory, so commercial "used cars for sale" queries can't be won yet.
- Search Console and Bing are not yet verified, so there is no field data yet (indexing, CWV).

## 16. Owner information required
1. Dealer onboarding (inventory).
2. Legal entity name (+ optional phone and mailing address).
3. Social profile URLs.
4. Search Console and Bing verification codes, then sitemap submission.
5. AdSense publisher ID.

## 17. Search-readiness verdict
**CONDITIONALLY SEARCH READY**

Technically, the site is fully crawlable, indexable, canonicalized, server-rendered and validated. No important public page is blocked, duplicated or unreadable.

The condition is business-side: the marketplace pages have no listings yet, so organic visibility is currently limited to the 12 city guides and 20 editorial guides until dealers add inventory and Search Console is connected.
