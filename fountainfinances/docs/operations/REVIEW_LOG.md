# Weekly quality review log

Scope: every guide in `src/content/guides/`, every comparison page (`src/content/comparisons/`, served at `/best/<slug>/`) and every calculator page (`src/pages/calculators/`, excluding the index). Legal, about, contact, search, admin, tag, archive, hub and topic pages are excluded. 60 pages in total, sorted by slug (ties broken by type) and split into 5 cohorts of 12:

| Cohort | Positions | First slug to last slug |
|---|---|---|
| 0 | 1-12 | 50-30-20-rule to credit-card-rewards-explained |
| 1 | 13-24 | credit-cards-for-beginners to high-yield-savings-accounts |
| 2 | 25-36 | home-affordability (calculator) to how-to-build-credit |
| 3 | 37-48 | how-to-freeze-your-credit to personal-loan-vs-credit-card |
| 4 | 49-60 | personal-loans (comparison) to what-is-debt-consolidation |

This week's cohort = ISO week number mod 5.

---

## 2026-11-15 (ISO week 2026-W46, cohort 1)

Context: AdSense rejected the site for "Low value content" (observed 2026-11-15). This review aimed for accuracy and usefulness, not more words.

Step 0: There was no earlier REVIEW_LOG, so no unpublished cohort needed reapplying. Changed `runs-on: ubuntu-latest` to `ubuntu-24.04` in `ci.yml`, `fountainfinances.yml` and `live-check.yml`. `deploy.yml` was left alone because it belongs to another site.

### Pages reviewed (12)

| # | Page | Result |
|---|---|---|
| 13 | /best/credit-cards-for-beginners/ | Improved: added a worked utilization example for a $300 secured line ($150 = 50%; under $90 keeps it below 30%, under $30 below 10%) that links to the utilization guide. Updated date changed. |
| 14 | /guides/credit-utilization-ratio/ | Reviewed; no change needed. The table and the 45% to 25% example arithmetic both check out. |
| 15 | /calculators/debt-consolidation/ | Calculator bug fixed: the red "more with the loan" color and its label stuck when inputs changed to the "never paid off" state or to no debts. Both are now reset on every recalculation. Confirmed in the browser. Math checked (fee gross-up, payoff loop). |
| 16 | /guides/debt-payoff-strategies/ | Reviewed; no change needed. Re-ran the avalanche/snowball example: payoff months 10/12/16 vs 3/9/16 and interest about $1,297 vs $1,486, which matches the page. |
| 17 | /guides/debt-to-income-ratio/ | Accuracy fix: the conventional-loan DTI row now states Fannie Mae's actual rule from Selling Guide B3-6-02 (50% max through DU; 36% manual, up to 45% with the required credit score and reserves). The old wording described 45% as typical and 50% as needing compensating factors. Updated date changed. The worked example (26.7% / 39.2% / 37.5%) is correct. |
| 18 | /calculators/emergency-fund/ | Edge cases fixed: zero expenses showed "Already there" / "Goal reached" (it now asks you to enter expenses). A deposit too small to reach the goal within 1,200 months showed "Add a monthly deposit" even though one was entered (it now shows "More than 100 years"). Confirmed in the browser. |
| 19 | /guides/emergency-fund-guide/ | Style only: removed 2 em dashes and fixed a comma splice. The figures are correct ($3,330 x 3/6, about 3.5 years to the goal, $50 x 26 = $1,300). Not substantive, so the date is unchanged. |
| 20 | /guides/financial-planning-for-beginners/ | Minor: removed an em dash and added the monthly-target arithmetic for the goal table ($2,000 / 6 = about $334, $40,000 / 60 = about $667). Date unchanged. |
| 21 | /guides/first-time-home-buyer-guide/ | Improved: added a worked "cash needed for a $300,000 home" table comparing 3% conventional, 3.5% FHA and 20% down (closing costs shown at an assumed 3% of the loan and labeled as illustrative), with a link to the closing-costs guide. Updated date changed. |
| 22 | /guides/hard-vs-soft-credit-inquiry/ | Reviewed; no change needed. FICO's under-five-point impact, 12-month scoring, 45/14-day shopping windows and 30-day buffer were confirmed against myFICO via search. |
| 23 | /guides/heloc-vs-home-equity-loan/ | Reviewed; no change needed. Payment shock figures were recomputed ($354 / $434 / $499), as was the CLTV example ($122,500). The tax wording matches current IRS Pub. 936 rules. |
| 24 | /best/high-yield-savings-accounts/ | Improved: added a "what the rate difference is worth" table (balance x APY on $10,000 at hypothetical 0.40%, 3.50% and 4.00%) and a link to the FDIC national rate benchmark. Removed em dashes in two product notes in `src/data/products.json`. Updated date changed. |

### Sources and links
- Outbound HTTPS from the sandbox is blocked by the proxy (403 on consumerfinance.gov, irs.gov, fdic.gov, fountainfinances.com), so source links on these pages could not be fetched directly. The deploy workflow's diagnose job runs `qa.mjs --external` against every outbound link.
- Confirmed by web search: Fannie Mae B3-6-02 DTI limits; myFICO inquiry impact and rate-shopping windows; FHA 3.5% minimum down with a 580+ score.
- No URLs were added except the FDIC national rates page, which was already cited on the same page.

### New content
Deferred. Within this cohort the candidate intents (for example a "how much cash do I need to buy a house" page) are already covered by the first-time buyer guide (now with a worked example), the closing-costs guide and the affordability calculator. A new page would duplicate them.

### Tests run (in fountainfinances/)
- `npm ci`: ok
- `npm run check`: 0 errors, 0 warnings
- `npm run build`: ok
- `npm run qa`: passed (123 pages, 190 unique external links)
- `npm test`: 29/29 passed
- `CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test`: 17 passed, 1 skipped (the desktop variant of the mobile-menu test, skipped by design)

---

## 2026-11-15 catch-up (cohort 0)

One-time catch-up review of the cohorts not covered by this week's cohort 1 run, prompted by the same AdSense "Low value content" rejection.

### Pages reviewed (12)

| # | Page | Result |
|---|---|---|
| 1 | /guides/50-30-20-rule/ | Style only: fixed a broken sentence in the "what counts as a need" test. Example checked ($2,800 of needs = 56%; wants cut to $1,200 = 24%; totals $5,000). Date unchanged. |
| 2 | /calculators/auto-loan/ | Reviewed; no change needed. Amount financed, tax on price minus trade-in and term table checked. |
| 3 | /best/balance-transfer-credit-cards/ | Improved: the body was only a three-step checklist. Added a worked $6,000 at 22.9% example (keep the balance: 22 months, about $1,369 interest at $343.33/month; transfer at a hypothetical 3% or 5% fee over 18 months: $180 or $300) with the caveat on balances left after the promo. Removed an em dash in the BankAmericard note in `products.json`. Updated date changed. |
| 4 | /calculators/budget/ | Reviewed; no change needed. Negative remainder, zero income and tips behave correctly. |
| 5 | /calculators/cd/ | Reviewed; no change needed. Maturity = deposit x (1 + APY)^(months/12) is correct for an APY input. |
| 6 | /best/cd-accounts/ | Improved: added an early withdrawal example ($10,000, 12 months, 4.00% APY, 90-day penalty: about $65.58 earned after 2 months vs a $98.63 penalty, so about $9,966.95 returned) and the Regulation D minimum of seven days' simple interest within the first six days. Updated date changed. |
| 7 | /guides/cd-ladder/ | Reviewed; no change needed. All five rung values, the $1,223.55 total and the $12,166.53 single-CD figure recomputed. |
| 8 | /best/checking-accounts/ | Reviewed; no change to the page. Removed an em dash in the Chase product note in `products.json`. |
| 9 | /guides/checking-vs-savings-account/ | Style only: removed an em dash in the comparison table. The 2020 removal of the six-withdrawal limit and the $250,000 coverage wording are correct. Date unchanged. |
| 10 | /calculators/compound-interest/ | Reviewed; no change needed. The page example ($5,000 at 4% monthly for 15 years = about $9,100; with $300/month about $83,000, about $24,000 interest) recomputed. |
| 11 | /calculators/credit-card-payoff/ | Calculator bug fixed: the payoff loop stops at 1,200 months, so a payment slightly above the monthly interest at a low APR (for example $6,500 at 1% APR paying $6) showed "100 yrs" and an interest total while a balance was still owed. It now shows "More than 100 years" with a warning. Confirmed in the browser. Page example ($124 first-month interest) checked. |
| 12 | /guides/credit-card-rewards-explained/ | Minor: added the arithmetic behind "rewards lose to interest" ($400 rewards on $20,000 vs about $660 interest on a $3,000 balance at 22%). Rewards table recomputed ($400 / $360 / $470 - $95). Date unchanged. |

### Sources
- Confirmed by web search: Regulation D minimum early withdrawal penalty (seven days' simple interest within six days of funding) and that penalties can be taken from principal (bank deposit agreements). No new outbound URLs were added.

### Consolidation candidates
None in this cohort.

### Tests run (in fountainfinances/)
- `npm run check`: 0 errors, 0 warnings
- `npm run build`: ok
- `npm run qa`: passed (123 pages, 190 unique external links)
- `npm test`: 29/29 passed
- `CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test`: 17 passed, 1 skipped (by design)
