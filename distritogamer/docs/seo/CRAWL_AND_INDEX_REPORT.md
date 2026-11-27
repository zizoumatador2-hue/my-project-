# Crawl and index report

Method: build output inspected, sitemap and robots reviewed, HTML of every page checked by the site check (`npm run build`), live status from a GitHub-hosted runner.

## Findings

| ID | Severity | Finding | Status |
|---|---|---|---|
| C1 | S1 | Site is new; Search Console shows 0 indexed pages of 47 submitted | Sitemap submitted 2026-11-27. Waiting for Google. Nothing to fix technically. |
| C2 | S2 | Search and noindex pages were correctly excluded from sitemap | OK |
| C3 | S2 | AdSense loader was only on pages with ads | Fixed: loader and meta tag now on every page |
| C4 | S3 | `/gaming-news/` is an empty category | Kept noindex; will index when real news exists |
| C5 | S3 | Thin category pages (e.g. Gaming Gear with few articles) | Monitor; add articles only with real value |
| C6 | S2 | Canonical host not confirmed (apex vs www) | Both resolve; decide one canonical host in Cloudflare |

## Checks passed
- Every page has one H1, valid JSON-LD, canonical, meta description (80–160 chars), Open Graph and Twitter tags.
- No broken internal links or missing assets across the 50 pages.
- No private or checkout routes exist, so none can leak into the index.
- Live: `https://distritogamer.com/` returns 200 from GitHub's network (checked 2026-10-06, before the AdSense change).

## Not yet verified
- Live headers after the latest deploy (run 6 succeeded). Check `https://distritogamer.com/ads.txt` and the AdSense meta tag from a normal browser.
