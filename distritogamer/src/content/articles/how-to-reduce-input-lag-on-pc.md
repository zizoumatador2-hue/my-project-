---
title: "How to Reduce Input Lag on PC: A Complete Guide"
seoTitle: "How to Reduce Input Lag on PC: Complete Guide"
description: "Reduce input lag on PC: raise and cap your frame rate, enable low-latency modes, set V-Sync and display options right and pick faster input devices."
category: gaming-performance
tags: [input lag, latency, fps, reflex, display]
keywords: [how to reduce input lag, input lag PC, reduce latency gaming, low latency mode, V-Sync input lag, gaming performance tips]
published: 2026-09-09
quickAnswer: "To reduce input lag, raise your frame rate, cap it slightly below what your GPU can sustain, turn on your game's low-latency mode such as NVIDIA Reflex or AMD Anti-Lag when available, avoid traditional V-Sync, use a high refresh rate display in game mode, and connect your mouse or controller with a wired or low-latency link."
imageAlt: "Illustration of a speedometer-style gauge with a needle in the fast zone on a dark blue background"
imageQuery: "esports gamer fast reaction"
related: [how-to-increase-fps-on-pc, best-gaming-monitor-settings, how-to-optimize-windows-for-gaming, best-fps-settings-for-better-performance]
featured: false
popular: 3
howTo:
  name: "How to reduce input lag on a gaming PC"
  totalTime: "PT30M"
  steps:
    - name: "Raise your frame rate"
      text: "Lower demanding graphics settings so your PC produces a higher and steadier frame rate."
    - name: "Cap the frame rate"
      text: "Set a frame limit slightly below the maximum your GPU can sustain so the render queue does not build up."
    - name: "Enable low-latency mode"
      text: "Turn on NVIDIA Reflex or AMD Anti-Lag in supported games, or your driver's low-latency option."
    - name: "Handle V-Sync correctly"
      text: "Turn traditional V-Sync off, or use adaptive sync with a frame cap just below your refresh rate."
    - name: "Set up your display"
      text: "Use the monitor's highest refresh rate, native resolution and game mode with extra processing off."
    - name: "Check your input devices"
      text: "Use a wired connection or a reliable low-latency dongle and a mouse polling rate of at least 1000 Hz."
faq:
  - q: "What is a good input lag for gaming?"
    a: "Lower is better, but there is no single threshold. Differences of a few milliseconds are hard to notice for most players, while large delays of tens of milliseconds feel sluggish. Focus on removing the biggest sources: low frame rate, V-Sync and a slow display."
  - q: "Is input lag the same as ping?"
    a: "No. Input lag is the delay between your action and the result on your own screen. Ping is the network delay between your device and the game server. You can have low ping and high input lag, or the reverse, and each has different fixes."
  - q: "Does a wired mouse have less input lag than wireless?"
    a: "Not necessarily. Modern wireless mice with a quality dongle can match wired ones in practice. Cheap or Bluetooth connections tend to add delay and interference, so use the manufacturer's low-latency receiver and keep it close."
sources:
  - title: "Input lag and display lag (Wikipedia)"
    url: "https://en.wikipedia.org/wiki/Display_lag"
  - title: "NVIDIA Reflex overview"
    url: "https://www.nvidia.com/en-us/geforce/technologies/reflex/"
  - title: "Refresh rate (Wikipedia)"
    url: "https://en.wikipedia.org/wiki/Refresh_rate"
---
Input lag is the delay between pressing a button or moving your mouse and seeing the result on screen. In a slow game it is hard to notice. In a fast shooter or fighting game, it can make aiming feel heavy and timing feel off.

The good news is that most of the delay in a typical gaming PC comes from a handful of fixable things. This guide explains where input lag comes from and which fixes make a real difference. It builds on our guides to [increasing FPS](/gaming-performance/how-to-increase-fps-on-pc/) and [monitor settings](/game-settings/best-gaming-monitor-settings/), and the wider advice in our [complete gaming tips guide](/#pillar).

## Where input lag comes from

Your input travels through a chain, and each link adds time:

1. **Input device:** the mouse, keyboard or controller sensing and sending your action.
2. **Connection:** wired, wireless dongle or Bluetooth, with its polling rate.
3. **Game and CPU:** the game processes your input and prepares a frame.
4. **Render queue and GPU:** the frame is drawn, and may wait in a queue if the GPU is overloaded.
5. **Display:** the monitor processes the image, scans it out and changes pixel colors. See [display lag](https://en.wikipedia.org/wiki/Display_lag).

You reduce input lag by shortening the slowest links. Network delay (ping) is separate and covered in [how to fix game lag](/troubleshooting/how-to-fix-game-lag/).

## 1. Raise your frame rate

A higher frame rate means a new frame is ready sooner after your input. At 60 FPS a frame takes about 16.7 milliseconds, at 144 FPS about 6.9 milliseconds and at 240 FPS about 4.2 milliseconds. Raising frame rate is often the single most effective fix. Lower the settings that cost the most performance, as described in our [FPS settings guide](/game-settings/best-fps-settings-for-better-performance/).

## 2. Cap your frame rate below the GPU limit

This sounds backwards, but it is important. If your GPU is working at 100 percent, the game can build up a queue of frames waiting to be drawn, which adds delay. Capping your frame rate a little below what the GPU can sustain keeps the queue short.

- Choose a cap you can hold steadily, such as slightly below your typical average.
- With adaptive sync, cap a few frames below your monitor's refresh rate.
- Use the in-game limiter if there is one, or your graphics driver's limiter.

## 3. Turn on low-latency modes

Several technologies cut the render queue and synchronize the CPU and GPU:

- **NVIDIA Reflex** in supported games, which you can read about on [NVIDIA's Reflex page](https://www.nvidia.com/en-us/geforce/technologies/reflex/).
- **AMD Anti-Lag** in AMD's driver settings for supported setups.
- **Driver-level low-latency modes** in graphics control panels.

Enable them in the game's settings first, then in the driver if needed. Support and behavior vary by game and hardware, so test and keep what feels better. Do not enable several overlapping options at once without checking the results.

## 4. Handle V-Sync and adaptive sync

Traditional V-Sync waits for the monitor's refresh before showing a frame, preventing tearing but adding delay. Many competitive players keep it off. A better option for most is **adaptive sync** (G-Sync or FreeSync), which adjusts the monitor to your frame rate without much penalty. Use adaptive sync with a frame cap below your refresh rate. Our [monitor settings guide](/game-settings/best-gaming-monitor-settings/) explains how to set it up.

## 5. Set up your display for speed

- **Refresh rate:** use the highest your monitor supports. Many monitors default to 60 Hz in Windows, so check. See [refresh rate](https://en.wikipedia.org/wiki/Refresh_rate).
- **Game mode:** enable it and turn off processing such as motion smoothing, dynamic contrast and noise reduction.
- **Native resolution:** non-native resolutions require scaling that adds delay.
- **TVs:** use Game Mode, which reduces processing significantly.

## 6. Check your input devices

- **Polling rate:** a mouse polling at 1000 Hz or more reports movement frequently. Many mice default to this, but check.
- **Wired or low-latency wireless:** wired is simple and reliable. A manufacturer's wireless dongle can be just as responsive. Bluetooth tends to be slower and less consistent.
- **USB ports:** plug devices directly into your PC rather than through crowded hubs.
- **Controllers:** use a wired connection or a quality dongle if you want to remove doubts about wireless delay.

Our [FPS mouse buying guide](/gaming-gear/best-gaming-mouse-for-fps/) explains what matters in a mouse, and our [controller settings guide](/game-settings/best-controller-settings-for-competitive-gaming/) covers controllers.

## 7. Windows and background tasks

Windows adds little input lag by itself, but background tasks can cause stutter and uneven frames. Close unneeded programs, disable overlays you do not use and keep drivers updated. Many guides suggest dozens of tweaks, but only a few make a measurable difference, so see [how to optimize Windows for gaming](/gaming-performance/how-to-optimize-windows-for-gaming/) for the safe ones. Features such as Game Mode and hardware-accelerated GPU scheduling affect different PCs differently, so test rather than assume.

## 8. Be careful with frame generation

Frame generation can make visuals look smoother by inserting extra frames, but it can add latency because frames are held back to be interpolated. It can be a good fit for single-player games and a poor fit for fast competitive play. If you use it, enable the matching low-latency option and judge by feel.

## Measuring input lag

Precise measurement needs specialized tools, but you can still judge changes:

- **In-game latency displays:** some games with Reflex show system latency in an overlay.
- **A/B comparison:** change one thing, then play the same drill and see whether tracking or flicks feel more responsive.
- **High-speed cameras:** advanced users film the screen and input device, but this is rarely necessary.

Rely on your own feel, and be wary of placebo effects. A change that is hard to notice is probably not worth ongoing complexity.

## Priority checklist

| Fix | Effort | Typical impact |
|---|---|---|
| Raise and stabilize FPS | Low to medium | High |
| Cap below GPU limit | Low | Medium to high when GPU-bound |
| Low-latency mode | Low | Medium |
| V-Sync off or adaptive sync with cap | Low | Medium |
| High refresh display in game mode | Low if owned | Medium to high |
| Wired or low-latency input | Low | Low to medium |
| Windows cleanup | Medium | Low to medium |

## Common mistakes

- **Chasing tiny milliseconds** before fixing major causes such as 60 Hz or V-Sync.
- **Uncapped frames at 100 percent GPU,** which build a queue.
- **Mixing many latency options** without testing.
- **Confusing ping with input lag.** They are different problems.
- **Ignoring the display.** A slow screen undoes the work you do elsewhere.

## Input lag on consoles and TVs

Many of the same principles apply when you play on a console, though you have fewer settings to change.

- **Use Game Mode on your TV.** This is often the single biggest improvement, since TVs add heavy image processing by default.
- **Pick a performance mode** in games that offer one, since it often raises frame rate and lowers latency.
- **Use a wired controller** if you suspect wireless issues.
- **Check HDMI settings,** such as the highest refresh rate your TV and console support, and variable refresh rate if both support it.
- **Turn off extra processing** such as motion smoothing.

TVs vary a lot, so look for independent measurements of input lag for your model if you can find them.

## How much input lag is noticeable?

Everyone is different, but some general ideas help.

| Level of delay | What most players feel |
|---|---|
| A few milliseconds | Hard to notice |
| Around 10 to 20 milliseconds | Noticeable to some players in fast games |
| 30 milliseconds or more | Often feels sluggish in fast games |
| Much more than that | Obvious in nearly any game |

These are rough guides and not thresholds. Your own feel in the games you play matters most. The practical advice is to remove the large sources first and to stop when the game feels responsive.

## Input lag versus other problems

It is easy to confuse input lag with other issues. Use this guide.

- **If controls feel heavy even offline,** it is probably input lag. Work through this guide.
- **If actions feel late only online,** it is probably ping. See [how to fix game lag](/troubleshooting/how-to-fix-game-lag/).
- **If visuals are choppy,** it is probably frame rate. See [how to increase FPS on PC](/gaming-performance/how-to-increase-fps-on-pc/).
- **If movement feels uneven despite a high average frame rate,** it may be frame-time stutter. See [fixing crashes and stuttering](/troubleshooting/fix-game-crashes-and-stuttering/).

## Testing your changes with a simple drill

Because input lag is about feel, a small, repeatable drill helps you tell whether a change worked.

1. **Choose a drill,** such as tracking a strafing target or flicking between two points.
2. **Run it for two minutes** and note your score or accuracy.
3. **Make one change,** such as enabling a low-latency mode.
4. **Run the drill again** and compare.
5. **Repeat on a different day** to avoid being fooled by a good or bad day.

If you cannot tell the difference, the change is probably small, and it is fine to keep the simplest setup.

## Key takeaways

- Raise and stabilize your frame rate, then cap it just below what your graphics card can sustain.
- Enable low-latency modes such as NVIDIA Reflex or AMD Anti-Lag where they are available.
- Avoid traditional V-Sync, or pair adaptive sync with a frame cap.
- Use your display's highest refresh rate and its game mode, and turn off extra processing.
- Use a wired or reliable low-latency connection for your mouse or controller, and test changes with a repeatable drill.

Remove the large sources of delay first. Once the game feels responsive, stop tweaking and play.

## Frequently asked questions

Common questions about input lag are answered below. Fix the large causes first, such as frame rate, V-Sync and the display, then refine the rest.
