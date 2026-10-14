# Fountain Finances — Admin & Content Management

All site content is stored as typed files in this repository and validated at build time by the Zod schemas in `src/content.config.ts`. An entry that is missing a required field, exceeds a length limit or references an unknown author **fails the build**, so errors never reach production. Changes go through pull requests, and CI runs unit tests, type checks, the site audit (`qa.mjs`), browser tests and a full-page sweep before anything is deployed.

Only people with write access to the repository (and, for data, access to the Cloudflare account) can change the site. Protect `main` with required reviews and the **FountainFinances.com** status check.

---

## Articles (guides)

File: `src/content/guides/<slug>.md` → published at `/guides/<slug>/`.

Required front matter (see existing guides for full examples):

| Field | Notes |
|---|---|
| `title` | On-page H1 |
| `seoTitle` | ≤ 62 characters, includes the target keyword |
| `description` | 110–160 characters (meta description) |
| `keywords` | Primary keyword first, then long-tail variants |
| `hub` | `personal-finance` · `credit` · `banking` · `loans` · `mortgage` · `insurance` |
| `topics` | Topic slugs this guide belongs to (drives topic-page listings) |
| `published`, `updated` | ISO dates. Change `updated` only for substantive edits |
| `author`, `reviewer` | IDs from `src/data/authors.json` (`reviewer` optional) |
| `quickAnswer` | 40–60 word direct answer (featured-snippet target) |
| `takeaways` | 3+ bullet points |
| `faqs` | 3+ `{ q, a }` — markdown links allowed in answers; rendered as FAQPage schema |
| `sources` | 2+ `{ title, publisher, url }` — primary sources (CFPB, FDIC, Fed, IRS, ED, official docs) |
| `howTo` | Optional steps → HowTo schema and anchored step list |
| `related`, `calculators`, `comparisons` | Slugs for internal linking blocks |
| `draft` | `true` hides the guide everywhere |

Body rules: start with a 2–3 sentence introduction, use `##`/`###` only (never skip levels), link to the hub, the homepage pillar (`/#personal-finance-guide`) and 2+ related guides/calculators with descriptive anchor text, and verify every number with `src/lib/finance.ts` (`node -e "import('./src/lib/finance.ts').then(f => ...)"`).

## Topics and hubs

- Topic pages: `src/content/topics/<slug>.md` → `/<slug>/`. Front matter includes `hub`, `order`, `summary`, `faqs`, `calculators`, `comparisons`, `guides`.
- Hub pages: `src/content/hubs/<hub>.md` (body + `faqs` + `featuredGuides`). Hub names, SEO titles and descriptions live in `src/data/taxonomy.ts`.

## Authors and reviewers

`src/data/authors.json`. Add real people only, with accurate credentials and public profile links (`sameAs`). A new author automatically gets a profile page at `/authors/<id>/` and Person schema. Assign reviewers to YMYL guides with the `reviewer` field.

## Financial products

`src/data/products.json` — one object per product:

```json
{
  "id": "provider-product",
  "category": "savings | checking | cd | starter-cards | balance-transfer | personal-loans",
  "provider": "Bank name",
  "product": "Product name",
  "officialUrl": "https://provider.example/product",
  "affiliateUrl": "https://network.example/track?id=…",
  "insured": "FDIC | NCUA | none | n/a",
  "type": "Online high-yield savings",
  "bestFor": "Who it suits",
  "features": ["…", "…"],
  "pros": ["…"],
  "cons": ["…"],
  "considerations": "…",
  "requirements": "…",
  "rate":    { "value": "4.10% APY", "asOf": "2026-10-01", "sourceUrl": "https://provider.example/rates" },
  "fees":    { "value": "$0 monthly fee", "asOf": "2026-10-01", "sourceUrl": "https://provider.example/fees" },
  "minimum": { "value": "$0 to open", "asOf": "2026-10-01", "sourceUrl": "https://provider.example/terms" },
  "active": true
}
```

Rules:

1. **Never enter a rate, fee or minimum you have not personally confirmed on the provider’s own page.** Record the date and the exact URL. The page shows the value with “as of <date>”.
2. Re-verify every recorded value at least monthly (see refresh schedule). Remove the object key if you can’t re-verify it — the card falls back to “check today’s rate”.
3. Set `"active": false` to hide a discontinued product without deleting its history.
4. A comparison page needs at least 3 active products in its category (enforced at build time).

## Affiliate links

1. Sign the agreement with the provider or network.
2. Add `affiliateUrl` to the product. The button automatically switches to the affiliate URL, gains `rel="sponsored noopener"`, the “Affiliate link” label and the “Affiliate” badge.
3. List the provider under “Current relationships” in `src/pages/affiliate-disclosure.astro`.
4. Do not change a product’s description, order or pros/cons because of a commercial relationship.

## Comparison pages

`src/content/comparisons/<slug>.md` → `/best/<slug>/`. Front matter: `category` (matches products), `intro`, `criteria` (methodology shown on the page), `faqs`, `sources`, `related`, `calculators`. Products render automatically, alphabetically.

## Calculators

Math lives in `src/lib/finance.ts` (add a unit test in `tests/unit/finance.test.ts` for every change). Metadata (name, SEO title, description, keywords, hub) lives in `src/data/calculators.ts`. Each page is `src/pages/calculators/<slug>.astro`; default input values are set via the `value` prop of each `<Field>`.

## SEO metadata

- Guides/topics/comparisons: front matter (`seoTitle`, `description`, `keywords`).
- Calculators: `src/data/calculators.ts`.
- Static pages: props passed to `PageLayout`/`BaseLayout`.
- Site-wide organization data, email and social profiles: `src/data/site.ts`.

## Disclosures

- Footer disclaimer: `src/components/Footer.astro`
- Editorial / comparison / calculator notes: `src/components/Disclosure.astro`
- Full pages: `src/pages/{disclaimer,affiliate-disclosure,editorial-standards,corrections}.astro`

## Newsletter subscribers and contact messages (D1)

```bash
# Confirmed subscribers (export for your email tool)
npx wrangler d1 execute fountainfinances-db --remote --command \
  "SELECT email, confirmed_at FROM subscribers WHERE status = 'confirmed' ORDER BY confirmed_at"

# Suppression list (never email these)
npx wrangler d1 execute fountainfinances-db --remote --command \
  "SELECT email, unsubscribed_at FROM subscribers WHERE status = 'unsubscribed'"

# New contact messages
npx wrangler d1 execute fountainfinances-db --remote --command \
  "SELECT id, created_at, name, email, topic, message FROM contact_messages WHERE status = 'new' ORDER BY id"

# Mark a message answered
npx wrangler d1 execute fountainfinances-db --remote --command \
  "UPDATE contact_messages SET status = 'answered' WHERE id = 42"

# Privacy request: delete a person's data
npx wrangler d1 execute fountainfinances-db --remote --command \
  "DELETE FROM contact_messages WHERE email = 'person@example.com'; UPDATE subscribers SET status = 'unsubscribed', confirm_hash = NULL WHERE email = 'person@example.com'"
```

Every newsletter you send must include the subscriber’s one-click unsubscribe link (`/api/unsubscribe?token=…`) and a `List-Unsubscribe` header, plus your postal address as required by CAN-SPAM.

## Optional: visual editor

If non-technical editors join, attach a Git-based CMS (for example Decap CMS or TinaCMS) pointed at `src/content/**` and `src/data/*.json`, authenticated through GitHub OAuth. Because the Zod schemas already define every field, the CMS configuration is a direct mapping — and CI still validates every save before it can be deployed. Do not expose an admin UI until its authentication is configured end to end.

## Content refresh schedule

| Content | Frequency |
|---|---|
| Verified rates/fees in `products.json` | Monthly, and on any provider announcement |
| Comparison pages | Monthly review |
| Guides citing limits, thresholds or regulations (student loans, PMI, tax) | At least annually and when rules change |
| Evergreen guides | Every 6–12 months |
| External links | Quarterly: `npm run qa:external` |
| Full SEO audit (rankings, CTR, Core Web Vitals, gaps) | Quarterly |
