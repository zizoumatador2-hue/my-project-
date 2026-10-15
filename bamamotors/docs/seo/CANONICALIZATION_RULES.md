# Canonicalization Rules — BamaMotors.com

Canonical host: **`https://bamamotors.com`**, taken from `SITE_URL`. Every canonical is absolute and built by `absolute(site, path)` in `src/lib/seo.ts`, through `BaseLayout`.

| Duplicate source | Rule | Where enforced |
|---|---|---|
| `www.bamamotors.com`, `*.workers.dev`, extra domains (e.g. `bamamoutours.com` once attached) | 301 to `https://bamamotors.com` + same path and query (GET/HEAD) | `src/middleware.ts` (production only) |
| HTTP | 301 to HTTPS via Cloudflare zone; HSTS on every HTTPS response | Cloudflare + middleware; checked by the deploy smoke test |
| Trailing slash | 301 to the slash-less path (`trailingSlash: 'never'`) | middleware |
| Uppercase path | 301 to the lowercase path. Excludes `/media`, `/_astro`, `/fonts`, `/images` and file names, which are case-sensitive | middleware |
| Tracking parameters (`utm_*`, `gclid`, `fbclid`, …) | Ignored: the canonical is the path without the query | `BaseLayout` default canonical = `Astro.url.pathname` |
| Sort order (`?sort=`) | `noindex, follow` + canonical to the unsorted page; robots.txt disallows `/*?*sort=` | `used-cars/index.astro`, `LandingPage.astro`, `robots.txt.ts` |
| Filters on `/used-cars` and `/dealers` | `noindex, follow` + canonical to the base path. The indexable versions of popular filters are the clean landing URLs (`/used-cars/birmingham-al`, `/used-cars/trucks`, …) | `used-cars/index.astro`, `dealers/index.astro` |
| Pagination `?page=N` | **Self-referencing canonical** (`/blog?page=2` → itself). Pages are not canonicalized to page 1 because they list different items. `rel=prev/next` is emitted. Out-of-range pages return **404**. Not listed in sitemaps | blog, category, landing, dealer pages |
| Invalid `?page=abc` | Treated as page 1; canonical to the base path | `Number(...) || 1` |
| Landing page vs. equivalent search filter (`/used-cars?city=birmingham-al`) | The filter URL is noindexed and canonicalizes to `/used-cars`; the clean landing URL is the indexable version | — |
| Vehicle slug changes | Slugs are immutable after creation (`vehicle-save.ts`), and duplicates get a numeric suffix (`-2`, `-3`). A deleted or archived vehicle returns 404 and is never redirected to the homepage | `vehicle-save.ts`, `vehicles/[slug].astro` |
| Sold vehicle | 200 + `noindex, follow`, self canonical; the page stays useful (similar vehicles, link to the model page) | `vehicles/[slug].astro` |
| Blog post slug | Immutable in the CMS after publishing. A missing slug returns 404 | `post-save.ts` |
| Error pages | 404 status, `noindex`, **no canonical and no og:url** | `404.astro` (`canonical={null}`) |
| Locales | Not applicable: single locale, en-US | — |

## Never do
- Canonicalize page 2+ to page 1, or a filtered landing page to the homepage.
- Redirect missing content to the homepage. Return 404.
- Point a canonical at a URL that is noindex, redirects or returns non-200. The integration test `canonical points to` enforces self-canonicals on indexable pages.
