# Homepage storyboard

Status key: **Built** means implemented in this change. **Kept** means the existing section is retained as is. **Deferred** means not built, with the reason.

## Scene 1: Hero
- Purpose: identity and the primary action.
- Content: eyebrow, H1 "Make Smarter Money Decisions", lede, two CTAs, trust bullets, quick-start panel (unchanged text).
- Layout: full viewport, copy left, photo as background, quick-start panel right on desktop.
- Visual asset: the `home` photo.
- Animation: photo settles from a slight zoom (1.04 to 1.0, 1.6 s), a curtain reveal (clip-path, 1.2 s), headline words rise with a 120 ms stagger, lede and CTAs follow.
- Scroll behavior: as the hero leaves the viewport, the photo drifts down a few percent and the copy fades. Scroll-driven CSS, where supported.
- Interaction: CTAs lift on hover and focus. Keyboard focus is visible.
- Transition in: page load. No preloader, because a preloader delays access and worsens LCP.
- Transition out: native scroll into scene 2.
- Mobile: static crop, no scroll-driven movement below 760 px.
- Performance: one image, eagerly loaded. No JavaScript.
- Status: **Built**.

## Scene 2: Stats band
- Purpose: quick credibility.
- Content: four numbers, computed at build time.
- Animation: none beyond a light reveal. The numbers are server-rendered, not counted up.
- Status: **Built** (counter animation removed, numbers render in HTML).

## Scene 3: Marquee
- Purpose: trust keywords as a moving strip.
- Animation: CSS marquee, paused on hover, disabled under reduced motion.
- Status: **Kept**.

## Scene 4: "Compare. Learn. Plan."
- Purpose: explain the three things the site does.
- Layout: desktop two columns. Heading and intro sticky on the left, the three cards scroll on the right. Mobile: stacked.
- Animation: cards rise into view one by one (scroll-driven CSS). The gradient heading is static.
- Transition out: the section ends with the cards and a plain edge.
- Status: **Built**.

## Scene 5: Popular tools, topics, latest guides, comparisons, calculators
- Purpose: depth of content for search and for the visitor who scrolls on.
- Animation: light reveal only. Repetitive card grids are kept because they serve navigation.
- Status: **Kept**.

## Scene 6: Trust and pillar guide with FAQ
- Purpose: credibility, long-form value, and FAQ structured data.
- Status: **Kept**.

## Deferred items
- Opening preloader with real asset readiness: deferred. A preloader would delay access and add a layout risk for little gain on a content site.
- WebGL aurora and 3D product object: removed earlier for performance. Brand has no 3D asset to justify it.
- Pointer tilt, magnetic buttons, custom cursor: deferred for performance, touch safety, and accessibility.
- Video hero: deferred. No approved video asset exists. See CINEMATIC_ASSET_REQUIREMENTS.md.
- Sound layer: deferred, see art direction.
- Smooth-scroll library (Lenis or similar): deferred. Native scrolling keeps Back, anchors, and touch behaviour intact.
- Fullscreen menu, section color morphs, horizontal scroll: deferred. Each adds JavaScript or layout risk without a matching content need.
