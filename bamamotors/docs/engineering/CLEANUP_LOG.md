# Cleanup Log: BamaMotors

Every removal was checked first:
- Static imports, dynamic imports and string references across `src/`, `scripts/`, `tests/`, `content/`, `.github/` and the configs.
- Astro's file-based routing: files in `src/pages` are loaded automatically, so none of them were treated as unused.

## Removed

| Item | Type | Evidence it was unused | Replacement |
|---|---|---|---|
| `scripts/fetch-pexels.mjs` | Build script | Pexels no longer issues API keys and `PEXELS_API_KEY` was empty. 0 of 44 entries in `src/data/images.json` have `source: 'Pexels'`. | None; Wikimedia Commons and fal.ai cover every slot. |
| Pexels step, `PEXELS_API_KEY` env | Deploy workflow (`.github/workflows/bamamotors-deploy.yml`) | Same as above; the step printed "PEXELS_API_KEY not set — skipping" on every deploy. | None |
| `'Pexels'` in `SiteImage['source']` | Type union (`src/lib/images.ts`) | No image can carry it any more. | None |
| `formatMileage` | Export (`src/lib/format.ts`) | 0 references outside its definition. | `formatNumber` (already used for mileage). |
| `clearSettingsCache` | Export (`src/lib/settings.ts`) | 0 references; `saveSettings` already clears the cache itself. | None |
| `mediaUrl` | Export (`src/lib/vehicles.ts`) | 0 references; pages build `/media/${key}` inline. | None |
| `LeadStatus` | Type (`src/lib/constants.ts`) | 0 references. | None |
| Manual option checks in `saveVehicle` | Logic (`src/lib/vehicle-save.ts`) | Duplicated the job of the zod schema. | The same checks in `vehicleSchema`. |
| Inline status lists (×6) and title-status label maps (×2) | Duplicated literals | Replaced by `TITLE_STATUSES` and `VEHICLE_STATUSES` (with labels) and `isVehicleStatus()` in `constants.ts`. | Shared constants |
| Duplicate notifications query and markup in the dealer dashboard | Markup | Moved into `NotificationsPanel.astro`, now shared with the admin overview. | Component |

## Renamed

| From | To | Why |
|---|---|---|
| `content/pexels.json` | `content/image-requests.json` | It is the list of image slots read by the Commons and fal.ai scripts, not Pexels. |

## Kept on purpose (looked unused or redundant but isn't)

- `src/pages/**/new.astro`: the "create" routes, not copies.
- `migrations/0005_copy_refresh.sql` and `0006_copy_refresh.sql`: applied migrations never re-run, so each copy revision needs its own file.
- `src/lib/bootstrap.ts`: seeds production on first request, because the deploy token can't run D1 migrations.
- Exported types used only inside their own module (`Post`, `UrlEntry`, `SaveResult` …): part of each function's signature.
- `audit_log` writes: a write-only audit trail is intentional.
- `content/makes.mjs`, `content/cities.mjs`: inputs to `scripts/build-seed.mjs`.

## Dependencies
- No package was unused:
  - `marked`: Markdown rendering.
  - `zod`: validation.
  - `sharp`: image scripts and brand assets.
  - `zipcodes`: the seed builder's ZIP table.
  - `@fontsource-variable/manrope`: the self-hosted font file.
- `npm audit fix` (non-breaking only) updated `sharp` 0.35.4 → 0.35.5, `workerd`/`miniflare` 1.20260926 → 1.20261006 and `@cloudflare/workers-types`.
- Production advisories went from 10 to 8. The rest need the Astro 6/7 major upgrade; see PROFESSIONALIZATION_REPORT §10.
