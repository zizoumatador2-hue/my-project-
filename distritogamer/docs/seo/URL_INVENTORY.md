# URL inventory (built output, 2026-11-28)

| URL pattern | Type | Public | Indexable | Canonical | Language | Data source | Structured data | Status | Risk |
|---|---|---|---|---|---|---|---|---|---|
| `/` | Home | yes | yes | self | en-US | `index.astro` + pillar Markdown | Organization, WebSite, FAQPage | 200 | low |
| `/{category}/` (9) | Category index | yes | yes | self | en-US | `data/categories.ts` + articles | CollectionPage, Breadcrumb | 200 | medium: thin for some categories |
| `/gaming-news/` | Category, empty | yes | **no** (noindex) | self | en-US | `categories.ts` | Breadcrumb | 200 | low: intentional |
| `/{category}/{slug}/` (24) | Article | yes | yes | self | en-US | `content/articles/*.md` | Article, FAQPage/HowTo when present, Breadcrumb | 200 | low |
| `/games/` | Index | yes | yes | self | en-US | `content/games` | Breadcrumb | 200 | low |
| `/games/{slug}/` (3) | Game profile | yes | yes | self | en-US | `content/games/*.json` | WebPage + VideoGame about | 200 | medium: profile depends on linked articles |
| `/authors/editorial-team/` | Author | yes | yes | self | en-US | `content/authors` | ProfilePage | 200 | low |
| `/guides/` | All guides | yes | yes | self | en-US | articles | Breadcrumb | 200 | low |
| `/search/` | Search page | yes (for users) | **no** (noindex) | self | en-US | client-side index | Breadcrumb | 200 | low: excluded from sitemap |
| `/search-index.json` | Data for search | no | no | n/a | n/a | build | none | 200 | low |
| `/about/`, `/editorial-policy/`, `/affiliate-disclosure/`, `/privacy-policy/`, `/terms-of-use/`, `/contact/`, `/faq/` | Trust and legal | yes | yes | self | en-US | page files | AboutPage, FAQPage | 200 | low |
| `/rss.xml` | Feed | yes | n/a | n/a | en-US | articles | none | 200 | low |
| `/sitemap-index.xml`, `/sitemap-0.xml` | Sitemap | yes | n/a | n/a | en-US | build | none | 200 | low |
| `/robots.txt`, `/ads.txt`, `/_headers` | Crawl and ads files | yes | n/a | n/a | n/a | `public/` | none | 200 | low |
| `/404/` | Error page | no | **no** (noindex) | n/a | en-US | page file | none | 404 status for unknown URLs | low |
| Login, account, checkout, admin, API | — | none exist in this site | — | — | — | — | — | — | none |

Notes
- Query parameters: `/search/?q=` is noindex, so parameters create no indexable duplicates.
- Trailing slashes are enforced (`trailingSlash: 'always'`). Non-slash URLs redirect to slash URLs at the host level.
- Only one host is used: `distritogamer.com` (apex). `www` is attached to the same Worker; confirm the canonical host in Cloudflare later.
