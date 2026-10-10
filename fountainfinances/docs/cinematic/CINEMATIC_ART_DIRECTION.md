# Cinematic art direction

## Central concept: "Still water, rising light"
The logo is a fountain: a steady base that lifts water into the light. Personal finance works the same way when it is built on a steady base. The homepage shows that idea in six scenes: a calm base, a rising light, a clear view, a measured sequence, proof, and a quiet invitation.

## Emotional goal
Calm confidence. A visitor should feel that the site is clear, careful, and worth their time, the opposite of a pitch.

## Visual references (described in words)
- A slow architectural photograph lit by late afternoon sun.
- Editorial magazine pages where a headline sits over a large, quiet image.
- A still camera that pushes in slowly, with almost no shake.

## Color behavior
- Hero and closing scene: deep navy (#0b1a28) with a teal light (#7fe0d9 at low strength) and a single warm gold accent (#e2b65a).
- Editorial content sections: the existing light paper background.
- Color changes between scenes are gradual and never flash.

## Lighting style
Single soft light source from the upper right. Shadows are long and warm. No glowing blobs, no neon, no purple gradients.

## Texture style
A very faint film grain on the hero only. No full-page noise layer, to protect performance.

## Camera behavior
In the hero the photograph slowly settles from a slight zoom to rest, and it drifts a few percent as the visitor scrolls. Camera moves are small and linear, never bouncy.

## Typography behavior
- Display: Source Serif 4, large, tight leading, controlled line breaks.
- Body: Inter, unchanged.
- Hero headline words rise one after another with a short stagger (120 ms).
- No character-level splitting. Arabic text would break shaping, and English gains little from it.

## Motion language
- Easing: cubic-bezier(0.2, 0.7, 0.2, 1) for entrances and exits.
- Durations: 600 to 1000 ms for entrances, 1 to 2 s for ambient motion.
- Distance: 24 px maximum for reveals. No large slides.
- Each section has one primary motion idea. No two sections share the same fade-up.

## Section pacing
Hero (one full viewport), then a short stats beat, then the sticky "Compare. Learn. Plan." story, then the content grids at normal speed. Scroll-driven motion is limited to the hero and the sticky story. Everything else is static after a light reveal.

## Interaction philosophy
Hover and focus feedback is immediate. Buttons lift by 2 px, cards lift by 4 px. No pointer tracking, no tilt, no custom cursor. These interactions were removed for performance and accessibility, and the decision stands.

## Sound
No sound. The brand is about calm reading, and sound would add a cost to every visitor. If a sound layer is ever added, it must be off by default with a visible control.

## Mobile adaptation
- Hero: the photograph is cropped to a portrait focal point, with the same staged text.
- Sticky story: becomes a normal vertical stack.
- No scroll-driven hero zoom below 760 px, to avoid battery and jank costs.
- Touch targets stay at 44 px or more.
