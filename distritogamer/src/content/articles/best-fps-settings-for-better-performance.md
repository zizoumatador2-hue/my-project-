---
title: "Best FPS Settings for Better Performance and Clarity"
seoTitle: "Best FPS Settings for Better Performance and Clarity"
description: "Find the best FPS settings for smooth, clear play: which graphics options cost the most, what to turn off and how to test each change on your PC."
category: game-settings
tags: [settings, fps, graphics, performance]
keywords: [best FPS settings, best gaming settings, FPS gaming tips, graphics settings for performance, best settings for competitive games, V-Sync, frame cap]
published: 2026-08-25
quickAnswer: "The best FPS settings prioritize a stable high frame rate and clear visuals: lower shadows, effects and ray tracing first, keep resolution sharp, turn off motion blur and film grain, avoid V-Sync in competitive play, cap your frame rate slightly under your refresh rate if you use adaptive sync, and test one change at a time."
imageAlt: "Illustration of three horizontal sliders with glowing knobs on a teal gaming-style background"
imageQuery: "gaming pc graphics settings menu"
related: [how-to-increase-fps-on-pc, how-to-reduce-input-lag-on-pc, best-gaming-monitor-settings, best-sensitivity-settings-for-gaming]
products: [high-refresh-monitor]
productsHeading: "Display gear that supports these settings"
hasAffiliate: true
popular: 7
faq:
  - q: "What graphics settings should I lower first for more FPS?"
    a: "Start with shadows, volumetric effects such as fog and clouds, ambient occlusion, reflections and ray tracing, because they usually cost the most performance for the least visible benefit. Then consider render resolution or an upscaler if you need more."
  - q: "Should I turn V-Sync on or off?"
    a: "For competitive play, most players turn V-Sync off because it can add latency. If you have a variable refresh rate monitor, use adaptive sync and cap your frame rate a few frames below the refresh rate for smooth, tear-free play with low latency."
  - q: "Does lowering settings make me play better?"
    a: "It can help in two ways: a higher, steadier frame rate makes controls feel more responsive, and removing effects such as blur, bloom or heavy particles can make enemies easier to see. The benefit depends on the game, so test what works for you."
sources:
  - title: "Frame rate (Wikipedia)"
    url: "https://en.wikipedia.org/wiki/Frame_rate"
  - title: "Refresh rate (Wikipedia)"
    url: "https://en.wikipedia.org/wiki/Refresh_rate"
  - title: "Variable refresh rate (Wikipedia)"
    url: "https://en.wikipedia.org/wiki/Variable_refresh_rate"
---
There is no single "best settings" list that works for every game and every PC. What does exist is a set of principles that tell you which settings matter, which do not, and how to find the right balance for your hardware. This guide explains them so that you can tune any game yourself instead of copying a list that may not fit your system.

The goal depends on what you play. In competitive games, you want a **high, steady frame rate and a clear picture**. In single-player games, you may prefer to prioritize visual quality as long as the game runs smoothly. Either way, the approach is the same: measure, change one thing, and measure again. For broader performance advice, see our guides to [increasing FPS on PC](/gaming-performance/how-to-increase-fps-on-pc/) and [reducing input lag](/gaming-performance/how-to-reduce-input-lag-on-pc/), and our [complete gaming tips guide](/#pillar).

## First, know what you are optimizing for

Three things get mixed up:

- **Frame rate (FPS):** how many frames your PC produces each second. See [frame rate](https://en.wikipedia.org/wiki/Frame_rate).
- **Refresh rate (Hz):** how many times per second your monitor can show a new image. See [refresh rate](https://en.wikipedia.org/wiki/Refresh_rate).
- **Input latency:** the delay between your action and the result on screen.

Higher frame rates usually reduce latency and make motion look smoother, but only up to what your monitor can display. A 60 Hz monitor cannot show more than 60 distinct frames per second, even if your PC produces 200.

## Graphics options ranked by cost and usefulness

Different games name options differently, but most settings fall into the same groups. This table shows typical performance cost and what to do with them in competitive play. Exact numbers vary by game and hardware, so treat it as a guide for what to test first.

| Setting | Typical performance cost | Competitive recommendation |
|---|---|---|
| Resolution / render scale | Very high | Keep as high as your frame rate allows; reduce only if needed |
| Ray tracing | Very high | Off for competitive play |
| Shadows | High | Low or medium; high shadows can help spot enemies in some games, so test |
| Volumetric fog / clouds | High | Low or off |
| Ambient occlusion | Medium | Low or off |
| Reflections | Medium to high | Low or off |
| Anti-aliasing | Low to high, by type | Choose a method that keeps edges clean without blur |
| Texture quality | Low if you have enough video memory | High if your GPU has enough VRAM, otherwise medium |
| Effects / particles | Medium | Low or medium to reduce clutter |
| Motion blur, film grain, chromatic aberration | Low | Off |
| Depth of field | Low | Off |

> **Tip:** Texture quality mostly uses video memory (VRAM), not processing power. If your graphics card has enough VRAM, high textures often cost little performance. If your game stutters when you turn them up, you have probably run out of VRAM.

## Upscaling and frame generation

Modern games often include upscalers, which render at a lower resolution and then scale up the image. The best-known are **NVIDIA DLSS**, **AMD FSR** and **Intel XeSS**. They can raise frame rates considerably when your GPU is the limit, usually with a small loss in sharpness at quality-focused presets.

Some games also offer **frame generation**, which inserts extra frames to look smoother. It can raise displayed frame rate but may add latency, so many competitive players avoid it in fast shooters and use it in single-player games where smoothness matters more than response.

## Display mode, V-Sync and frame caps

- **Display mode.** Modern Windows handles borderless windowed mode well, and in many games the latency difference from exclusive fullscreen is small or nonexistent. Test both in your game, because results vary.
- **V-Sync.** Traditional V-Sync waits for the monitor, which prevents screen tearing but can add input lag. Most competitive players leave it off.
- **Variable refresh rate (VRR).** G-Sync and FreeSync adjust the monitor's refresh to match your frame rate, avoiding tearing without the lag of traditional V-Sync. See [variable refresh rate](https://en.wikipedia.org/wiki/Variable_refresh_rate).
- **Frame cap.** If you use VRR, capping your frame rate a few frames below your refresh rate keeps the game inside the VRR range. If you do not use VRR, a cap can still reduce stutter and heat, and many drivers and games offer low-latency modes that work best with a cap.

## Step-by-step: tune a game in ten minutes

1. **Update your graphics drivers** and install the game's latest patch.
2. **Pick a repeatable test.** Use a practice range, replay or a consistent spot in a single-player game.
3. **Turn on an FPS counter.** Many games, drivers and platforms include one.
4. **Start from a preset.** Choose the lowest or medium preset as a baseline.
5. **Raise one setting at a time.** Note the frame rate after each change.
6. **Keep what looks good for little cost.** Texture quality and anti-aliasing are common keepers.
7. **Turn off visual noise.** Motion blur, film grain, chromatic aberration and depth of field rarely help gameplay.
8. **Check frame-time smoothness.** An average of 140 FPS that stutters feels worse than a steady 100.

## Settings that help visibility

Clarity can matter as much as performance, particularly in shooters:

- **Brightness and gamma:** set them so that dark areas are visible without washing out the image. Our [monitor settings guide](/game-settings/best-gaming-monitor-settings/) covers calibration basics.
- **Field of view (FOV):** a wider FOV shows more of the world but makes targets smaller. Pick a value that feels comfortable and keep it.
- **Crosshair and UI:** choose a high-contrast crosshair and trim distracting HUD elements.
- **Effects:** lowering explosion, smoke or particle quality can keep fights readable.

## Match your settings to your hardware

- **If your GPU is the bottleneck** (GPU usage near 100 percent): lower resolution, shadows, reflections, effects and ray tracing, or use an upscaler.
- **If your CPU is the bottleneck** (GPU usage well below 100 percent, a few CPU cores heavily used): lower object detail, view distance, crowd or simulation settings and background tasks. Lowering resolution will not help much.
- **If your game stutters** despite a good average: check for VRAM limits, background tasks, storage speed and overheating. Our guide to [fixing crashes and stuttering](/troubleshooting/fix-game-crashes-and-stuttering/) helps.

## Common mistakes with settings

- **Copying a professional's settings.** Their hardware and goals differ from yours.
- **Maxing everything on a modest PC.** The result is a slideshow.
- **Chasing the highest average FPS.** Stability and frame times matter more.
- **Changing many settings at once.** You will not know what helped.
- **Forgetting your monitor.** Frame rates above your refresh rate are of limited use.

## When settings are not enough

If you have lowered everything and the game is still poor, the limit may be your hardware or the system around it. Check temperatures, background apps and drivers, then see [how to optimize Windows for gaming](/gaming-performance/how-to-optimize-windows-for-gaming/). If the limit is your display, a [high refresh rate monitor](/gaming-gear/) can help, but only if your PC can reach those frame rates. Once your graphics are set, finish the job by choosing a comfortable [sensitivity](/game-settings/best-sensitivity-settings-for-gaming/).

## An example tuning session

To make the process concrete, here is how a tuning session might go for a fictional player with a mid-range PC who wants a high frame rate in a competitive shooter.

1. **Baseline:** on the highest preset, the game averages about 70 FPS with dips into the 40s. GPU usage is near 100 percent, so the graphics card is the limit.
2. **Preset:** they switch to the medium preset and the game averages about 110 FPS.
3. **Shadows and effects:** lowering shadows and effects raises the average to about 135 FPS and removes most dips.
4. **Texture quality:** they raise textures back to high because it costs little, and the frame rate barely changes.
5. **Motion blur and depth of field:** they switch both off, and the picture looks clearer.
6. **Frame cap:** their monitor is 144 Hz and uses adaptive sync, so they cap the game at 141 FPS to stay inside the adaptive range.
7. **Check:** in a practice range, the game feels responsive and steady, so they save the settings and leave them alone.

The numbers here are invented to show the process. Your results will differ, but the order does not: baseline, preset, expensive settings, cheap settings you can keep, visual clutter, cap and check.

## Settings by hardware situation

General advice, not exact numbers:

| Situation | Where to focus |
|---|---|
| Older or modest GPU | Resolution scale, shadows, effects, upscaler |
| Strong GPU, weaker CPU | View distance, object detail, simulation settings, background tasks |
| Plenty of both, high refresh monitor | Frame cap, low-latency mode, visual clarity |
| Laptop | Plugged in, performance power mode, temperatures |
| Console | Performance versus quality mode |

## When to revisit your settings

Review your settings when:

- A major game patch changes performance
- You update graphics drivers and notice a difference
- You change your monitor or upgrade a major component
- You start a new game with a very different engine

Otherwise, leave them alone. Stable settings let you focus on playing.

## Key takeaways

- Prioritize a stable, high frame rate and a clear image over the highest possible graphics quality in competitive games.
- Lower shadows, volumetric effects, reflections and ray tracing first, and keep textures high if you have enough video memory.
- Turn off motion blur, film grain, chromatic aberration and depth of field.
- Use adaptive sync with a frame cap just below your refresh rate rather than traditional V-Sync.
- Test one change at a time in a repeatable scene, and keep what helps.

A smooth, readable picture helps you play better than a prettier one that stutters. Tune once, save your settings and move on.

## Frequently asked questions

Common questions about FPS settings are answered below. The core idea is simple: measure, change one thing at a time and prefer a smooth, clear picture over a high number on a counter.
