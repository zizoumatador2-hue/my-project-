# DistritoGamer

Static gaming tips, guides and settings site for **distritogamer.com** — Astro 5, no client framework, ~4.6 KB of JavaScript.
It lives in this folder; the rest of the repository is an unrelated project.

```bash
cd distritogamer
npm ci
npm run dev        # http://localhost:4321
npm run build      # astro build + scripts/check-site.mjs (the quality gate)
npm run preview
```

## What is in the site

| Area | Where |
|---|---|
| Homepage + 8,000-word pillar guide ("gaming tips") | `src/pages/index.astro`, `src/content/pillar/gaming-tips.md` |
| 24 cluster articles (1,500+ words each) | `src/content/articles/*.md` |
| Game profile pages (add a game = add a JSON file) | `src/content/games/*.json` |
| Affiliate product cards | `src/content/products/*.json` |
| Authors | `src/content/authors/*.json` |
| Categories, nav | `src/data/categories.ts`, `src/components/Header.astro` |
| Trust pages: About, Contact, Privacy, Terms, Affiliate Disclosure, Editorial Policy, FAQ | `src/pages/*.astro` |
| Search (client-side, `/search-index.json` built at compile time) | `src/pages/search.astro` |
| Sitemap, robots, RSS | `@astrojs/sitemap`, `src/pages/robots.txt.ts`, `src/pages/rss.xml.ts` |

URLs are `/{category}/{article-slug}/`, e.g. `/gaming-performance/how-to-increase-fps-on-pc/`.

## Adding content

**New article** — create `src/content/articles/<slug>.md`. Required frontmatter is validated at build (`src/content.config.ts`):
`title`, `description` (80–160 chars), `category`, `published`, `quickAnswer` (the 40–60 word direct answer), `imageAlt`.
Optional: `seoTitle` (≤60), `updated` (change only on substantive edits), `tags`, `keywords`, `related`, `game`, `products`,
`hasAffiliate`, `faq` (emits FAQPage schema), `howTo` (emits HowTo schema), `sources`, `featured`, `popular`, `sponsor`.
Write `> **Tip:** ...`, `> **Important:** ...`, `> **Note:** ...` or `> **Warning:** ...` for callout boxes. Tables are made scrollable automatically.

**Cover image** — drop `src/assets/articles/<slug>.jpg` (16:9, ≥1600 px). `scripts/make-art.mjs` generates the original illustrations used today.
To use licensed photos instead, see *Images* below.

**New game** — add `src/content/games/<slug>.json` (see the existing ones) and tag articles with `game: <slug>`.
Games with no guides are intentionally not included: a profile page is only worth publishing when there is real content behind it.

**New category** — add it to `src/data/categories.ts` and to the `categorySlugs` list in `src/content.config.ts`.
A category with no articles is rendered `noindex` and kept out of the sitemap (that is how *Gaming News* ships).

## Affiliate links (nothing is invented)

Products in `src/content/products/` ship with `"affiliateUrl": "AFFILIATE_LINK_PLACEHOLDER"`. While that value is present the card renders
**without a button**, so there is never a dead link or visible placeholder. Replace it with your real `https://` tracking link and the
"Check price" button appears (`rel="sponsored nofollow noopener"`, with an affiliate-disclosure note already shown above the card).
The product entries are *types of gear with what-to-check lists*, not specific models, because no hands-on testing or verified specs/prices exist yet.
Add real models only with facts you can verify, and do not state a test unless it happened.

## Configuration (environment variables)

Copy `.env.example` to `.env`. Everything is optional; nothing third-party loads unless configured **and** the visitor accepts the cookie notice.

- `PUBLIC_SITE_URL` canonical/sitemap origin · `PUBLIC_CONTACT_EMAIL` shown in Contact/Privacy/Terms (defaults to `contact@distritogamer.com`, make sure that mailbox exists)
- `PUBLIC_CONTACT_ENDPOINT` / `PUBLIC_NEWSLETTER_ENDPOINT` form-handling URLs (Formspree, Buttondown, etc.). Without them the contact form and newsletter button open the visitor's email app (`mailto:`)
- `PUBLIC_ADSENSE_CLIENT` (`ca-pub-…`) and per-article ad slots via `<AdSlot slot="…">` · `PUBLIC_GA4_ID`
- `PUBLIC_GSC_VERIFICATION`, `PUBLIC_BING_VERIFICATION`, `PUBLIC_SOCIAL_*` (real profiles only)

No secrets are committed or needed at build time.

## Performance and SEO design decisions

- Fonts: Inter + Space Grotesk, self-hosted WOFF2 in `public/fonts/`, preloaded, `font-display: swap`. No external font CDN.
- Critical CSS is inlined from `src/styles/critical.css` (`<style is:inline>`); `public/global.css?v=N` loads non-blocking with a `<noscript>` fallback. **Bump `assetVersion` in `src/config/site.ts` whenever `global.css` changes.**
- Prefetch disabled; only two small JS files ship (menu/reveals/consent, and search on `/search/`).
- Images: Astro `<Picture>` → AVIF/WebP/JPG, `srcset`/`sizes`, lazy below the fold, explicit dimensions.
- `public/_headers`: `/_astro/*`, `/fonts/*`, `global.css` immutable for a year; HTML `no-cache`; everything else 1 hour. (Cloudflare reads this file.)
- JSON-LD: Organization + WebSite (home), Article (+ FAQPage / HowTo when provided), BreadcrumbList, CollectionPage, ProfilePage.
- "React Bits" inspired effects (scroll reveals, spotlight cards, aurora hero, shine text) are implemented in ~1 KB of vanilla JS + CSS instead of
  shipping React, to protect Core Web Vitals. All motion respects `prefers-reduced-motion`.

## Quality gate

`npm run build` fails on: broken internal links/anchors/assets, missing/duplicate titles and descriptions, description > 160 chars, wrong canonicals,
missing OG/Twitter tags, invalid JSON-LD, heading-order violations or multiple h1s, images without alt, unlabeled landmarks/forms/links,
`role="complementary"` on `<aside>`, lorem/TODO/placeholder text in output, sitemap/robots problems, and a homepage under 8,000 words.
It warns on titles > 60 chars and thin articles. Run `node scripts/check-external.mjs` (needs internet) for external links.

Verified at handover (local preview): axe-core WCAG 2.1 A/AA + best-practice = 0 violations on 18 pages at desktop and 390 px;
Lighthouse mobile and desktop = 100 / 100 / 100 / 100 (performance, accessibility, best practices, SEO), LCP 1.7 s on simulated slow mobile.

## Images

The site currently ships **original generated illustrations** (`scripts/make-art.mjs`), not stock photos.
To switch to Pexels photos (a person must approve each one so it matches the topic and stays advertiser-friendly):

```bash
PEXELS_API_KEY=... node scripts/fetch-pexels.mjs search     # candidates -> photo-candidates/index.html
node scripts/fetch-pexels.mjs pick <article-slug> <n>        # promote one; credit is stored and displayed
```
Then update that article's `imageAlt` to describe the photo.

## Deploy (Cloudflare Workers static assets)

`wrangler.jsonc` serves `dist/`. Either run `npx wrangler deploy` locally, or use the **DistritoGamer site** GitHub Action
(*Run workflow → deploy*), which uses the repository's existing `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`.
Then add `distritogamer.com` under *Workers & Pages → distritogamer → Domains & Routes*.

After launch: submit `https://distritogamer.com/sitemap-index.xml` in Google Search Console and Bing Webmaster Tools, set the verification env vars,
and enable GA4/AdSense only when ready.

## Before applying to AdSense — things only you can supply

1. A working mailbox for `PUBLIC_CONTACT_EMAIL` and, ideally, the legal name/address of the site operator in the Privacy Policy and Terms
   (we did not invent one). Have the Terms reviewed for your jurisdiction (no governing law is stated).
2. Real social profiles (if any) via `PUBLIC_SOCIAL_*`.
3. Real affiliate links, only for products you actually recommend.
4. Keep publishing: the editorial policy promises 6–12 month reviews of evergreen guides.
