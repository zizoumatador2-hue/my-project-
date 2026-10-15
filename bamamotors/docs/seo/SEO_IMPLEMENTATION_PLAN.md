# SEO Implementation Plan — BamaMotors.com

Ordered by the required priority. Status reflects this pass (2026-10-10).

| # | Priority | Item | Status | Files |
|---|---|---|---|---|
| 1 | Privacy / accidental indexing | Verified: private routes return 302/403 plus robots.txt Disallow, `X-Robots-Tag` and `Cache-Control: private`. API routes are noindexed. Non-production deployments disallow everything. **No S0 issues.** Added regression tests | ✅ tested | `tests/integration/seo.test.ts` |
| 2 | Crawl blockers | None found. Crawl waste removed: links only to indexable landing pages; editorial links to empty combinations resolve to the parent | ✅ | `src/lib/sitemap.ts`, `LandingPage.astro`, `index.astro`, `used-cars/index.astro`, `blog/[slug].astro` |
| 3 | Wrong status codes | Out-of-range pagination returns 404 (blog, category, landing, dealer directory and dealer pages). Uppercase URLs 301 to lowercase. A changed vehicle or post slug 301-redirects (new `slug_redirects` table) | ✅ | route files, `middleware.ts`, `lib/redirects.ts`, `migrations/0007_slug_redirects.sql` |
| 4 | Canonical errors | Error pages no longer emit canonical or `og:url`. Self-canonicals enforced by test | ✅ | `BaseLayout.astro`, `404.astro` |
| 5 | Sitemap / robots | Make pages listed only with inventory; fake index `lastmod` removed. robots.txt unchanged (correct) | ✅ | `lib/sitemap.ts`, `sitemap.xml.ts` |
| 6 | Page-specific metadata | Title suffix only when ≤ 60 characters. 6 SEO titles for long guides. Category descriptions from real data. Paginated descriptions numbered. `/photo-credits` noindex | ✅ | `BaseLayout.astro`, `content/posts/*`, `build-seed.mjs`, `migrations/0006_copy_refresh.sql`, category/blog pages |
| 7 | Structured data | FAQPage limited to unique, visible FAQs. Product: empty `image` and null seller fields removed. CollectionPage on categories. Validated (0 problems) | ✅ | `LandingPage.astro`, `vehicles/[slug].astro`, `blog/category/[slug].astro` |
| 8 | Rendering | Verified: everything is SSR; nothing critical depends on client JS | ✅ no change needed | — |
| 9 | Internal linking | See INTERNAL_LINKING_PLAN.md | ✅ | — |
| 10 | Performance | 30-day cache for `/images/*`; cheap 404s; less crawl load | ✅ | `public/_headers` |
| 11 | AEO content | Existing Quick-answer and FAQ patterns verified. "Updated" date shown only when it differs from the published date | ✅ | `blog/[slug].astro` |
| 12 | Optional | Page-specific social images and `og:image` dimensions; HTTP→HTTPS check in the deploy smoke test | ✅ | `BaseLayout.astro`, pages, workflow |

## Requires owner input (not implemented: no fabrication)
1. **Dealer and inventory onboarding.** This is the main blocker for commercial rankings.
2. Legal operating entity name, plus optional phone and mailing address (About, Contact, Organization `legalName`).
3. Social profile URLs (Admin → Settings → become `sameAs`).
4. Google Search Console and Bing verification codes (Admin → Settings), then submit `https://bamamotors.com/sitemap.xml`.
5. AdSense publisher ID once approved.

## Deployment notes
- Migrations 0006 (SEO titles) and 0007 (slug redirects) are applied automatically on first request by `src/lib/bootstrap.ts`, because the CI token can't run D1 migrations.
- Edge-cached HTML (120 s) refreshes on its own after deploy.
