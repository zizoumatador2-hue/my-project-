# Search architecture map: distritogamer.com

1. **Purpose:** free, practical gaming tips, guides, settings, performance and troubleshooting. Monetized through affiliate links (only where relevant) and ads.
2. **Primary audience:** English-speaking gamers, mainly in the US, on PC and consoles.
3. **Primary conversion:** reading a guide that answers the query; secondary: newsletter, affiliate click, search use.
4. **Public routes (~50 built):** home; 9 category index pages; 24 articles under `/{category}/{slug}/`; 3 game profiles; game and author index pages; About, Contact, Privacy, Terms, Affiliate Disclosure, Editorial Policy, FAQ, All guides, Search, Gaming News (empty, intentionally noindex).
5. **Indexable:** home, 9 categories, 24 articles, 3 game profiles, authors, About, Editorial Policy, Affiliate Disclosure, Privacy, Terms, Contact, FAQ, All guides, Games index.
6. **Non-indexable:** `/search/` (noindex, excluded from the sitemap), `/404/` (noindex), `/gaming-news/` (noindex, excluded from the sitemap until there is real news).
7. **Rendering:** fully static (Astro `output: static`). All critical content, H1, metadata, canonical and JSON-LD are present in the HTML. Only two small scripts run on the client: menu/reveals/consent, and search on `/search/`.
8. **Content sources:** Markdown articles (`src/content/articles`), JSON for games, products and authors, and a Markdown pillar page. Everything is validated by a schema at build time.
9. **Metadata:** `BaseLayout` builds title, description, canonical, robots, Open Graph, Twitter and article dates for every page. Descriptions are checked to be 80–160 characters.
10. **Structured data:** Organization and WebSite on home; Article (with FAQPage and HowTo only when the article has real visible FAQ or steps); BreadcrumbList on inner pages; CollectionPage on categories; ProfilePage on authors; WebPage with VideoGame "about" on game profiles.
11. **Crawl controls:** `robots.txt` allows all and points to the sitemap index; sitemap lists 47 canonical pages; `ads.txt` is served; no `X-Robots-Tag` headers are set, which is fine because meta robots is used.
12. **Major SEO risks (current):**
    - New domain. 0 pages indexed in Search Console at launch. This is the main constraint, not technical errors.
    - Thin topical signals: 24 articles across 9 categories; several categories hold only 1–3 articles.
    - Duplicate-looking intent: "beginner" content exists in two places (`gaming-tips-for-beginners` and `common-mistakes-new-players-make`). They target different intents, so both are kept.
    - No Pinterest, social or backlink presence yet, so discovery depends entirely on Google crawling.
    - Ads and affiliate content were added before any traffic exists. AdSense may review the site with little content history.
