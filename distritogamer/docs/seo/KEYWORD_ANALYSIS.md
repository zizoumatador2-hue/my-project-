# Keyword analysis (Google Keyword Planner export, 2026-11-28)

Source: `Keyword_Stats_2026-11-28_at_00_06_27.csv`, 466 keywords, USD, US market.

## What the data can and cannot tell us
- Volumes are Keyword Planner buckets (500, 5,000, 50,000, 500,000). Treat them as orders of magnitude.
- The file has no organic position, click or impression data. The site launched recently and Search Console shows 0 indexed pages so far, so no ranking gain can be measured from this file yet.
- "Competition" is ad competition, not SEO difficulty. A low ad-competition term can still be hard to rank for.

## Method
1. Keep only **Competition = low** (منخفض) and volume ≥ 500 (189 keywords).
2. Keep only topics the site can answer truthfully (gaming tips, settings, performance, troubleshooting, game guides). Drop news, free-to-play lists and generic "video games" terms.
3. Map each kept term to one existing page, or to a planned article. One primary term per page.

Terms with high ad competition (gear terms such as "best gaming mouse", "best gaming headset", "best gaming pc") are kept on their existing gear guides, but they are not used as primary targets. Those pages are judged on their content.

## Priority map

| Keyword | Volume | Ad competition | Target page | Action |
|---|---|---|---|---|
| elden ring guide | 50,000 | low | `/game-guides/beginners-guide-to-elden-ring/` | Title now leads with "Elden Ring Guide" |
| elden ring game / elden ring games | 50,000 | low | `/games/elden-ring/` | Profile title and summary cover the game name |
| fps games | 50,000 | low | `/gaming-tips/how-to-improve-aim-in-fps-games/` | Already in keywords |
| fps shooter games / first person shooters | 50,000 / 5,000 | low | FPS aim guide (internal link) | Kept in keywords; no separate list page yet |
| game lag | 5,000 | low | `/troubleshooting/how-to-fix-game-lag/` | Already the title focus |
| game ping | 5,000 | low | `/troubleshooting/how-to-fix-game-lag/` | Added to keywords |
| fps boost / fps pc / low fps | 5,000 / 500 / 500 | low | `/gaming-performance/how-to-increase-fps-on-pc/` | Added to keywords |
| reduce the lag / latency for gaming | 500 | low | `/gaming-performance/how-to-reduce-input-lag-on-pc/` | Added to keywords |
| game mode | 5,000 | low | `/gaming-performance/how-to-optimize-windows-for-gaming/` | Added to keywords |
| low latency mode | 5,000 | low | `/gaming-performance/how-to-reduce-input-lag-on-pc/` | Covered in body (low-latency section) |
| aim assist | 5,000 | low | **New article** `/game-settings/aim-assist-explained/` | Created this round |
| game guide | 5,000 | low | `/game-guides/` category | Category intro mentions guides |
| strategy games / best strategy game | 50,000 / 5,000 | low | Not yet covered | Candidate for a future genre guide (needs verified game facts) |
| fighting games | 50,000 | low | Not yet covered | Candidate, not started |
| role playing games / single player games | 50,000 / 5,000 | low | Not yet covered | Candidate, not started |
| start playing games | 5,000 | low | Overlaps `gaming-tips-for-beginners` | Do not create a second beginner page; strengthen the existing one later |

## Deliberately not targeted
- "video games", "gaming sites", "gaming websites", "play gaming" (very high volume, but unrelated to the site's purpose or to a helpful answer we can give).
- "make a game", "game create", "build your own video game" (game development, not covered).
- "patch notes", "game offers" (news or deals, not a site category).
- Keywords with blank bids and no clear intent ("the beginner guide", "one more game").

## Changes made in this round
- Elden Ring beginner guide: SEO title now starts with "Elden Ring Guide for Beginners".
- Added the keywords above to the matching articles' `keywords` field (used only for the meta keywords tag, which search engines largely ignore; titles and descriptions are what matter).
- New article: "Aim Assist Explained" (target: aim assist).

## Next review
Re-export Keyword Planner and Search Console data after 28 days. Compare impressions and average position per target page before changing anything else.
