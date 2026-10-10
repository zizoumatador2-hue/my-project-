# Sitemap Specification — BamaMotors.com

## Structure
```
/sitemap.xml                 sitemap index (no lastmod; children carry real dates)
├── /sitemap-pages.xml       static pages + indexable landing pages
├── /sitemap-vehicles.xml    active vehicles of active dealers
├── /sitemap-dealers.xml     active dealer profiles
└── /sitemap-blog.xml        /blog, published guides, categories with posts, author pages
```
All are generated per request from D1 (`src/pages/sitemap*.xml.ts`, `src/lib/sitemap.ts`) and cached for 1 hour. robots.txt references `/sitemap.xml` (production only).

## Inclusion rules (only canonical, indexable, 200, public URLs)
| Sitemap | Included | lastmod |
|---|---|---|
| pages | `/`, `/used-cars`, `/dealers`, `/financing`, `/for-dealers`, `/blog`, `/about`, `/how-it-works`, `/faq`, `/contact`, `/privacy`, `/terms`, `/disclaimer`, `/editorial-policy`; **all 12 city pages** (unique editorial); body, price, make, model and city×body landing pages **only with live inventory** | cities: `cities.updated_at`; static pages: none (no reliable source) |
| vehicles | `vehicles.status = 'active'` AND `dealers.status = 'active'` | `vehicles.updated_at` |
| dealers | `dealers.status = 'active'` | `dealers.updated_at` |
| blog | published posts, categories with ≥ 1 post, author pages | posts: `updated_at` (changes only on a "substantial update" in the CMS) |

## Excluded
Redirects; 404s; sold, draft and archived vehicles; pending and suspended dealers; drafts; `/admin`, `/dashboard`, `/account`, `/api`; auth pages; filtered or sorted URLs; `?page=N`; empty landing combinations; `/photo-credits` (noindex); `/ads.txt`, `/robots.txt`.

## No fake signals
- `<changefreq>` and `<priority>` are not emitted.
- `lastmod` comes only from real timestamps. The index file has no lastmod because a fake "today" was removed in this pass.

## Single source of truth
`landingEntries()` decides which landing pages are indexable. The same set (`indexableLandingPaths()`, cached 60 s) drives the template links and `resolveLandingLinks()`, so the sitemap, internal links and robots meta can't disagree.

## Scale
50,000 URLs and 50 MB per file is the protocol limit. When `/sitemap-vehicles.xml` approaches about 40,000 entries, split it by ID range (`/sitemap-vehicles-1.xml` …) and list the parts in the index.

## Validation
`tests/integration/seo.test.ts` fetches every URL in every child sitemap. It fails on any non-200 response or `noindex` page, and on a `lastmod` in the index.
