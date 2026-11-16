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
