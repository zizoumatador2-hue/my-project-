---
title: "How to Fix Game Lag: Ping, Packet Loss and Stutter Explained"
seoTitle: "How to Fix Game Lag: Ping, Packet Loss and Stutter"
description: "Fix game lag by finding the cause: high ping, packet loss, Wi-Fi problems or low FPS. Step-by-step checks for network, router, PC and game server issues."
category: troubleshooting
tags: [lag, ping, packet loss, network, wifi]
keywords: [how to fix game lag, game lag, high ping fix, packet loss gaming, reduce lag online games, gaming troubleshooting guide]
published: 2026-09-30
quickAnswer: "To fix game lag, first decide whether it is high ping, packet loss or low FPS. For network lag, switch to a wired connection, pause other downloads, restart your router, pick a closer server and check for packet loss. For FPS lag, lower graphics settings and check temperatures and background apps."
imageAlt: "Illustration of glowing Wi-Fi signal arcs above a dot on a dark blue background"
imageQuery: "router and ethernet cable"
related: [how-to-reduce-input-lag-on-pc, how-to-increase-fps-on-pc, fix-game-crashes-and-stuttering, best-gaming-monitor-settings]
products: [ethernet-cable]
productsHeading: "A simple gear fix for Wi-Fi lag"
hasAffiliate: true
popular: 9
howTo:
  name: "How to fix game lag"
  totalTime: "PT30M"
  steps:
    - name: "Identify the type of lag"
      text: "Check whether the problem is high ping, packet loss or low frame rate, using the game's network and FPS displays."
    - name: "Use a wired connection"
      text: "Connect with an Ethernet cable instead of Wi-Fi."
    - name: "Stop other network use"
      text: "Pause downloads, streams and cloud backups on your network."
    - name: "Restart your router and modem"
      text: "Power them off for a minute and restart them."
    - name: "Choose a closer server"
      text: "Select the game server region closest to you."
    - name: "Check for packet loss"
      text: "Run a ping test to your router and a public server, and look for dropped packets."
    - name: "Fix FPS problems separately"
      text: "Lower graphics settings and check temperatures if frame rate, not ping, is the problem."
faq:
  - q: "What is a good ping for gaming?"
    a: "Lower is better, but most players find under about 50 milliseconds very comfortable, and under 100 acceptable for many games. Fast competitive games feel better at lower values. Stability matters as much as the number, so large spikes feel worse than a steady, slightly higher ping."
  - q: "Is lag caused by my internet speed?"
    a: "Usually not. Games use little bandwidth. Lag is more often caused by latency, packet loss, Wi-Fi interference, congestion from other devices or the game's servers. A fast connection can still lag if it is unstable."
  - q: "Why does my game lag only at night?"
    a: "Evening is when many households and servers are busiest, so congestion on your network, your internet provider or the game's servers can increase. Try a wired connection and a different server region, and check whether other devices are streaming."
sources:
  - title: "Lag (video games) (Wikipedia)"
    url: "https://en.wikipedia.org/wiki/Lag_(video_games)"
  - title: "Ping (networking utility) (Wikipedia)"
    url: "https://en.wikipedia.org/wiki/Ping_(networking_utility)"
  - title: "Packet loss (Wikipedia)"
    url: "https://en.wikipedia.org/wiki/Packet_loss"
---
"Lag" is the most overused word in gaming. People use it for choppy visuals, delayed actions, rubber-banding and disconnections, even though these have different causes and different fixes. The fastest way to solve lag is to work out which kind of lag you actually have, then apply the right fix.

This guide helps you diagnose the problem and fix it in order, from the quickest checks to the deeper ones. It complements our guides on [increasing FPS](/gaming-performance/how-to-increase-fps-on-pc/), [reducing input lag](/gaming-performance/how-to-reduce-input-lag-on-pc/) and [fixing crashes and stuttering](/troubleshooting/fix-game-crashes-and-stuttering/), as well as our [complete gaming tips guide](/#pillar). For background, see [lag in video games](https://en.wikipedia.org/wiki/Lag_(video_games)).

## Step 1: What kind of lag is it?

| Symptom | Likely cause | Where to look |
|---|---|---|
| Visuals look choppy even in single-player | Low frame rate or stutter | Your PC: settings, temperatures, background apps |
| Actions happen late online, but visuals are smooth | High ping | Your network, server distance |
| Players or objects jump or teleport (rubber-banding) | Packet loss or unstable connection | Wi-Fi, router, provider |
| Controls feel heavy even offline | Input lag | See [reduce input lag](/gaming-performance/how-to-reduce-input-lag-on-pc/) |
| Sudden freezes then catch-up | Network spikes or stutter | Test both network and PC |

Many games show **ping** (also called latency, in milliseconds) and sometimes **packet loss** and **FPS** in an in-game display. Turn those on first; they make diagnosis much easier.

## Step 2: Fix network lag

### Use a wired connection

Wi-Fi is the most common cause of unstable online play because of interference and distance. Connect your PC or console to your router with an Ethernet cable. A basic Cat 5e or Cat 6 cable is enough. If running a cable across a room is hard, powerline adapters or a better Wi-Fi setup may help, but a direct cable is the most reliable.

### If you must use Wi-Fi

- Move closer to the router or remove obstacles.
- Use the 5 GHz band if you are close to the router, and the 2.4 GHz band for longer distances.
- Reduce interference from microwaves, cordless phones and neighboring networks by changing the Wi-Fi channel in your router settings.
- Avoid using the same Wi-Fi network for streaming and downloads while you play.

### Stop competing traffic

Downloads, video streams, cloud backups and game updates on the same network increase latency, even if they do not use all your bandwidth. Pause them during play. Some routers offer **Quality of Service (QoS)** settings to prioritize gaming; use them carefully, because poor setup can make things worse.

### Restart your equipment

Power off your router and modem for at least a minute, then restart them. This clears temporary problems. Restart your PC or console as well.

### Choose a closer server

Distance adds delay. Pick the nearest game server region in the game's settings, or a matchmaking region close to you. Playing on far-away servers will increase ping regardless of your connection quality.

## Step 3: Test for packet loss and high ping

**Ping** is the time a message takes to reach a server and return; see [ping](https://en.wikipedia.org/wiki/Ping_(networking_utility)). **Packet loss** is data that never arrives; see [packet loss](https://en.wikipedia.org/wiki/Packet_loss). Even small amounts of loss cause rubber-banding.

1. Open a command prompt (on Windows) and run a ping test to your router, which is usually 192.168.0.1 or 192.168.1.1. Check the results for dropped packets and time spikes.
2. Run another to a well-known public server and compare.
3. If the router test is unstable, the problem is inside your home network. If the router is stable but the public server is not, the problem is beyond your router, perhaps with your provider.
4. Use a speed test to confirm your connection works, but remember that games need stability more than speed.

Run tests at different times to check for patterns.

## Step 4: Check your provider and equipment

- **Old router:** a very old router may struggle with several devices. Updating its firmware or replacing it can help.
- **Router location:** place it high, central and in the open.
- **Provider issues:** if your tests show loss beyond your router, contact your provider and share your test results. Some peak-hour congestion is outside your control.
- **VPNs and proxies:** disable them while gaming, unless you use a gaming-specific route intentionally.

## Step 5: If it is FPS lag instead

If the game looks choppy but your ping is fine, the problem is performance. Work through [how to increase FPS on PC](/gaming-performance/how-to-increase-fps-on-pc/):

1. Update graphics drivers.
2. Lower expensive settings; see [best FPS settings](/game-settings/best-fps-settings-for-better-performance/).
3. Check temperatures for throttling.
4. Close background apps.

If stutter happens in bursts, see [fixing crashes and stuttering](/troubleshooting/fix-game-crashes-and-stuttering/).

## Step 6: Check the game itself

Sometimes the problem is not you:

- **Server problems:** check the game's official status page or social channels.
- **Patch day:** servers are often busy after updates.
- **Matchmaking region:** a low-population region may place you with distant players.
- **Known issues:** search the game's support pages for the issue.

If many players report the same issue, wait for a fix rather than changing your setup.

## A realistic troubleshooting order

1. Turn on ping, packet loss and FPS displays.
2. Switch to wired.
3. Stop other network use.
4. Restart the router and modem.
5. Select the closest server.
6. Test for packet loss.
7. Check for FPS problems.
8. Check server status and contact your provider if needed.

## What not to do

- **Do not buy a faster internet plan first.** Speed is rarely the problem.
- **Do not trust "lag fix" software.** Most do nothing useful.
- **Do not change many router settings at once.** You will not know what helped.
- **Do not blame the game before testing.** Simple fixes solve most cases.

## Understanding what a good connection looks like

Knowing what to expect makes testing less confusing. A healthy gaming connection has three qualities:

- **Low latency:** the time to reach the game server is small. Distance is the biggest factor, so a nearby server helps.
- **Low jitter:** the latency is steady from moment to moment. Large swings feel worse than a slightly higher but steady value.
- **No packet loss:** every piece of data that is sent arrives.

Many players focus on download speed, but games send small packets and need stability rather than bandwidth. A connection that is fast but unstable will lag, and a modest connection that is steady will feel fine. Also keep in mind that ping shown in the game may be measured differently from a ping test on your PC, so use the same measure when you compare.

## Common causes and quick checks

| Cause | How to check | Quick fix |
|---|---|---|
| Wi-Fi interference | Ping to the router is unstable | Switch to Ethernet or reposition |
| Other devices using the network | Lag appears when someone streams or downloads | Pause them or use a quality-of-service setting |
| Far server region | Ping is high but steady | Choose a closer region |
| Router problems | Restarting improves things for a while | Update firmware or replace an old router |
| Provider congestion | Evening lag, loss beyond the router | Contact your provider with test results |
| VPN | Lag starts after enabling it | Turn it off while gaming |
| Game server issues | Many players report the same problem | Wait for a fix |
| Low frame rate | Ping is fine but visuals are choppy | Improve performance |

## How to talk to your provider

If tests show that the problem is beyond your router, contact your provider with specific information. This makes it much more likely that they can help.

1. Say that you are seeing **packet loss or unstable latency**, not just "slow internet".
2. Give the time of day when it happens.
3. Share results of ping tests to your router and to a public server.
4. Say that you have tried a wired connection and restarted your equipment.
5. Ask whether there are known issues in your area.

Keep a short log of times and results. Providers take a pattern more seriously than a single complaint.

## Console and cloud gaming notes

- **Consoles:** most have a network test in their settings. Use it to check your connection, and use a wired connection if possible.
- **Cloud gaming:** services that stream games depend heavily on a stable, low-latency connection, and a wired connection to your router is strongly recommended.
- **Mobile hotspots:** these can work in a pinch but are usually less stable than home broadband.

## A note on Wi-Fi versus Ethernet in homes where a cable is hard to run

Not everyone can run a cable across a room. If that is you, a few alternatives may help.

- **Powerline adapters** send network signals through your home's electrical wiring. They can be more stable than Wi-Fi, though results depend on your wiring.
- **A mesh Wi-Fi system** with a node near your gaming spot can improve both signal and stability.
- **Moving the router** closer, or moving your gaming spot, may be the simplest fix.
- **Cable runners** along walls and under rugs can make a cable more practical than it looks.

Test after each change, using the same ping test, so that you know what helped.

## Key takeaways

- Work out whether the problem is ping, packet loss or low frame rate before you try fixes.
- Use an Ethernet cable, pause other network use, restart your router and pick a nearby server.
- Test for packet loss, because even small amounts cause rubber-banding.
- Speed rarely matters for games, while stability and distance do.
- Check the game's server status, and contact your provider with test results if loss is beyond your router.

Identify the type of lag first. It turns a vague complaint into a short checklist, and it stops you paying for a faster plan that was never the problem.

## Frequently asked questions

Common questions about game lag are answered below. The key habit is to identify the type of lag first, because ping, packet loss and low FPS each have a different fix.
