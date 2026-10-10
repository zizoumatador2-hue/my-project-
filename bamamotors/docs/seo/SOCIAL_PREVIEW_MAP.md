# Social Preview Map — BamaMotors.com

Tags emitted by `BaseLayout` on every page:
- `og:site_name`, `og:locale=en_US`, `og:type`, `og:title`, `og:description`, `og:url` (the canonical; omitted on error pages), `og:image`
- `og:image:width` / `og:image:height` when the size is known
- `twitter:card=summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`
- `article:published_time` / `article:modified_time` on guides

| Page type | og:type | og:image (after this pass) | Size declared |
|---|---|---|---|
| Home | website | hero photo `/images/hero-1600.webp` (**new**) | 1600×900 |
| City landing | website | the city's real photo `/images/city-{slug}-1600.webp` (**new**) | 1600×900 |
| Body-type landing | website | body illustration `/images/body-{slug}-1600.webp` (**new**) | 1600×900 |
| Make, model and price landing | website | default card (no page-specific asset) | 1200×630 |
| Vehicle | product | first dealer photo `/media/{key}` (the default card if there are no photos) | not declared (varies) |
| Dealer | website | default card (logo-only assets are too small for large cards) | 1200×630 |
| Guide | article | guide cover `/images/post-{slug}-1600.webp` | 1600×900 |
| Blog index | website | `/images/post-default-1600.webp` (**new**) | 1600×900 |
| Category | website | cover of the newest guide in the category (**new**) | 1600×900 |
| Financing | website | `/images/page-financing-1600.webp` (**new**) | 1600×900 |
| For Dealers | website | `/images/page-for-dealers-1600.webp` (**new**) | 1600×900 |
| About, FAQ, legal, author | website | default card `/og-default.png` | 1200×630 |

Result: pages with a page-specific social image went from 21 of 66 indexable pages to every page type that has a real asset.

**Note:** WebP previews are supported by Facebook, LinkedIn, X, Slack, iMessage and WhatsApp. If a platform ever drops WebP support, add JPEG variants to the image pipeline. No change is needed now.
