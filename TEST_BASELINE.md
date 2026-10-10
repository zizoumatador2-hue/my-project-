# TEST_BASELINE

Recorded before adding or changing any test. Nothing below was edited to make results pass.

## Environment

- Node v22.22.0, npm 10.9.4 (CI uses Node 22).
- Chromium for Playwright: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (preinstalled; `PW_CHROMIUM` points to it).
- Local Worker: `scripts/dev-restart.sh --fresh` on port 8787, which applies D1 migrations to local state.
- `.dev.vars` was created from `.dev.vars.example` with a random `DATA_ENCRYPTION_KEY`-style value. It is gitignored and was not committed.

## Results

| # | Step | Command | Result | Classification |
|---|---|---|---|---|
| 1 | Install | `npm ci` | exit 0, 94 packages | clean |
| 2 | Typecheck | `npm run typecheck` (worker and web tsconfigs) | exit 0 | clean |
| 3 | Unit and integration, **Worker not running** | `npx vitest run` | 35 passed, 10 failed, all `ECONNREFUSED 127.0.0.1:8787` | **environment failure**, not a product bug. The integration suite needs the Worker running; CI starts it, this run did not. |
| 4 | Start Worker | `./scripts/dev-restart.sh --fresh` | "ready" | clean |
| 5 | Unit and integration, **Worker running** | `npx vitest run` | **45 passed, 0 failed** | clean |
| 6 | Production build | `npm run build` | exit 0, bundles built | clean |
| 7 | E2E, mobile and desktop | `PW_CHROMIUM=... npx playwright test` | **30 passed, 0 failed**, 3.0 min | clean on this run (one run only) |
| 8 | ChayStore build and links | `cd chaystore && npm run build && npm run check:links` | 46 pages, 0 problems (after the three new articles) | clean |

## Flaky or unexplained

- **`tests/e2e/resilience.spec.ts:57` "unauthorized users are redirected and blocked from admin".** It failed in CI run 37414587174 (PR #4, head `91a580b`). It passed here in the step-7 run, on both the mobile and desktop projects. **Not reproduced in one local run, cause not found.** Status: flake candidate. It is a redirect test on the admin route, so timing is the first suspect. Do not hide this. Re-run it 10 times before calling it fixed. The fix must target the cause, not add a retry.

## Skipped and ignored

- No `.skip`, `.todo`, `.only`, or `xit` markers were found in `tests/`.
- No test is marked as expected failure.
- **Not audited yet:** whether any assertion is truthy-only or always passes. This needs a mutation check (break the code path and confirm the test goes red). That is the next step before any new test is trusted.

## Missing tooling (found, not failed)

- No lint script exists in either package.json.
- No formatter check exists.
- No coverage tool is configured.
- No accessibility tool (axe) is installed.
- No visual regression tool is configured.
- No secret scanner runs in CI.
- Migrations are applied by the local dev script, but no separate migration validation job exists.

These are not failures. They are gaps. They are listed in the risk matrix.

## Known risk in CI configuration

- `deploy.yml` (production deploy on push to `main`) runs typecheck and **unit tests only**. It does not run integration or E2E tests, and it does not wait for the `CI` workflow. A regression caught only by integration or E2E tests can reach production.
- `ci.yml` runs the full suite (typecheck, build, Worker, vitest, Playwright) on pull requests and pushes to `main`. Its result does not gate the deploy job.

## Product bugs found in this baseline

None confirmed. The only red result was the environment failure in step 3 and the single unexplained flake above.

## Commands that reproduce this baseline

```bash
npm ci
npm run typecheck
npm run build
./scripts/dev-restart.sh --fresh
npx vitest run
PW_CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npx playwright test
cd chaystore && npm ci && npm run build && npm run check:links
```

## Next steps (in order)

1. Re-run `resilience.spec.ts:57` 10 times and record the results in `FLAKY_TEST_REPORT.md`.
2. Mutation-check the existing R0 tests (escrow, webhook signature, admin authorization) so that known-good tests are trusted.
3. Add the missing R0 tests from `REGRESSION_RISK_MATRIX.md`, starting with webhook idempotency and concurrent withdrawal.
4. Change the deploy job so it requires the integration and E2E suites to pass, or document why it does not.
