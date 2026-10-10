# Product (Vehicle Listing) SEO Rules — BamaMotors.com

Products are dealer vehicle listings (`/vehicles/{slug}`). All content comes from the dealer's own data; nothing is scraped or generated.

| Situation | Status | Robots | Sitemap | Schema | User experience |
|---|---|---|---|---|---|
| Active, dealer active | 200 | index | yes, `lastmod = updated_at` | Product+Car, Offer `InStock` | full page, lead form |
| Active, dealer pending/suspended | 404 to the public (owner/admin can preview) | — | no | — | — |
| **Sold** (temporarily or permanently gone from the lot) | 200 | `noindex, follow` | no | Offer `SoldOut` | "This vehicle has been sold" banner + link to the same model's listings + similar vehicles |
| Draft | 404 to the public | — | no | — | — |
| Archived (permanently removed) | 404 | — | no | — | — |
| **Slug changed** (dealer edits year/make/model/trim; new in this pass) | old URL → **301** → current URL (one hop, via `slug_redirects.target_id`) | — | new URL only | — | links and indexed URLs keep working |
| Duplicate listing (same dealer + VIN) | blocked at save ("You already have an active listing with this VIN") | — | — | — | — |
| Same model listed twice (different VINs) | separate URLs with numeric suffix (`-2`) | index | yes | — | genuinely different products |

## Content rules
- **Title:** `{Year} {Make} {Model} for Sale in {City}, AL – {Price}`. The brand suffix is dropped when it would push the title past 60 characters.
- **Description (≤ 160 characters):** price, mileage, transmission, drivetrain and dealer, built from real fields.
- **Images:**
  - up to 30 dealer photos, resized in the browser, magic-byte validated, stored in R2
  - served with width and height; the first image is eager with `fetchpriority=high`
  - alt text: "{title} – photo N of M"
  - Product `image` is listed only when photos exist
- **Price:** dealer asking price in USD with an explicit note that tax, title and fees are extra. The payment calculator is labelled as an estimate.
- **Currency and availability:** always USD; availability is InStock or SoldOut only.
- **No ratings on products.** Dealer ratings stay on the dealer page.
- **Incomplete listings can't go live:** validation (`vehicleSchema`) requires year, make, model, price, mileage and body type, and drafts aren't public.

## Discontinued model / empty category
Make, model and body landing pages with no live inventory are `noindex, follow`, excluded from the sitemap and no longer linked from templates. They come back automatically when inventory appears.
