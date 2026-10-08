# ChayStore.com

Independent tea-guide content site (Astro 5, static). Built for US organic search, monetized by display ads and affiliate links, and kept sale-ready (clean docs and records).

```bash
npm install
npm run dev            # http://localhost:4321
npm run build          # static output in dist/
npm run check:links    # integrity checks on dist/: links, anchors, one H1, heading order, title/description length
```

## Structure
- `src/content/pillar/*.md`: the ~8,000-word homepage pillar guide (rendered in order).
- `src/content/articles/*.md`: 22 cluster guides (frontmatter schema in `src/content.config.ts`).
- `src/pages`: home, `/guides/`, `/category/<hub>/`, About (editorial policy), Contact, FAQ, Privacy, Terms, Affiliate Disclosure, Search, RSS, 404.
- `src/lib/site.ts`: site constants, hubs, `ADS_ENABLED`, `AMAZON_ASSOCIATE`, contact URL (`info.christopherkunz.com`).
- `src/lib/affiliate.ts`: single place for affiliate links (`<ProductBox id="..." />`).
- `src/scripts/cinema.ts`: cinematic effects (steam canvas, parallax, scroll reveal, progress bar), all disabled for `prefers-reduced-motion`.
- `public/_headers`: cache rules (immutable assets, no-cache HTML) and security headers for Cloudflare Pages.

## Images
Photos are free-to-use Pexels photos (WebP, 1600 + 800 px) in `public/images/`; the chosen photo IDs, alt text and focal points are in `data/image-map.json` and each article's front matter (`image`, `imageAlt`, `imageId`, `imagePos`). `.github/workflows/pexels-images.yml` re-downloads them from `data/pexels-final.json`. Credits are generated at `/credits/`. Articles without `image` fall back to a CSS-only placeholder.

## Effects (React Bits)
Cinematic UI comes from [React Bits](https://reactbits.dev) components copied to `src/react-bits/` (Aurora, BlurText, ShinyText, SpotlightCard, CountUp, CircularGallery), used as small Astro/React islands in `src/components/react/`. Aurora (WebGL) starts only after the first user interaction to protect Core Web Vitals; reduced-motion users get the static gradient. License: MIT + Commons Clause (see `THIRD-PARTY-NOTICES.md`).

## Analytics
Leave `PUBLIC_GA_ID` empty to ship with no cookies. If set, GA4 loads only after the visitor accepts the consent banner.

## Deploy (Cloudflare Pages)
`.github/workflows/chaystore-deploy.yml` builds and deploys to the Pages project `chaystore` using the repository secrets `CLOUDFLARE_API_TOKEN` (needs *Cloudflare Pages: Edit*) and, optionally, `CLOUDFLARE_ACCOUNT_ID`.
- Run **Actions → ChayStore (Cloudflare Pages) → Run workflow** with `production = true` for production, and `attach_domain = true` to attach `chaystore.com` / `www.chaystore.com` (the zone must be in the same Cloudflare account).
- Other branches deploy previews only.

## Before launch
See `docs/pre-launch-checklist.md`.
