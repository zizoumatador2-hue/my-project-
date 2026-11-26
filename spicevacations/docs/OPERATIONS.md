# SpiceVacations operations log

Weekly maintenance entries (newest last). No secrets.

## 2026-11-16 — weekly run (ISO week 47, cohort 3/5)

**Live checks**
- sitemap-0.xml: 102 URLs, all returned 200.
- /ads.txt contains `google.com, pub-8532224804732263, DIRECT, f08c47fec0942fa0`.
- /robots.txt has `Sitemap: https://spicevacations.com/sitemap-index.xml` (sitemap-index.xml returns 200 `application/xml`, including with a Googlebot user agent).

**Cohort reviewed (20 pages + 1 related page)**
- Changed: /destinations/jamaica/ (Hurricane Melissa recovery section + FAQ; Sandals Montego Bay reopening date), /guides/caribbean-vacations-for-couples/ (Jamaica recovery note), /resorts/sandals-montego-bay/ (related page outside the cohort: closed since Melissa, scheduled reopening Dec 18, 2026 per Sandals).
- Reviewed; no change needed: /destinations/hawaii/, /destinations/las-vegas/, /deals/florida-keys-late-spring/, /deals/hawaii-fall-shoulder-season/, /guides/best-beach-vacations-in-the-usa/, /guides/hawaii-couples-vacation/, /guides/how-to-find-vacation-deals/, /guides/miami-romantic-getaways/, /resorts/bellagio/, /resorts/breathless-cabo-san-lucas/, /resorts/couples-negril/ (reopened Dec 1, 2025 per Couples Resorts reports), /resorts/excellence-playa-mujeres/, /resorts/four-seasons-maui-wailea/, /resorts/hotel-xcaret-arte/, /resorts/jade-mountain/, /resorts/sandals-royal-bahamian/, /resorts/the-breakers-palm-beach/, /vacation-types/all-inclusive-resorts/.
- No sexually suggestive wording found in the cohort.
- Minor wording to fix in a later run: the Hawaii fall deal says "Haleakala sunrise permits"; the NPS calls them vehicle reservations.

**New content:** deferred. The real gaps are destination pages for St. Lucia, Turks and Caicos and Aruba, which are linked from guides but have no hub page. Each needs a full, sourced page, which did not fit this run's budget. Proposed for a future run.

**Tests:** npm ci, check (0 errors), test (20/20), build (astro OK); postbuild (110 pages OK) and audit:seo (passed) were run under WSL because those scripts build paths with `URL.pathname`, which breaks on Windows.

**Accounts (read-only, 2026-11-16)**
- AdSense Sites: spicevacations.com status "يتم تجهيزه" (Getting ready), ads.txt "معتمَد" (Authorized), last change Nov 15, 2026. It no longer shows the sexual-content flag, so no review was requested.
- Search Console: Manual actions — no issues detected; Security issues — no issues detected; Page indexing — 53 indexed, 26 not indexed (13 blocked by robots.txt, 7 noindex, 3 alternate canonical, 2 redirect, 1 crawled-not-indexed); Sitemaps — sitemap-index.xml "Couldn't fetch" (last read Nov 15, 2026), even though it serves 200 live. Watch next week; resubmit if it persists. Last 28 days (Oct 18–Nov 14): 1 click, 181 impressions, 0.6% CTR, average position 78.4.

**Deploy:** this entry ships in the same commit as the content changes; see the SpiceVacations workflow run for that commit.

## Verified identity
- Domain: https://spicevacations.com (Cloudflare Worker `spicevacations`, static assets + `/api/*`, `/go/*`).
- Repo: `zizoumatador2-hue/my-project-`, production branch `claude/spicevacations-astro-seo-5avt34`. Every push to it deploys through the **SpiceVacations** GitHub Actions workflow. `main` does not contain the site.
- CMS: Decap at `/admin/`, editorial workflow (drafts open pull requests against the production branch; publishing = merge = deploy).
- AdSense: `bouloudninezakaria@gmail.com`, `pub-8532224804732263`. Search Console: `sc-domain:spicevacations.com`.

## Page counting rule (inventory 2026-11-22)
- Source: live `sitemap-0.xml` = 102 URLs.
- Excluded: 9 legal/info pages (about, contact, privacy-policy, terms, cookie-policy, affiliate-disclosure, editorial-policy, photo-credits, faq) and 5 section index pages (destinations, resorts, guides, deals, vacation-types).
- Eligible denominator: **88** (29 guides, 30 resorts, 12 destinations, 9 vacation types, 6 deals, home, planner).
- Rounding: nearest whole page. First batch 10% = **9**. Weekly 5% = **4**. Fewer when evidence does not support changes.

## 2026-11-22 — Batch 1 (9 pages, 10.2%)
Evidence: Search Console, all countries, 28 days to 2026-11-15 (US filter not captured; Chrome disconnected on 2026-11-22). Totals 1 click / 176 impressions / avg position 79.1. Queries with impressions and no clicks: "vacations for couples" (11), "anniversary vacation packages" (9), "romantic tropical getaways" (7), "4 day getaway packages for couples" (5), "couples vacation package" (4). Selection is therefore a hypothesis, not US-verified.

| Page | Primary query | Before | Change |
| --- | --- | --- | --- |
| /vacation-types/couples-vacations/ | vacations for couples | 336 words | Title/description; trip-length table, planning checklist, what to reserve ahead |
| /vacation-types/romantic-getaways/ | romantic tropical getaways | 500 words | Title/description; tropical-by-month table, no-passport options |
| /vacation-types/weekend-getaways/ | 4 day getaway packages for couples | 420 words | Title/description; short-trip rules, 3–4 day section |
| /vacation-types/honeymoon-vacations/ | anniversary vacation packages | 301 words | Title/description; planning timeline, honeymoon vs. anniversary; new hero image (no bed) |
| /vacation-types/adults-only-resorts/ | (template reach) | 272 words | Title/description; questions to ask before booking |
| /vacation-types/all-inclusive-resorts/ | (template reach) | 309 words | Title/description; worth-it table, inclusions |
| /vacation-types/beach-vacations/ | (template reach) | 400 words | Title/description; water, sargassum, storm season |
| /vacation-types/luxury-vacations/ | (template reach) | 377 words | Title/description; value tips |
| /vacation-types/cruise-vacations/ | (template reach) | 321 words | Title/description; short cruises from Florida; first hero image |

Facts used are stable and general: Atlantic hurricane season June 1–November 30 (NOAA), no passport needed for U.S. citizens to Hawaii, Puerto Rico and USVI (U.S. territories), closed-loop cruise document rule (U.S. CBP / State Department guidance). No prices published.

Shared changes (reach beyond the 9 pages):
- `/sitemap.xml` generated in postbuild from the Astro sitemap, validated (built page exists, not noindex, self-canonical); `robots.txt` lists it.
- CMS: backend branch fixed from `main` (no site files) to the production branch; GitHub OAuth via Worker `/api/auth` + `/api/callback`; new "Weekly review & search status" section (review queue + Google/Bing status).
- 2 new AI images (fal-ai/flux/schnell, ~2 MP each, about $0.006).

Rollback: production is at `b19c0da`. Revert the batch commit(s) on the production branch, or redeploy `b19c0da`.
