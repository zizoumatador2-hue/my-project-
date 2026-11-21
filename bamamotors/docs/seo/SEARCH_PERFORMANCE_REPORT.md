# Search Performance Report — BamaMotors.com

Measured on the production Worker bundle (local `wrangler dev`). Field Core Web Vitals (CrUX) data is not yet available for a new domain, so check Search Console → Core Web Vitals after about 28 days of traffic.

## Measurements
| Page | HTML (gzip) | Server time (local) | Client JS modules | LCP candidate |
|---|---|---|---|---|
| `/` | 17.4 KB | 43 ms | 2 small modules | hero photo (eager, `fetchpriority=high`, srcset 640/1024/1600: 31/70/140 KB) or the H1 |
| `/used-cars` | 13.2 KB | 21 ms | 2 | H1 / first result card |
| `/used-cars/birmingham-al` | 16.4 KB | 50 ms | 2 | city cover (eager, srcset) |
| `/blog/how-to-buy-a-used-car-in-alabama` | 15.5 KB | 19 ms | 0 | cover image (eager, srcset) |
| `/for-dealers` | 12.8 KB | 9 ms | 0 | banner photo |

The total client JavaScript bundle is **4.6 KB** across the whole site.

## Architecture that already favors Core Web Vitals
- **LCP:**
  - Server-rendered HTML with CSS inlined: no render-blocking stylesheet, no client rendering.
  - One 24 KB variable WOFF2 font, preloaded, with `font-display: swap`.
  - The LCP image is eager with `fetchpriority=high`; every other image is lazy.
  - Anonymous HTML is edge-cached for 120 s.
- **CLS:** every `<img>` has width and height (tested on every crawled page), and photos are cropped to a fixed 16:9 frame. Fonts swap with a metrics-compatible fallback stack.
- **INP:**
  - No framework hydration: vanilla progressive enhancement only.
  - Effects use a single delegated `pointermove` listener with `requestAnimationFrame`, and animate only `transform`, `opacity` and `filter`.
  - `prefers-reduced-motion` disables animation.
- **Third parties:** GA4 loads 2.5 s after `load`. The AdSense script is only added on indexable public pages once a publisher ID is set. There are no other third-party scripts.

## Changes in this pass
- `public/_headers`: `/images/*` now cached for 30 days (+ stale-while-revalidate), and `/og-default.png` for 7 days. Previously they had the platform default.
- Removing about 180 crawlable empty landing pages from internal links cuts crawler load (Googlebot spends its budget on real pages).
- Out-of-range pagination now returns a cheap 404 instead of running a full search and rendering an empty page.

## Remaining opportunities (not done; low impact or needs measurement)
- The home hero photo is decorative at 22% opacity. If field data shows LCP above 2.5 s on mobile, switch it to `fetchpriority=auto` so the H1 text becomes the LCP element.
- Dealer listing photos in `/media/*` are a single size per photo. A `-s` thumbnail size is already used in cards. Responsive sizes for the gallery could be added when real photo volume exists.
