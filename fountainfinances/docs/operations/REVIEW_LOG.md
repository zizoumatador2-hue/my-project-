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

---

## 2026-11-15 catch-up (cohort 2)

### Pages reviewed (12)

| # | Page | Result |
|---|---|---|
| 25 | /calculators/home-affordability/ | Accuracy fix: the estimate leaves out mortgage insurance, but nothing said so, and with the default inputs (13% down) the price was overstated. The result note now warns when the down payment is under 20%, and the "more than approval" list explains the omission. Confirmed in the browser (note shows at $50,000 down, hidden at $200,000). Solver math checked ($377,583 default). |
| 26 | /calculators/home-equity/ | Reviewed; no change needed. $190,000 equity (42%) and $122,500 borrowable at 85% CLTV recomputed; negative equity and over-limit warnings behave correctly. |
| 27 | /guides/how-auto-loans-work/ | Source fix: the unsourced "FTC advises..." line now states the FTC's actual guidance (the signed contract should list only the add-ons you agreed to, at the quoted prices) and cites the FTC "Financing or Leasing a Car" page (URL confirmed by web search). Term table recomputed ($677 / $561 / $484 / $429). Updated date changed. |
| 28 | /guides/how-cds-work/ | Minor: linked the CD ladder section to the full ladder guide. Penalty example ($10,000 x 4.5% x 90/365 = about $111) checked. Date unchanged. |
| 29 | /guides/how-compound-interest-works/ | Style: replaced em-dash placeholders in the year table with the real year 10 and 30 values ($1,551.33 + $77.57; $4,116.14 + $205.81). Every figure recomputed (Saver A $197,395 vs Saver B $200,903; rate, frequency and Rule of 72 tables). Date unchanged. |
| 30 | /guides/how-credit-card-interest-works/ | Minor: added months and total interest to the minimum-payment example ($5,000 at 22%: $150 = 52 months, about $2,800; $250 = 26 months, about $1,290) and fixed a comma splice. Average daily balance example ($46.03) checked. Date unchanged. |
| 31 | /guides/how-credit-scores-work/ | Style: removed 6 em dashes and untangled nested parentheses in the credit mix section. FICO ranges and factor weights match myFICO. Date unchanged. |
| 32 | /guides/how-mortgage-payments-work/ | Style: quick answer parentheses and an em-dash table cell. Example recomputed ($2,149 P&I, $2,844 total, payment 1/180/360 split, $433,651 total interest, extra-payment savings of about $62,000 and $142,000). Date unchanged. |
| 33 | /guides/how-much-house-can-i-afford/ | Improved: added the effect of PMI on the rate table example (at 6.5% the supported price falls from about $331,000 to about $309,000 with PMI at an assumed 0.6%). Corrected the DTI FAQ to Fannie Mae's actual limits (36% manual, up to 45% with credit score and reserves, 50% through DU), matching the cohort 1 DTI guide fix. Updated date changed. |
| 34 | /guides/how-to-avoid-overdraft-fees/ | Reviewed; no change needed. Regulation E opt-in scope (ATM and one-time debit only) is stated correctly. |
| 35 | /guides/how-to-build-a-budget/ | Minor: linked the 50/30/20 section to the dedicated guide. Example budget sums to $5,200. Date unchanged. |
| 36 | /guides/how-to-build-credit/ | Style: an em dash in a heading and a missing comma in the quick answer. FICO minimum-history and CROA advance-fee statements are correct. Date unchanged. |

### Consolidation candidates
None. The 50/30/20 overview inside the budget guide and the CD ladder section inside the CD guide are short summaries that now link to the dedicated guides.

### Sources
- Added: FTC "Financing or Leasing a Car" (https://consumer.ftc.gov/financing-or-leasing-car), confirmed by web search. Not fetched directly (sandbox proxy); the deploy workflow's external link check covers it.

### Tests run (in fountainfinances/)
- `npm run check`: 0 errors, 0 warnings
- `npm run build`: ok
- `npm run qa`: passed (123 pages, 191 unique external links)
- `npm test`: 29/29 passed
- `CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test`: 17 passed, 1 skipped (by design)

---

## 2026-11-15 catch-up (cohort 3)

### Pages reviewed (12)

| # | Page | Result |
|---|---|---|
| 37 | /guides/how-to-freeze-your-credit/ | Style: removed an em dash in the comparison table. Free-freeze law (2018), 1 business day / 1 hour / 3 business day timelines, fraud alert durations and under-16 freezes are correct. Date unchanged. |
| 38 | /guides/how-to-improve-credit-score/ | Style: removed an em dash in a heading. Utilization table, 30-day dispute window and CROA advance-fee rule are correct. Date unchanged. |
| 39 | /guides/how-to-pay-off-credit-card-debt/ | Accuracy: replaced the unquantified "far above other borrowing costs" line with the figure from the Fed's November 2026 G.19 release (about 22% on accounts assessed interest, confirmed by web search). Minimum-payment table recomputed ($6,500 at 22.9%: 93 / 37 / 20 months, about $7,419 / $2,566 / $1,356 interest); the $10,000 FAQ (52 and 26 months) checked. Updated date changed. |
| 40 | /guides/how-to-read-a-credit-report/ | Style: two em dashes in headings and an awkward colon in the quick answer. Reporting periods (7 years, 10 for Chapter 7) and dispute rules are correct. Date unchanged. |
| 41 | /guides/how-to-remove-pmi/ | Reviewed; no change needed. Worked example recomputed ($1,991 payment; 80% after 95 payments, 78% after 109, 62 with $200 extra). HPA milestones and FHA MIP rules (ML 2013-04) are correct. |
| 42 | /guides/how-to-save-money-every-month/ | Style: removed an em dash in a heading. $175/month at 4% for 5 years = about $11,600 checked. Date unchanged. |
| 43 | /guides/how-to-start-investing-for-beginners/ | Improved: the page told readers to save a full three to six months of expenses before taking an employer match, which contradicted the order used in the budget, 50/30/20 and emergency fund guides. The quick answer, Step 1 and starter plan now use the site's order (starter fund, match, high-interest debt, full fund, IRA). 2026 IRA limits ($7,500; $8,600 at 50+) confirmed by web search against IRS IR-2025-111. $200/month at 7% for 30 years = about $244,000 checked. Updated date changed. |
| 44 | /calculators/investment/ | Reviewed; no change needed. Negative returns, contribution increases, inflation adjustment and the 3.4% real-return example checked. |
| 45 | /calculators/loan/ | Reviewed; no change needed. Term table ($495 / $391 / $330; $2,807 / $3,784 / $4,793) and the "9% vs 19% is more than $3,000" claim ($3,611) recomputed. |
| 46 | /calculators/mortgage/ | Reviewed; no change needed. $63 per $10,000 and $228 for a one-point rate rise recomputed; down payment above price handled. |
| 47 | /guides/mortgage-closing-costs/ | Reviewed; no change needed. Cost table, Fannie Mae seller-concession tiers (3% / 6% / 9%) and FHA 6% cap are correct. |
| 48 | /guides/personal-loan-vs-credit-card/ | Style: an em dash in the table and a missing comma. Cost example recomputed ($332 payment, $2,257 with fee; card 46 months, about $5,055; $10,400 / 18 = $578). Date unchanged. |

### Consolidation candidates
None. how-credit-scores-work (cohort 2) and how-to-improve-credit-score overlap in topic but serve different intents (how scores are built vs an action plan) and link to each other.

### Tests run (in fountainfinances/)
- `npm run check`: 0 errors, 0 warnings
- `npm run build`: ok
- `npm run qa`: passed (123 pages, 191 unique external links)
- `npm test`: 29/29 passed
- `CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test`: 17 passed, 1 skipped (by design)

---

## 2026-11-15 catch-up (cohort 4)

### Pages reviewed (12)

| # | Page | Result |
|---|---|---|
| 49 | /best/personal-loans/ | Improved: the body was a five-step checklist. Added a worked comparison of two hypothetical 36-month offers for $10,000 in hand (11.99% with no fee vs 9.99% with a 5% fee deducted: $10,526.32 borrowed, $339.61 vs $332.10 a month, about $270 more in total, APR about 13.55%). Removed an em dash in the Best Egg note in `products.json`. Updated date changed. |
| 50 | /guides/roth-ira-vs-traditional-ira/ | Reviewed; no change needed. 2026 limits ($7,500 / $8,600), Roth phase-outs ($153k to $168k; $242k to $252k) and traditional deduction phase-outs ($81k to $91k; $129k to $149k) confirmed by web search against IRS IR-2025-111. The $708,456 example and $155,860 tax figure recomputed. |
| 51 | /guides/sinking-funds/ | Minor: home maintenance planning figure aligned with the rest of the site (1% to 2%), missing comma fixed. Table totals $350. Date unchanged. |
| 52 | /calculators/student-loan/ | Reviewed; no change needed. Payment, extra-payment savings and the 2025 law notice checked. |
| 53 | /guides/student-loan-repayment-options/ | Updated for the current year: replaced "RAP for newer borrowers" (inaccurate; RAP is open to existing Direct Loan borrowers too) with the key dates confirmed by web search (RAP opened July 1, 2026, Parent PLUS excluded; loans first disbursed on or after July 1, 2026 limited to RAP or the tiered standard plan; borrowers in phased-out plans have until July 1, 2028). Fixed a sentence fragment. $32,000 at 6% example recomputed ($355; $10,632 interest; $100 extra saves about $3,107 and 33 months). Updated date changed. |
| 54 | /guides/term-vs-whole-life-insurance/ | Reviewed; no change needed. Coverage estimate arithmetic checks out ($1,425,000, about $1.4 million). |
| 55 | /guides/types-of-insurance/ | Minor: punctuation fixes and a link from the life insurance section to the term vs whole life guide, which holds the worked coverage estimate. Date unchanged. |
| 56 | /guides/what-is-a-balance-transfer/ | Reviewed; no change needed. $6,000 at 24% example recomputed (20 months, about $1,304 vs a $180 fee; $6,180 / 18 = $343). Because this guide already holds the "transfer vs stay" example, the cohort 0 example on /best/balance-transfer-credit-cards/ was reworked to compare offers against a fixed $300 payment instead, so the two pages no longer repeat each other. |
| 57 | /guides/what-is-a-high-yield-savings-account/ | Style: three punctuation fixes. $5,000 + $300/month for 5 years ($25,937 at 4.00% vs $23,349 at 0.50%) recomputed. Date unchanged. |
| 58 | /guides/what-is-apr/ | Accuracy fix: the page said a 4.00% APY earns more than 4.00% compounded annually; the two are identical. Replaced with a correct example (4.00% compounded daily = about 4.08% APY, $408 vs $400 on $10,000). Clarified that Offer A's 6% fee is deducted from the proceeds, with the totals ($9,400 received and about $11,616 repaid vs $10,000 and about $11,701). The 14.3% APR recomputed. Updated date changed. |
| 59 | /guides/what-is-apy/ | Accuracy fix: the page said interest accrued before crediting is "not forfeited under standard savings terms". Regulation DD lets banks withhold accrued, uncredited interest when an account is closed, as long as they disclose it (confirmed by web search). Reworded. Also two punctuation fixes. APY table and the $15,000 example ($60 / $120 vs $600 / $1,224) recomputed. Updated date changed. |
| 60 | /guides/what-is-debt-consolidation/ | Style: comma splice fixed. Example recomputed with the site's own function (46 months and about $6,006 interest vs $12,187.50 loan, $330 payment, $4,140 cost, about $1,866 saved). Date unchanged. |

### Consolidation candidates
None recorded. The closest overlap, the balance transfer guide and the balance transfer comparison page, was resolved by giving the comparison page a different example (see #56). No page was a weaker duplicate of another.

### Tests run (in fountainfinances/)
- `npm run check`: 0 errors, 0 warnings
- `npm run build`: ok
- `npm run qa`: passed (123 pages, 191 unique external links)
- `npm test`: 29/29 passed
- `CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test`: 17 passed, 1 skipped (by design)

### Catch-up left unverified
- Outbound links still cannot be fetched from the sandbox (proxy 403). The new FTC URL and all existing sources depend on the deploy workflow's external link check.
- G.19 figure: the November 2026 release shows 22.36% in its latest column, but the period that column covers could not be read reliably, so the guide says "about 22%" without naming a quarter.
