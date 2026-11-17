# AI-generated debt audit

Scope: `fountainfinances/` at branch `ccr-4c37af84-sa32vb`, after the admin dashboard commit. Method: targeted searches (filenames, TODO markers, console output, `any`, placeholder copy, `href="#"`, unused modules, dependency imports, duplicated data) plus reading the code paths involved. Nothing has been deleted or changed by this audit.

Status values: **Open** (not addressed), **Verified clean** (searched, nothing found), **Needs check** (suspected, not confirmed).

## Findings

| # | Category | File | Evidence | Impact | Recommended action | Risk of change | Status |
|---|---|---|---|---|---|---|---|
| 1 | Abandoned component | `src/components/reactbits/Aurora.tsx`, `Aurora.css` | No imports anywhere in `src/`. The homepage aurora was removed in the homepage performance pass. | Dead code in the repo; `ogl` dependency is only used here. | Delete both files. | Low: no import references. | Open |
| 2 | Abandoned component | `src/components/reactbits/BlurText.tsx` | No imports. Replaced by CSS word animation on the hero. | Dead code; contains `as any` (line 56). | Delete. | Low | Open |
| 3 | Abandoned component | `src/components/reactbits/Magnet.tsx` | No imports. Magnet wrappers were removed from the hero CTAs. | Dead code, pointer-tracking logic. | Delete. | Low | Open |
| 4 | Abandoned component | `src/components/reactbits/ShinyText.tsx`, `ShinyText.css` | No imports. Replaced by CSS `.shiny-text`. | Dead code. | Delete. | Low | Open |
| 5 | Unused dependency | `package.json` → `ogl` | Only imported by `Aurora.tsx`. | Install weight, unused package. | Remove after finding 1. | Low | Open |
| 6 | Unused dependency | `package.json` → `@fontsource-variable/inter`, `@fontsource-variable/source-serif-4` | No imports in `src`, `functions`, `scripts`, `tests`, or config. Fonts are self-hosted from `public/fonts/`. | Unused dev dependencies that suggest the wrong font source. | Remove both. | Low | Open |
| 7 | Inconsistent folder | `src/components/reactbits/` | Mixes React (`.tsx`) and Astro (`.astro`) components, and the README describes the old set. | Confusing for maintainers. | Keep `CountUp.tsx` and the `.astro` components; update the README; move or document the rest. | Low | Open |
| 8 | Type shortcut | `src/components/reactbits/BlurText.tsx:56` | `as any` cast. | Hides type errors. | Resolved by finding 2. | None | Open (via #2) |
| 9 | Hardcoded copy that can drift | `src/pages/index.astro` (the "Compare. Learn. Plan." card) | "Thirteen free calculators…" is typed by hand, while other places use `CALCULATORS.length`. | If a calculator is added, the number is wrong. | Generate the count from `CALCULATORS.length`. | Low | Open |
| 10 | Hardcoded figure | `src/pages/index.astro` (stats band) | "$0 cost to you, no sign-up" is a literal. | Acceptable as a policy statement; it becomes false if a paid feature is added. | Keep, but review when pricing changes. | None | Open |
| 11 | Silent error swallowing | `functions/api/contact.ts` (waitUntil send) | `sendEmail(...).catch(() => undefined)`. The message is saved first, so no data is lost, but an email failure is invisible. | Owner may miss messages without any signal. | Record failed sends (for example, a flag on the row or an audit-style entry) and show them in `/admin/health`. | Medium: touches the public contact form. | Open |
| 12 | Silent error swallowing (admin) | `functions/admin/health.ts`, `functions/admin/index.ts` | `.catch(() => null)` on count and audit queries. | Intentional: health checks must still render if one table is broken, and the result is shown as "Unreadable". | Keep; document. | None | Open (documented) |
| 13 | Duplicate-looking CSS | `src/styles/critical.css`, `public/global.css` | Both define hero and card rules, for example `.hero-cine` and `.card`. | Two places to change the same style; the later rule wins. | Compare selectors, keep one source for each rule. | Medium: visual regressions possible. | Needs check |
| 14 | Documentation overclaim | `docs/cinematic/CINEMATIC_HOMEPAGE_REPORT.md` | Describes a verdict and a "Built" list. Some items in the storyboard are marked deferred, which is correct, but the report was written before the final CSS-only pass. | A reader may believe more was built than was. | Re-check each claim against the code; add a note that the storyboard is the source of truth. | Low | Needs check |
| 15 | Documentation sprawl | `docs/` (`ADMIN.md`, `ADMIN-DASHBOARD.md`, `cinematic/*`, `professionalization/*`) | Several long reports, some overlapping. | Harder to find what matters. | Keep one README index per area; archive the rest. | Low | Open |
| 16 | Stale README | `src/components/reactbits/README.md` | Lists Aurora, BlurText, ShinyText, and CountUp behaviour that no longer applies. | Misleading. | Rewrite to match the files that remain. | Low | Open |

## Checked and clean (no finding)

- **Suspicious filenames** (`final`, `backup`, `copy`, `v2`, `latest`, `old`, `.bak`): none.
- **TODO / FIXME / HACK / XXX** in `src`, `functions`, `scripts`, `public/js`: none. The only match is a banned-phrase pattern in `scripts/qa.mjs`, which is intentional.
- **console.log** outside build scripts: none. Build scripts log progress on purpose.
- **`any` / `as any`**: one occurrence, in finding 8. Strict TypeScript is on.
- **Lorem ipsum, "coming soon", placeholder copy**: none found in `src`.
- **`href="#"` links**: none.
- **Fabricated customer counts, fake reviews, fake testimonials**: none found in `src`.
- **Fake payments, mocked APIs, hardcoded user IDs or roles**: the project has no payments, no user accounts, and no roles. The admin uses Cloudflare Access, so there is nothing hardcoded to find.
- **Unused pages or routes**: all 13 calculator data entries have a page, and every page has a data entry.
- **Dead library code** in `src/lib` and `src/data`: every module is imported somewhere.
- **Forms that do not submit**: the newsletter and contact forms post to real endpoints. Calculator forms compute on the page, and the search page filters a static index. The admin forms are real and tested.
- **Duplicate toast, modal, or form libraries**: none. The project has one of each concern.
- **Duplicate state management or API clients**: none. The public site uses plain `fetch` in a few small scripts.

## Notes

- The largest debt in this repository is not a copy-paste problem. It is the reactbits folder left over from the performance pass (findings 1 to 5, 7, 8, 16). Each piece was correct when added and is now dead weight. Removing it is low risk because nothing imports it.
- Several large files are reasonable for their role (`index.astro` at 247 lines, `BaseLayout.astro` at 138, the admin modules at under 140 lines each). No file is large enough to justify a split on size alone.
- The admin code was written in one pass and tested end to end, so it is cleaner than the public-site history. The public site accumulated more changes and has more of the debt above.
