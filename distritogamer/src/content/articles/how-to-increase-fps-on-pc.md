---
title: "How to Increase FPS on PC: 12 Safe Fixes That Work"
seoTitle: "How to Increase FPS on PC: 12 Safe Fixes That Work"
description: "Learn how to increase FPS on PC with 12 safe fixes: find your bottleneck, update drivers, tune graphics, fix thermals and check memory and storage."
category: gaming-performance
tags: [fps, performance, bottleneck, drivers, optimization]
keywords: [how to increase FPS on PC, increase FPS, PC gaming optimization, gaming performance tips, boost FPS, fix low FPS]
published: 2026-09-06
quickAnswer: "To increase FPS on PC, first find whether your CPU or GPU is the bottleneck, then update graphics drivers, close background apps, lower the most expensive graphics settings, check temperatures for throttling, enable your RAM's rated speed, install games on an SSD and use an upscaler if your GPU is the limit."
imageAlt: "Illustration of a speedometer-style gauge with a glowing needle on a dark orange-green gaming background"
imageQuery: "pc gaming rig with graphics card"
related: [best-fps-settings-for-better-performance, how-to-reduce-input-lag-on-pc, how-to-optimize-windows-for-gaming, fix-game-crashes-and-stuttering]
featured: true
popular: 2
howTo:
  name: "How to increase FPS on PC"
  totalTime: "PT45M"
  steps:
    - name: "Measure your current FPS"
      text: "Turn on an FPS counter and note your frame rate in a repeatable test scene."
    - name: "Find the bottleneck"
      text: "Check whether GPU usage is near 100 percent or whether a CPU core is maxed out."
    - name: "Update graphics drivers"
      text: "Install the latest driver from your GPU manufacturer."
    - name: "Close background apps"
      text: "Quit browsers, launchers and overlays you do not need while gaming."
    - name: "Lower expensive settings"
      text: "Reduce shadows, volumetric effects, reflections and ray tracing first."
    - name: "Check temperatures"
      text: "Monitor CPU and GPU temperatures and clean dust or improve airflow if parts are throttling."
    - name: "Enable rated memory speed and use an SSD"
      text: "Turn on XMP or EXPO in BIOS if your RAM supports it, and install games on an SSD."
faq:
  - q: "Why is my FPS so low even with a good PC?"
    a: "Common causes are outdated drivers, overheating, a bottleneck from the CPU or memory, background apps, the wrong display or power settings, or the game running on integrated graphics. Measure usage and temperatures first to see which applies."
  - q: "Does RAM speed affect FPS?"
    a: "It can, especially on CPU-limited games. Memory often runs at a slower default speed until you enable its rated profile (XMP or EXPO) in the BIOS, and running two matched sticks in dual-channel mode usually performs better than one."
  - q: "Will overclocking increase my FPS?"
    a: "It can, but it adds heat, noise and risk, and the gains vary. Try safe fixes first: drivers, settings, thermals and background apps. If you do overclock, use reputable guides, change values slowly and monitor temperatures."
sources:
  - title: "Frame rate (Wikipedia)"
    url: "https://en.wikipedia.org/wiki/Frame_rate"
  - title: "Thermal throttling (Wikipedia)"
    url: "https://en.wikipedia.org/wiki/Dynamic_frequency_scaling"
---
Low frame rates are frustrating, but they are often fixable without spending any money. Most low-FPS problems come from a short list of causes: the wrong settings, overheating, background programs, outdated drivers or one component holding the rest back. This guide takes you through twelve fixes in a sensible order, starting with the quickest checks.

The ordering matters. Measure first, change one thing at a time, and check whether it helped. For related reading, see our guides to [FPS settings](/game-settings/best-fps-settings-for-better-performance/), [reducing input lag](/gaming-performance/how-to-reduce-input-lag-on-pc/) and [optimizing Windows for gaming](/gaming-performance/how-to-optimize-windows-for-gaming/), plus our [complete gaming tips guide](/#pillar).

## Before you start: measure

You cannot fix what you have not measured. Turn on an FPS counter, which many games, graphics drivers and game platforms offer, and note your frame rate in a repeatable scene, such as the same area of a map or a practice range. Write down your average and, if you can, your lowest frame rate. A game that averages 100 FPS but dips to 30 will feel worse than one steady at 80. For background on the term, see [frame rate](https://en.wikipedia.org/wiki/Frame_rate).

## 1. Find your bottleneck

A **bottleneck** is the part limiting overall performance. Usually that is either your graphics card (GPU) or your processor (CPU).

- **GPU-limited:** GPU usage sits near 100 percent while FPS is low. Lowering resolution or graphics quality will help.
- **CPU-limited:** GPU usage is well below 100 percent while one or more CPU cores are heavily used. Lowering resolution will not help much; reducing simulation, view distance and background load will.

You can see usage in Windows Task Manager (Performance tab) or in your graphics driver's overlay. This simple check tells you which of the next steps will matter most.

## 2. Update your graphics driver

Driver updates often include performance fixes for new games. Download the latest driver from your GPU manufacturer's website or app. If a recent update caused problems, you can roll back to the previous one. Avoid third-party driver updater programs.

## 3. Close background programs

Browsers with many tabs, video players, game launchers, cloud sync tools and overlays all use CPU, memory and sometimes GPU. Before you play, close what you do not need. In Windows, open Task Manager, sort by CPU, memory and GPU usage, and see what is running. Disable unnecessary programs from starting automatically through the Startup apps list. We go further in [how to optimize Windows for gaming](/gaming-performance/how-to-optimize-windows-for-gaming/).

## 4. Use the right power and display settings

- **Laptops:** plug in the charger and choose a performance power mode, because many laptops cut performance on battery.
- **Desktops:** the standard balanced mode is usually fine, but if you see inconsistent clocks, try a high-performance mode.
- **Refresh rate:** confirm your monitor is running at its highest refresh rate, as explained in our [monitor settings guide](/game-settings/best-gaming-monitor-settings/).
- **Correct GPU:** on laptops with two graphics chips, make sure the game uses the dedicated GPU. Windows Graphics settings let you assign it per game.

## 5. Lower the most expensive graphics settings

Not every setting costs the same. Lower these first, as they typically cost the most for the least visual gain:

1. Ray tracing
2. Shadows
3. Volumetric fog and clouds
4. Reflections
5. Ambient occlusion
6. Resolution or render scale

Turn off motion blur, film grain and depth of field for clarity. Our guide to [best FPS settings](/game-settings/best-fps-settings-for-better-performance/) explains the full list and how to test.

## 6. Try an upscaler

If your GPU is the limit, upscaling technologies such as **NVIDIA DLSS**, **AMD FSR** and **Intel XeSS** render at a lower resolution and scale up. Quality or balanced presets give a boost with a small visual cost. Frame generation can make visuals look smoother, but it may add latency, so many competitive players leave it off in fast shooters.

## 7. Check your temperatures

Hot components slow themselves down to protect themselves. This is called thermal throttling; see [dynamic frequency scaling](https://en.wikipedia.org/wiki/Dynamic_frequency_scaling). Signs include FPS that starts high and drops after a few minutes, fans at full speed or clocks that fall during play.

1. Install a free monitoring tool or use your driver overlay to watch CPU and GPU temperatures during a game.
2. If a component sits at its limit, clean dust from filters, fans and heatsinks with compressed air, with the PC powered off and unplugged.
3. Make sure intake and exhaust fans are working and the case is not blocked.
4. On laptops, use a hard surface or a cooling stand, and clean the vents.

> **Warning:** Do not open sealed laptops or remove heatsinks unless you are comfortable doing so, as it may void warranties. If temperatures are extreme, consider professional servicing.

## 8. Enable your memory's rated speed

Memory frequently runs below its advertised speed until you enable its profile in the BIOS. This profile is called **XMP** on many systems and **EXPO** on some AMD systems. Enabling it can improve performance, particularly in CPU-limited games. Also check that you use **two memory sticks** in the right slots for dual-channel mode, because a single stick usually performs worse. If the PC becomes unstable after changing memory settings, revert to defaults.

## 9. Install games on an SSD

An SSD reduces loading times and can reduce stutter caused by loading assets during play, especially in open-world games. If you have both an SSD and a hard drive, put your most-played and largest games on the SSD. Keep some free space; drives that are almost full can slow down.

## 10. Check background system activity

Sometimes something heavy runs in the background: an antivirus scan, a Windows update, file indexing, cloud backups or a stuck program. Check Task Manager when your frame rate drops. If the same process appears each time, adjust its schedule. In Windows, you can set active hours so updates do not install while you play.

## 11. Review game-specific options

Some games have settings that affect performance but are not graphics options, such as:

- **Frame rate limit:** an uncapped menu can overheat a GPU, and capping reduces heat and noise.
- **Rendering API:** some games let you choose between different graphics APIs, and one may perform better on your hardware.
- **Pre-compiled shaders:** many games compile shaders on first launch or after updates, and stuttering for a few minutes can be normal.
- **Mods and overlays:** disable them to check whether they are the problem.

## 12. Consider hardware only after software

If you have done everything above and your frame rate is still not where you want it, the limit may be your hardware. Look at your bottleneck:

- **GPU-limited:** a stronger graphics card gives the biggest gain.
- **CPU-limited:** a newer processor and faster memory help.
- **Display-limited:** a higher refresh rate monitor makes the extra frames visible. See [our gear guides](/gaming-gear/).

Spend money only after you can name the limit, and avoid upgrades that move the bottleneck rather than removing it.

## What not to do

- **Avoid "FPS booster" programs.** Many do little or carry risk.
- **Avoid registry tweaks you do not understand.** They rarely help and can break things.
- **Do not disable security tools permanently.** The gain is small and the risk is large.
- **Do not chase the highest number.** Smooth, stable frame rates feel better than occasional spikes.

## Putting results together

Re-run your test scene after each change, and record the numbers. Often two or three fixes deliver most of the gain. If your problem is stutter instead of a low average, our guide to [fixing game crashes and stuttering](/troubleshooting/fix-game-crashes-and-stuttering/) covers the other causes. If the problem appears only online, see [how to fix game lag](/troubleshooting/how-to-fix-game-lag/).

## A quick reference: symptoms and first fixes

| What you notice | First thing to try |
|---|---|
| Low FPS everywhere, GPU at 100 percent | Lower resolution, shadows, effects or use an upscaler |
| Low FPS, GPU well below 100 percent | Lower CPU-heavy settings, close background apps, check memory speed |
| FPS drops after several minutes | Check temperatures and clean dust |
| FPS is fine, but the game stutters | Check VRAM, storage, shader compilation and background tasks |
| FPS is low only on battery | Plug in and select a performance power mode |
| FPS dropped after an update | Update drivers, check for game patches, test a previous driver |
| FPS is capped at 60 | Check V-Sync, the game's frame limit and the monitor's refresh rate |

## How much FPS do you actually need?

The answer depends on your game and your display. A few rules of thumb:

- **Match your monitor.** Frames beyond your refresh rate give little visible benefit.
- **Prioritize stability.** A steady frame rate feels better than a high but uneven one.
- **Competitive fast games** reward higher frame rates, because responsiveness improves.
- **Slower games** are usually fine at a steady 60 or higher.

Set a target that matches your goal, and stop when you reach it. Chasing extra frames costs money and noise for diminishing returns.

## Key takeaways

- Measure first, and find out whether your CPU or GPU is the bottleneck.
- Update graphics drivers, close background programs and check temperatures for throttling.
- Lower shadows, volumetric effects, reflections and ray tracing before anything else.
- Enable your memory's rated speed, install games on an SSD and consider an upscaler.
- Avoid FPS booster tools and registry tweaks, and spend money only after you can name the limit.

Most players find that two or three of these fixes deliver nearly all of the gain. Re-run your test scene after each change so that you can tell which ones those are.

## Frequently asked questions

Common questions about FPS are answered below. Measure first, change one thing at a time and fix the cheapest causes before spending money.
