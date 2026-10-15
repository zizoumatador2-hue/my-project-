# Content (Guides) SEO Rules — BamaMotors.com

Content type: 20 original car-buying guides (`/blog/{slug}`), edited in `/admin/posts` and seeded from `content/posts/*.md`.

| Element | Rule | Implementation |
|---|---|---|
| Title (H1) | Descriptive, matches search intent, no clickbait | `title` |
| SEO title | ≤ 60 characters. Set only when the H1 is too long for search results (6 guides) | `seo_title` frontmatter → `meta_title`. The seed build fails if it is over 60 |
| Meta description | Written per guide, ≤ 160 characters | `meta_description`. The seed build fails if it is over 160 |
| Author | The real editorial byline "BamaMotors Editorial Team", which links to `/authors/bamamotors-editorial-team` (bio, methodology). **No invented people** | `users.author_*`; schema `author` is an Organization for the team |
| Published date | Set once, at first publish | `published_at` |
| Modified date | Changes **only** when the editor ticks "substantial update" in the CMS (or the status changes). Copy fixes and SEO-title edits do not move it | `post-save.ts` `bump` logic. The 0005 and 0006 refresh migrations also leave `updated_at` alone |
| Visible dates | "Published" + "Updated" (only when different) | post header |
| Featured image | 16:9 WebP at 640/1024/1600 widths with descriptive alt. Used in the page, `BlogPosting.image` and `og:image` | `src/lib/images.ts` |
| Structure | One H1. A bold **Quick answer** first paragraph. H2 sections, H3 only under H2 (tested: no skipped levels). An auto-generated table of contents from the H2s | `renderMarkdown()` |
| Schema | BlogPosting always; FAQPage/HowTo only when the editor wrote the FAQ/steps (visible on the page) | `blog/[slug].astro` |
| Sources | Official sources linked (ALDOR, NHTSA, NMVTIS, FTC, NOAA, AnnualCreditReport). External links get `rel="noopener"` | Markdown |
| Internal links | 2–3 links to related guides and the relevant city or body hub. Links to empty landing combinations resolve to the nearest indexable page | `resolveLandingLinks()` |
| Archives | `/blog` (paginated, self canonicals, out-of-range → 404), `/blog/category/{slug}` (CollectionPage, description from the real category + count), `/authors/{slug}` (ProfilePage) | — |
| Tags | Not used, so there are no thin tag archives | — |
| Drafts | 404 to the public; admins can preview | — |
| Slug changes | The old URL 301-redirects to the new one once a post has been published | `slug_redirects` |
| Thin or duplicate content | No auto-generated articles. Category pages with 0 posts are noindex | — |
| Freshness | Price and financing guides reviewed every 1–3 months, evergreen guides every 6–12 months (see README "Content freshness plan") | editorial process |
