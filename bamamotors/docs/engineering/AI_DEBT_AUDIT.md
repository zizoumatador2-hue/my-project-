# AI Debt Audit: BamaMotors

**Scope:** the `bamamotors/` app (Astro 5 SSR on Cloudflare Workers + D1 + R2), which is the product in PR #2. The TrustTransfer app at the repository root is a separate product on the base branch and is out of scope.

**Date:** 2026-10-11

**Method:**
- Read every route, lib module, component, client script and build script.
- Searched for each pattern in the brief: `any`, unsafe casts, `catch`, `console`, `TODO`, `href="#"`, placeholder copy, suspicious file names, unused exports and components.
- Traced every user-visible feature to its database writes and reads.
- Checked production state through D1 and the latest deploy log.

**Overall:** the codebase is small and consistent.
- 1 framework, 1 styling approach (a single global stylesheet), 1 validation library (zod), 1 DB helper (`lib/db.ts`) and 1 icon set (`Icon.astro`).
- No lorem ipsum, fake reviews, fake counts or `href="#"`.
- No `any`, no `@ts-ignore`, and strict TypeScript.
- The real debt is concentrated in a few places:
  - **Features that look complete but silently do nothing** in the current production configuration (email and admin notifications).
  - **One validation gap.**
  - **Duplicated enumerations.**
  - **A dormant image pipeline.**

Status: **Fixed** = changed in this pass. **Documented** = left as is on purpose (reason given). **Owner** = needs a business decision.

| # | Category | File(s) | Evidence | Impact | Action | Risk | Status |
|---|---|---|---|---|---|---|---|
| 1 | Code that looks complete but doesn't act | `pages/forgot-password.astro`, `lib/email.ts` | Production has no `RESEND_API_KEY` (deploy log: `RESEND_API_KEY:` empty, "syncing 0 secrets"). `sendEmail` only logs the message, but the page says "we've sent a reset link". | Users wait for an email that never comes, so password reset is impossible. | Show an honest message with the contact address when email delivery is off. | Low | Fixed |
| 2 | Fake confirmation | `components/LeadForm.astro` | Success box says "A copy was emailed to you" whether or not email is configured. | False claim to shoppers. | Only claim the copy when email is enabled. | Low | Fixed |
| 3 | Fake confirmation | `pages/dashboard/profile.astro` | "Leads are emailed to your lead email" is false without Resend. | Dealers may miss leads. | Copy depends on email status; leads always show in the dashboard. | Low | Fixed |
| 4 | Notifications nobody can see | `lib/email.ts` `notifyAdmins`, `pages/admin/index.astro` | Rows are written for admins (dealer sign-ups, contact messages, site leads, **featured-listing requests**), but no admin page reads them. | When Stripe is off, a dealer's "feature this vehicle" request goes nowhere. | Show notifications on the admin overview (shared component with the dealer dashboard). | Low | Fixed |
| 5 | Split validation | `lib/validation.ts` `vehicleSchema`, `lib/vehicle-save.ts` | The zod schema accepted any string for body type, fuel, transmission, drivetrain and colors. A second, manual pass in `saveVehicle` checked them against the constants. Condition, title status and listing status were checked only by hard-coded zod enums. | Two places to keep in sync. Option errors were reported only after every other field passed. | All option checks now live in the schema, built from the shared constants; the manual pass is removed. | Low (covered by a new unit test) | Fixed |
| 6 | Duplicated definitions | `lib/constants.ts`, `lib/validation.ts`, `components/VehicleForm.astro`, `pages/vehicles/[slug].astro` | Title status values and labels are defined 4 times (the constant `TITLE_STATUSES` is unused). Condition and listing-status enums are repeated in zod. | Drift risk: a new value must be added in 4 places. | One source in `constants.ts` with labels. | Low | Fixed |
| 7 | Dead code | `lib/format.ts` `formatMileage`, `lib/settings.ts` `clearSettingsCache`, `lib/vehicles.ts` `mediaUrl`, `lib/constants.ts` `LeadStatus` | 0 references outside their definition (searched src, tests, scripts). | Noise. | Removed. | None | Fixed |
| 8 | Abandoned integration | `scripts/fetch-pexels.mjs`, deploy workflow | Pexels stopped issuing API keys. 0 of 44 site images come from Pexels (manifest: 14 Commons, 30 fal.ai). The step still runs on every deploy. | Dead step, dead secret wiring, misleading docs. | Remove the script, its workflow step and its env var. | None | Fixed |
| 9 | Misleading name | `content/pexels.json` | Read by the Commons and fal.ai scripts, not Pexels. | Confusing for maintainers. | Renamed to `content/image-requests.json`. | None | Fixed |
| 10 | Inaccurate public copy | `pages/photo-credits.astro`, `lib/images.ts` | "Photos … come from Pexels and Wikimedia Commons"; no photo comes from Pexels. | Inaccurate attribution page. | Credit only the sources in use. | None | Fixed |
| 11 | Unverified promise | `pages/contact.astro` | "We usually reply within one business day": an SLA nobody has committed to. | Unsupported claim. | Neutral wording. | None | Fixed |
| 12 | Insecure redirect gap | `middleware.ts` | Deploy smoke test: `http://bamamotors.com/` → **200** (no HTTPS redirect). | Plain-HTTP pages are served, so HSTS is never seen on first visit. | Production 301 from `http:` to `https:`. | Low | Fixed |
| 13 | Internal errors shown to users | `pages/dashboard/billing.astro`, `pages/dashboard/vehicles/index.astro` | `err = (e as Error).message` shows raw Stripe API messages (e.g. "No such price: price_…"). | Leaks configuration details; not actionable. | Log server-side; show an actionable message. | Low | Fixed |
| 14 | Silent failure | `scripts/save.ts` | A failed save reverts the heart icon with no message. | The user thinks the click didn't register. | Toast on failure. | None | Fixed |
| 15 | Links into empty pages | `pages/index.astro` (hero quick links), `components/Footer.astro` | Hard-coded links to `/used-cars/trucks`, `/suvs`, `/under-10000`. With 0 inventory these are empty noindex pages. | Dead ends for shoppers and wasted crawl. | Show only the links whose landing page is indexable (same rule as the rest of the site). | Low | Fixed |
| 16 | AI-flavored comments | `pages/sitemap.xml.ts`, `pages/blog/category/[slug].astro` | Comments that justify honesty ("a fake today would only add noise", "Built from the real category description") rather than explain code. | Noise. | Reworded or removed. | None | Fixed |
| 17 | Dependency advisories | `package.json` (astro 5.18, @astrojs/cloudflare 12.6) | `npm audit --omit=dev`: 10 advisories. The fixes need Astro 6/7 and adapter 14 (major upgrades). | See analysis in PROFESSIONALIZATION_REPORT §10: none is reachable in this app (passthrough image service, no prerendering, no View Transitions, no server islands, no user-controlled attribute names; `define:vars` only receives a regex-validated GA ID). `undici` and `ws` are in the local dev runtime only. | Applied the non-breaking `npm audit fix`. Schedule the Astro major upgrade as its own change. | Medium (major upgrade) | Documented |
| 18 | Type assertions | `middleware.ts` (`caches`), `pages/media/[...key].ts` (R2 body), `scripts/lead-form.ts` (`gtag`) | `as unknown as` in 3 places. | Each one bridges a real gap between the Workers runtime and the DOM type libraries. | Kept; each is commented or self-evident. | — | Documented |
| 19 | Non-null assertions | `Astro.locals.user!` / `dealer!` in dashboard/admin pages | ~20 uses. | Guaranteed by the middleware access control, which redirects before rendering. | Kept. | — | Documented |
| 20 | Swallowed parse errors | `lib/markdown.ts` `parseFaq`, `lib/dealers.ts` `parseHours`, `pages/blog/[slug].astro` (HowTo JSON) | `catch { return [] }`. | Intentional: malformed optional JSON must not break a page. | Kept. | — | Documented |
| 21 | Fake success for bots | `pages/api/leads.ts`, `pages/contact.astro` | Honeypot field returns success. | Intentional anti-spam: bots must not learn they were caught. | Kept. | — | Documented |
| 22 | Decorative effects | `styles/global.css` (`.aurora`, `.shiny-text`, `.btn-shine`, `.star-border`, `.blur-text`, `.spotlight`) | Animated gradient blobs, shine sweeps, a spinning border and blur-in headline text. These match the "generic AI visual" list. | Visual noise; all are disabled under `prefers-reduced-motion`. | **Owner:** added on the owner's explicit request ("React Bits effects"), so kept. See owner decisions. | — | Owner |
| 23 | `meta keywords` | `layouts/BaseLayout.astro`, `lib/landing.ts`, admin settings and post form | Keyword lists are emitted on every page. Google ignores them; long lists read as stuffing. | Low. | **Owner:** removing them also removes an admin field, so this is left as a decision. | — | Owner |
| 24 | Audit log never displayed | `lib/db.ts` `audit()` | Admin actions are written to `audit_log` but there is no screen for them. | Forensics only through D1. | Kept (a write-only audit log is a legitimate design); noted. | — | Documented |
| 25 | Migrations step always fails | deploy workflow | `wrangler d1 migrations apply` → 7403 (the token lacks D1 permission). `continue-on-error` is set; the app seeds itself via `lib/bootstrap.ts`. | Red step in every deploy log. | **Owner:** give the API token D1 Edit permission, or remove the step. | — | Owner |

## Patterns searched and not found
- Files named final/updated/fixed/v2/latest/copy/backup.
  - `new.astro` files are the "create" routes, not copies.
  - The two `*_copy_refresh.sql` migrations are intentionally separate: applied migrations never re-run.
- `any`, `@ts-ignore`, blanket eslint disables (the two disables are scoped and explained).
- `console.log` debugging (one `console.error` in the Stripe webhook, which is correct).
- `TODO` / `FIXME`, lorem ipsum, `href="#"`.
- Mocked API responses, hard-coded user IDs, roles or prices in logic.
  - Plan prices live in `lib/plans.ts` and are shown on /for-dealers.
  - The featured price is an admin setting.
- Fake payment success: the Stripe return URL only shows a message; subscription state changes only through the signed webhook or an admin.
- Fake reviews, ratings, testimonials or customer counts.
  - Homepage stats are live counts.
  - Vehicle and dealer counts are hidden at 0.
- Duplicate clients or systems:
  - 1 DB helper, 1 fetch to each external API, 1 toast (`scripts/save.ts`).
  - No modal library; 1 form approach (server POST + zod); 1 date formatter (`lib/format.ts`).
- Unused components, layouts or client scripts: none.
