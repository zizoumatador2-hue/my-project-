# Crawl and Index Report — BamaMotors.com

**Method:** I ran a full crawl of the production Worker bundle on a local server (`wrangler dev`), with seeded content and integration-test inventory, starting from `/`, `/robots.txt` and `/sitemap.xml`. It covered 250 URLs, 247 of them HTML. I also probed 30 edge-case URLs (missing slugs, case, trailing slash, parameters, pagination, private routes) and fetched every sitemap entry.

Severity scale:
- **S0:** severe indexing or privacy issue
- **S1:** major organic visibility issue
- **S2:** moderate technical issue
- **S3:** optimization

## What already works (verified)
- **Private routes:** all private routes (`/admin`, `/dashboard`, `/account`) return 302 to the login page for anonymous users. They also send `X-Robots-Tag: noindex, nofollow` and `Cache-Control: private, no-store`, and robots.txt disallows them. Admin returns 403 to signed-in non-admins.
- **API:** `/api/*` sends `X-Robots-Tag: noindex, nofollow` and is disallowed in robots.txt.
- **Non-production deployments:** robots.txt is `Disallow: /`, and `*.workers.dev` and `www` 301-redirect to `https://bamamotors.com`.
- **Trailing slashes:** URLs ending in a slash 301-redirect to the slash-less URL. There are no redirect chains: every redirect resolves in one hop.
- **Missing records:** missing vehicles, dealers, posts, categories, authors and landing slugs return a real **404** with `noindex`. Draft and archived vehicles return 404, sold vehicles return 200 with `noindex`, and pending dealers return 404 to the public.
- **Filters and sorting:** filtered and sorted searches get `noindex, follow` with a canonical to the base path. Tracking parameters are dropped from canonicals.
- **Sitemaps:** all 74 sitemap URLs return 200 and are indexable. No redirects, errors or noindex pages appear in the sitemaps.
- **Every crawled page:** one `<h1>`, a unique `<title>`, `lang="en-US"`, valid JSON-LD (0 parse errors), and no `<img>` missing `alt` or dimensions.
- **Rendering:** all content, links, metadata and JSON-LD are server-rendered (Astro SSR), and the HTML is complete without JavaScript.

## Findings

| # | Sev | Finding | Evidence | Fix |
|---|---|---|---|---|
| 1 | — | **No S0 issues found.** No private page is indexable and no important public page is blocked. | Private-route probes above | — |
| 2 | S1 | **Soft 404 on out-of-range pagination.** `/blog?page=99`, `/blog/category/{c}?page=N`, `/used-cars/{landing}?page=N` and `/dealers/{d}?page=N` return 200 with `index` and a self canonical, but the list is empty. | `/blog?page=99 → 200 index`, `/used-cars/birmingham-al?page=2 → 200 index` with 1 vehicle | Return 404 when `page > pages` |
| 3 | S1 | **Crawl waste from internal links to non-indexable empty pages.** Landing pages link to every model of a make, every city×body combination and every price/body page, even with no inventory. 181 of 247 crawled HTML pages were `noindex`, receiving about 3,000 internal links. Home links to 20 of them. | crawl graph | Link only to landing pages that are indexable (have inventory or editorial content) |
| 4 | S1 | **Thin make pages indexed with no listings.** `/used-cars/{make}` is indexable whenever the make has a 18–42-word intro. Production has 0 listings, so 8 pages read "Used Toyota for Sale in Alabama" over an empty result list, a soft-404 pattern. | `content/makes.mjs` intros; `landing.ts hasEditorial: Boolean(make.intro)` | Make pages are indexable only with live inventory; the sitemap follows the same rule |
| 5 | S2 | **Templated FAQPage markup on generic pages.** Body, price, make, model and city×body landing pages and every vehicle page emit FAQPage built from the same template sentences. The content is visible but repeated site-wide, which is low-value markup. | `genericFaq()` in `landing.ts`; vehicle `faq` | Keep the visible FAQ. Emit FAQPage only where the questions are unique (city pages, guides, home, /faq, /dealers, /financing, /for-dealers) |
| 6 | S2 | **Product schema with an empty `image: []`** when a vehicle has no photos. | vehicle page JSON-LD | Omit the property when there are no images |
| 7 | S2 | **404 responses print a canonical** (`/404` or the missing path). | `/vehicles/nope` | Omit the canonical on error pages |
| 8 | S2 | **Uppercase URLs return 404** instead of redirecting (slugs are lowercase). | `/Used-Cars/Birmingham-AL → 404` | 301 to the lowercase path for HTML routes. `/media/*` R2 keys are case-sensitive and excluded |
| 9 | S2 | **Sitemap index `<lastmod>` is always today**, not derived from content. | `sitemap.xml.ts` uses `new Date()` | Remove the fake lastmod. Child sitemaps keep real `updated_at` values |
| 10 | S2 | **Titles too long** for search results: 13 guides between 66 and 94 characters including `| BamaMotors`. | crawl | Add the brand suffix only when the result is ≤ 60 characters |
| 11 | S2 | **Duplicate or weak descriptions**: `/blog?page=2` repeats page 1's description, and the 7 category pages have 30–60-character descriptions. | crawl | Page-numbered descriptions; category descriptions built from the real category description and post count |
| 12 | S2 | **Generic social image** on 45 of 66 indexable pages, although city covers, guide covers and page banners exist. | `og:image` | Use the page's own cover image when one exists |
| 13 | S3 | `/photo-credits` is indexable but absent from the sitemap. It is a utility page with no search value. | crawl | `noindex, follow` |
| 14 | S3 | Paginated pages (`?page=2+`) are indexable with a self canonical and are not in the sitemap. | crawl | Correct by design (no change). Kept out of sitemaps intentionally |
| 15 | S3 | The HTTP→HTTPS redirect is not visible in code (Cloudflare zone setting). | — | Add a check to the deploy smoke test |
| 16 | S3 | `<meta name="keywords">` is emitted; Google ignores it. | BaseLayout | Harmless. Left as is |
| 17 | Business | **Production has 0 vehicles and 0 active dealers.** Commercial pages (vehicle and landing results) have nothing to rank for "used cars for sale" queries until inventory exists. | D1 | Owner action: onboard dealers |

## Summary
- **S0:** 0
- **S1:** 3 (#2, #3, #4), all fixed in this pass
- **S2:** 8 (#5–#12), all fixed
- **S3:** 4 (#13 fixed, #15 added to smoke test, #14 and #16 intentionally unchanged)
