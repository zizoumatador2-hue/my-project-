# MarketTriggers.com

Astro 5 static site — U.S. financial education. English, mobile-first, AdSense-ready.

## Run locally
    npm install
    npm run dev        # http://localhost:4321
    npm run build      # outputs to dist/

## Publish a new article (renewable content)
1. Copy `src/content/articles/_TEMPLATE.md` to a new file, e.g. `what-is-core-cpi.md`
   (the file name becomes the URL: /articles/what-is-core-cpi/).
2. Fill in the front matter, write the article, set `draft: false`.
3. Commit and push. Cloudflare Pages rebuilds automatically; the article appears on the
   homepage "Latest analysis", its category page, /articles/, the sitemap, and the RSS feed.

## Deploy on Cloudflare Pages
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variable: `NODE_VERSION = 22`
- Custom domain: Pages project → Custom domains → add `markettriggers.com` (and `www`).

## Before applying to AdSense
- Publish at least 15–20 full, original articles (category pages are thin until then).
- Replace the placeholder in `public/ads.txt` with your publisher ID after approval.
- Submit `https://markettriggers.com/sitemap-index.xml` in Google Search Console and Bing Webmaster Tools.

## Deploys (GitHub Actions → Cloudflare Pages)
- Push to `markettriggers-live` → production on markettriggers.com (attaches domain + DNS).
- Push to any other branch → preview on `<branch>.markettriggers.pages.dev`.
