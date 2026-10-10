# International & Arabic SEO Map — BamaMotors.com

## Status: not applicable (single locale)
- **Audience:** car shoppers and dealers in Alabama, USA.
- **Site language:** English (United States) only.
  - `<html lang="en-US" dir="ltr">`, verified on every crawled page by a test.
  - `og:locale=en_US`; prices in USD; US date format ("October 9, 2026") and US number grouping.
- **No localized routes, no translated content, no language switcher, no geo/language redirects.** So:
  - **hreflang / x-default:** not emitted. Adding them for a single language would be wrong.
  - **Canonicals:** all point to the single English URL.
  - **Arabic (Phase 17):** the site contains **no Arabic public content**, so there are no RTL, Arabic metadata or Arabic typography concerns on public pages. The owner's Arabic communication happens outside the site. Arabic must not be added to the US site without a real Arabic-speaking audience in Alabama and a full translation (not machine output).

## If a second language is ever added
1. Use locale-prefixed routes (`/es/…` or `/ar/…`). Never switch content client-side on one URL.
2. Each locale page gets a self-referencing canonical, reciprocal `hreflang` for every variant, and an `x-default` pointing to the English page.
3. Set `lang` and `dir` per page (`ar` → `dir="rtl"`), plus localized titles, descriptions and `og:locale` / `og:locale:alternate`.
4. No forced redirects by IP or `Accept-Language`. Offer a visible language link instead.
5. Arabic copy: written by a native editor, no letter-spacing, mixed-direction strings (prices, VINs, model names) wrapped in `<bdi>`.
6. Add the locale variants to the sitemaps with `xhtml:link` alternates.
