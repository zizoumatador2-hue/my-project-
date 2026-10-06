---
title: "Fix Game Crashes and Stuttering: A Step-by-Step Troubleshooting Guide"
seoTitle: "Fix Game Crashes and Stuttering: Troubleshooting Guide"
description: "Fix game crashes and stuttering on PC step by step: verify files, update drivers, check temperatures, memory and storage, and remove overlays and mods."
category: troubleshooting
tags: [crashes, stuttering, drivers, troubleshooting, performance]
keywords: [fix game crashes, game stuttering fix, gaming troubleshooting guide, game crashing on startup, fix stutter PC, verify game files, GPU driver crash]
published: 2026-10-02
quickAnswer: "To fix game crashes and stuttering, verify the game's files, update graphics drivers, check CPU and GPU temperatures, turn off overlays and mods, reset any overclock or memory profile that may be unstable, make sure you have enough memory and free storage, and read the game's crash information to find the pattern."
imageAlt: "Illustration of a wrench in glowing outline on a dark orange background"
imageQuery: "pc repair troubleshooting"
related: [how-to-increase-fps-on-pc, how-to-optimize-windows-for-gaming, how-to-fix-game-lag, best-fps-settings-for-better-performance]
howTo:
  name: "How to fix game crashes and stuttering"
  totalTime: "PT45M"
  steps:
    - name: "Restart and update"
      text: "Restart your PC and install pending updates for the game, Windows and your graphics driver."
    - name: "Verify game files"
      text: "Use your game launcher's verify or repair option to fix corrupted files."
    - name: "Disable overlays and mods"
      text: "Turn off overlays, recording tools and mods to see whether one is causing the problem."
    - name: "Check temperatures"
      text: "Monitor CPU and GPU temperatures and clean dust or improve airflow if they are too high."
    - name: "Reset overclocks and memory profiles"
      text: "Return the CPU, GPU and memory to default settings to test for instability."
    - name: "Check memory and storage"
      text: "Make sure you have enough RAM and free disk space, and test your memory and drive health."
    - name: "Read the crash information"
      text: "Check the game's error message and Windows event logs for patterns."
faq:
  - q: "Why does my game crash randomly?"
    a: "Common causes are overheating, unstable overclocks or memory profiles, outdated or corrupted drivers, corrupted game files, overlays and mods, or insufficient power. Test one factor at a time, starting with updates, file verification and temperatures."
  - q: "What causes stuttering even with high FPS?"
    a: "Stutter usually comes from uneven frame times rather than low averages. Causes include shader compilation, running out of video memory, background tasks, slow storage and thermal throttling. Check the game's frame-time graph or 1 percent lows to confirm."
  - q: "Should I reinstall Windows to fix crashes?"
    a: "Only as a last resort. Most crashes are fixed by updates, driver reinstallation, file verification, thermal fixes and reverting unstable settings. Reinstalling Windows is time-consuming and often unnecessary, and it does not fix hardware problems."
sources:
  - title: "Crash (computing) (Wikipedia)"
    url: "https://en.wikipedia.org/wiki/Crash_(computing)"
  - title: "Dynamic frequency scaling (Wikipedia)"
    url: "https://en.wikipedia.org/wiki/Dynamic_frequency_scaling"
  - title: "Shader (Wikipedia)"
    url: "https://en.wikipedia.org/wiki/Shader"
---
A game that crashes or stutters is frustrating because the cause could be almost anything: the game, the driver, Windows, your hardware or the settings you changed last week. The way out is a methodical process. Start with the quick, safe checks, change one thing at a time, and look for patterns.

This guide takes you through that process. It complements our guides to [increasing FPS](/gaming-performance/how-to-increase-fps-on-pc/), [optimizing Windows](/gaming-performance/how-to-optimize-windows-for-gaming/) and [fixing game lag](/troubleshooting/how-to-fix-game-lag/). For the wider picture, see our [complete gaming tips guide](/#pillar).

## First, describe the problem precisely

| Symptom | Likely area |
|---|---|
| Crashes on launch | Corrupted files, drivers, missing components, mods |
| Crashes after a while | Heat, memory, unstable overclock, memory leak |
| Crashes at the same point every time | Game bug, corrupted file or a specific setting |
| Freezes then catch-up | Storage, background task, shader compilation |
| Constant micro-stutter with high FPS | Frame-time spikes, VRAM, CPU limits |
| Black screen or driver reset message | GPU driver, power or heat |

Write down what happens, when it happens and what changed recently. This helps you find the cause faster. See [crash (computing)](https://en.wikipedia.org/wiki/Crash_(computing)) for background on why programs fail.

## Step 1: Restart and update

- **Restart your PC.** It clears temporary problems.
- **Update the game.** Developers often fix known crashes quickly.
- **Update Windows** and restart again.
- **Update your graphics driver** from the GPU manufacturer's website.

If the problem started right after a driver update, roll back to the previous version or try a clean install.

## Step 2: Verify the game files

Corrupted or missing files are a very common cause. Most launchers have a **verify** or **repair** option in the game's properties. Run it and let it finish. If a game still fails, uninstalling and reinstalling is a reasonable step, and it is better to install on an SSD with plenty of free space.

## Step 3: Disable overlays, mods and extras

Programs that hook into the game can cause crashes:

- Overlays from game launchers, chat apps, recording tools or hardware monitors
- Mods and custom files
- Third-party graphics injectors or filters
- Performance "booster" programs

Disable them all, test, and re-enable one at a time. If the crash disappears with them off, you have found the culprit.

## Step 4: Check temperatures

Heat is one of the most frequent causes of random crashes and stutter. A component that overheats will slow itself down, called thermal throttling, and may shut down the game or PC to protect itself. See [dynamic frequency scaling](https://en.wikipedia.org/wiki/Dynamic_frequency_scaling).

1. Install a monitoring tool or use your driver overlay to watch CPU and GPU temperatures while gaming.
2. Check whether temperatures climb steadily until a crash or until frame rate drops.
3. Clean dust from fans, filters and heatsinks (with the PC off and unplugged).
4. Check that fans spin, case airflow is not blocked and a laptop is on a hard surface.

If temperatures remain high after cleaning, consider re-applying thermal paste or asking a professional, particularly for laptops.

## Step 5: Return everything to default settings

Overclocks, undervolts and memory profiles can cause crashes that look like game bugs.

- **CPU and GPU:** reset any overclock or undervolt to defaults.
- **Memory profile (XMP or EXPO):** some combinations are unstable. Disable the profile temporarily to test.
- **Power limits:** make sure you have not capped power too low.

If the game becomes stable at default settings, reintroduce your tweaks gradually and use reputable guides.

## Step 6: Check memory and storage

- **System memory (RAM):** if your PC has less than the game recommends, close other programs. You can test memory with Windows Memory Diagnostic or a dedicated tool, and run it for a full pass.
- **Video memory (VRAM):** if stutter appears when you raise texture quality, you may have run out of VRAM. Lower textures one step.
- **Storage:** keep free space on your game drive. If you have frequent freezes during loading, check your drive's health with the manufacturer's tool. Installing the game on an SSD often reduces stutter.

## Step 7: Understand shader compilation

Many modern games compile shaders, small programs for the GPU, at first launch or after updates. During this process, you can get stutter until the cache is built. Let the game finish any "compiling shaders" step, and expect extra stutter for a few minutes the first time you see new areas. See [shader](https://en.wikipedia.org/wiki/Shader). After the first session, stutter should be much reduced. If it persists, look at other causes.

## Step 8: Clean driver installation

If crashes involve driver resets or black screens, a clean driver install can help. Download the latest driver, and choose the **clean installation** option in the installer if one exists. Some people use dedicated removal tools; use only well-known ones and follow their instructions carefully, because removing drivers incorrectly can cause problems. Restart afterward.

## Step 9: Look at power and hardware

- **Power supply:** a weak or failing power supply can cause crashes under load, particularly with powerful graphics cards. If crashes happen only in demanding games and all else is clean, this is worth considering.
- **Cables and connections:** make sure graphics card power cables are fully seated.
- **Controllers and USB devices:** disconnect unnecessary devices. A faulty USB device can cause freezes.

If you suspect a hardware fault, back up important files and seek professional help.

## Step 10: Read the clues

- **The game's error message:** search the exact text along with the game name.
- **Game logs or crash reports:** many games save them in the documents or app-data folder.
- **Windows Event Viewer and Reliability Monitor:** these list crashes and error codes with timestamps.
- **Patterns:** does it crash in a specific map, at a certain time or after a certain duration?

Patterns turn a vague problem into a specific one.

## Fixing stutter specifically

If the game runs at a high average but feels uneven:

1. **Check frame times,** not just FPS. Look for spikes in a frame-time graph, or compare average with 1 percent lows.
2. **Cap your frame rate** slightly below what your PC can sustain, which can produce more consistent frames. See [reducing input lag](/gaming-performance/how-to-reduce-input-lag-on-pc/).
3. **Lower CPU-heavy settings,** such as crowd density or view distance, if your CPU is the limit.
4. **Check background tasks** for scans, updates or syncing.
5. **Test adaptive sync flicker:** if stutter appears only with variable refresh, try a different cable or a lower refresh rate. See [monitor settings](/game-settings/best-gaming-monitor-settings/).

## Controller and input problems

If a controller disconnects or stutters:

- Try a wired connection and a different USB port.
- Update the controller's firmware.
- Check battery levels and wireless interference.
- Make sure other programs are not capturing the controller.

For tuning controllers, see [best controller settings](/game-settings/best-controller-settings-for-competitive-gaming/).

## When to ask for help

If the problem continues, gather the game name, your hardware, driver versions, what you tried and any error text. Share it on the game's official support page or community. Clear, specific information gets better answers than "my game crashes". If you think a game is simply broken for everyone, check for patch notes and wait for a fix.

## What not to do

- **Do not try ten fixes at once.** You will not know which one worked.
- **Do not download "fix" programs from unknown sources.** They are a common way to get malware.
- **Do not disable security software permanently.**
- **Do not ignore overheating.** It can damage hardware.

## A troubleshooting log template

Writing things down makes a hard problem much easier. Keep a short log like this:

| Date | What I changed | Result | Keep or undo |
|---|---|---|---|
| Day 1 | Updated graphics driver | Still crashes after 20 minutes | Keep |
| Day 1 | Verified game files | No change | Keep |
| Day 2 | Removed overlay | Crash after 40 minutes | Keep |
| Day 2 | Cleaned dust, temps dropped | No crash in two hours | Keep |

A log protects you from changing too many things, from repeating tests and from forgetting what worked. If you need to ask for help later, it is also the best information you can share.

## Preventing problems in the future

Once your game is stable, a few habits keep it that way.

- **Keep a restore point** before major driver or system changes.
- **Update drivers sensibly.** You do not need to install every release the day it appears. If your games work well, waiting for a release that fixes a specific issue is reasonable.
- **Clean your PC** every few months.
- **Keep an eye on temperatures** when you change hardware or settings.
- **Back up important files,** since crashes can sometimes be a sign of failing hardware.
- **Do not stack tweaks.** Fewer modifications mean fewer surprises.

## Know when to stop

Some problems are not worth hours of effort. If a single game crashes while everything else is stable, check its support page and community for known issues, and consider waiting for a patch. If every demanding game crashes after a hardware change, return to the change you made and undo it. Knowing when the evidence points away from you saves time and frustration.

## Key takeaways

- Describe the symptom precisely, because crashes, freezes and stutter have different causes.
- Restart, update the game, Windows and graphics driver, and verify the game files.
- Check temperatures, and return overclocks and memory profiles to defaults to test for instability.
- Remove overlays and mods, then add them back one at a time.
- Keep a short log of what you changed, and read the crash information for patterns.

Change one thing at a time. A methodical hour usually beats a frantic evening of random fixes.

## Frequently asked questions

Common questions about crashes and stutter are answered below. Work through the steps in order and look for patterns, and the cause usually appears quickly.
