# Homepage cinematic audit

## 1. Business purpose
Fountain Finances is an independent U.S. personal finance education site. It publishes sourced guides, free calculators that run in the browser, and comparisons of financial products. Revenue comes from AdSense and labelled affiliate links.

## 2. Target user
Everyday U.S. adults making money decisions: a first budget, a first home, credit, savings, loans, insurance. They arrive from search and want a clear answer fast. They are skeptical of hype.

## 3. Primary conversion
- Primary CTA: "Explore Financial Tools" to `/calculators/`.
- Secondary CTA: "Compare Financial Products" to `/best/`.
- Secondary goals: guide reads, newsletter sign-up, AdSense page views.

## 4. Current homepage structure (in order)
1. Hero (`hero-cine`): one still photo, eyebrow, H1, lede, two CTAs, three trust bullets, quick-start panel.
2. Stats band: four numbers (calculators, guides, comparisons, $0).
3. Marquee strip: trust and topic keywords.
4. "Compare. Learn. Plan.": three equal cards.
5. Popular financial tools: calculator cards.
6. Explore by topic: hub blocks with topic cards.
7. Latest guides.
8. Popular comparisons.
9. More calculators.
10. Trust section.
11. Personal finance pillar guide plus FAQ.

## 5. Existing assets
- Hero photo: `home` slot, an original image generated earlier with FLUX.1 schnell and stored in the repo. It is the only hero visual.
- Logo: `logo-mark.svg` (fountain mark), `logo-horizontal.svg`.
- Photos: about 80 slots, mostly Pexels with credits, plus 11 original images.
- No video, no product renders, no 3D assets, no brand illustrations.
- Fonts: Inter variable and Source Serif 4 variable, self-hosted.

## 6. Brand direction
Navy, deep teal, and gold (the fountain). Serif display headlines, plain sans body text. Calm, precise, and trustworthy. Nothing hyped.

## 7. Current visual weaknesses
- The hero is one static photograph with no depth layers and no focal narrative.
- Sections 4 to 9 repeat the same pattern: heading, grid of cards. The page feels like a template.
- The stats band and the marquee compete for attention right after the hero.
- No section transitions. Each block stops at a straight edge.
- Imagery is used as decoration, not to explain the product.

## 8. Current motion weaknesses
- Motion is limited to a staged hero entrance and card reveals (scroll-driven CSS, JS removed in the last change).
- The earlier WebGL aurora and JavaScript pointer effects were removed for performance. Nothing replaces them yet, so the page is calmer but less expressive.
- The hero headline uses a JavaScript split that was replaced with static CSS words. The entrance is now simple.

## 9. Technical constraints
- Astro static output on Cloudflare Pages. The site is fully server-rendered; no client framework is required for content.
- Content must stay real HTML for SEO. Canvas or video-only text is not allowed.
- Google AdSense needs stable layout and space for ad units. Effects must not cover or shift content.
- The CSP allows scripts only from self and approved Google and Cloudflare domains. Large third-party libraries are a poor fit.
- Mobile performance is the weak point. Lighthouse mobile performance on the homepage measured between 67 and 88 after AdSense, and the team must keep it from falling further.
- Reduced motion must be honoured.

## 10. Recommended cinematic direction
Use the brand's own metaphor, a fountain: calm water that rises from a base, with light moving through depth. Build one slow, directed sequence of 6 scenes, using CSS and scroll-driven animation only. Add no new runtime library. Keep the page under the performance budget. See CINEMATIC_ART_DIRECTION.md.
