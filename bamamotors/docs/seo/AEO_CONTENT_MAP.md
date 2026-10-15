# Answer-Engine (AEO) Content Map — BamaMotors.com

Goal: search engines and AI answer engines can quote a direct, true answer from visible page text. Every answer listed as present below is already on the page as visible text (FAQ blocks are rendered as `<details>` with the answer in the HTML, not loaded by script). Nothing in this table was invented. Missing facts are marked **owner input**.

| Page | Target question / intent | Current answer quality | Missing information | Recommended visible content | Data source | Owner input |
|---|---|---|---|---|---|---|
| `/` | What is BamaMotors? Is it free? Does it sell cars? Which cities? | **Strong.** H1 + lead, plus 6 direct FAQ answers (free for shoppers, doesn't sell cars, 12 cities, financing via dealers, how dealers list) | Who operates the site (legal entity) | One sentence in About naming the operating company | owner | **Yes:** legal business name |
| `/about` | Who is behind BamaMotors, and how does it make money? | Good: mission, how listings work, dealer-funded model, editorial independence | Company name, founding year, mailing address | "BamaMotors is operated by …" once confirmed | owner | **Yes** |
| `/contact` | How do I contact BamaMotors? | Form + email (info.christopherkunz@gmail.com) | Phone number and mailing address (optional, but trusted by users and AdSense reviewers) | Add them only if the owner provides real ones | owner | **Yes** |
| `/faq` | Prices, registration deadline, sales tax, inspections, privacy, test drives | **Strong:** 13 Q&As including Alabama-specific rules (20-day registration, 2% state sales tax + local, no statewide inspection), sourced to ALDOR | — | Keep reviewed every 6–12 months | guides | — |
| `/used-cars/{city}-al` | Used cars in {city}: where, what they cost, local tips | **Strong** where inventory exists: live count + price range snippet, price table, dealer list, 300+ words of city-specific editorial, city FAQ | When there is no inventory there are no price facts. That is correct: no numbers are shown without data | — | D1 | Inventory (dealer onboarding) |
| `/used-cars/{make}`, body and price pages | Are there used {X} for sale in Alabama, and what do they cost? | Snippet answers count and price range only when listings exist; otherwise the page is noindex (no thin answer) | — | — | D1 | Inventory |
| `/vehicles/{slug}` | Price, mileage, history, availability, out-the-door cost, who sells it | Good: specs table, dealer-disclosed history, availability statement with date, explicit "tax/title/fees extra", payment estimate labelled as an estimate | Out-the-door price | Dealers can add fees in the description | dealer | Dealers |
| `/dealers/{slug}` | Hours, address, phone, inventory, reviews | Good when the dealer completes their profile | Depends on the dealer's profile | Profile-completeness prompt in the dashboard (exists) | dealer | Dealers |
| `/financing` | Is BamaMotors a lender? Does an inquiry affect credit? Bad credit? What's needed? | **Strong:** direct answers, payment calculator labelled "estimate only, not a loan offer" | — | — | — | — |
| `/for-dealers` | What does it cost? Per-lead fees? Verification? Featured listings? | **Strong:** plan prices visible ($0 / $49 / $99), limits, no per-lead fees, verification process | — | — | `src/lib/plans.ts` | — |
| `/blog/{slug}` (20 guides) | "How to buy/finance/inspect…", "Alabama insurance minimums", "private sale paperwork" | **Strong:** every guide opens with a bold **Quick answer** paragraph, then numbered steps, cites ALDOR, NHTSA, NMVTIS, FTC and NOAA, and shows an updated date and editorial byline | — | Keep the Quick-answer pattern for new guides | Markdown | — |

## Language rules applied
- No unverifiable superlatives ("best-in-class", "revolutionary", "#1"). A scan in this pass found none in the public copy.
- Prices, counts and ranges appear only when computed from live data.
- Legal and tax facts link to the official source and carry an "updated" date.

## Owner input required (do not fill with placeholders)
1. Legal operating entity name, for About, Terms and Organization schema `legalName`.
2. Optional business phone and mailing address, for Contact (and Organization schema only if published).
3. Official social profile URLs (Admin → Settings), which become `sameAs`.
4. Dealer onboarding: commercial answers depend on real inventory.
