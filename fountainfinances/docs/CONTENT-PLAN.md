# Fountain Finances — Content Architecture (50+ articles)

The site follows a **pillar → hub → topic → guide** model. The homepage hosts the pillar (*The Complete Guide to Personal Finance*, target keyword **personal finance**). Six hubs and 31 topic pages organize the clusters. Every guide links up to its hub and the pillar and across to related guides, calculators and comparisons.

- ✅ = published (36 guides, each 1,500–2,600 words, sourced, with FAQ schema)
- 📝 = planned (brief ready; publish 1–2 per week, never as thin content)

## Personal finance (hub: `/personal-finance/`)

| # | Status | Article | Primary keyword | Links to |
|---|---|---|---|---|
| 1 | ✅ | How to Build a Monthly Budget That Actually Works | how to create a budget | budget calc, emergency fund guide |
| 2 | ✅ | How Much Emergency Savings Should You Have? | how much emergency savings | emergency fund calc, HYSA guide |
| 3 | ✅ | How to Save Money Every Month: 30 Practical Ways | how to save money | budget calc, compound interest |
| 4 | ✅ | Debt Payoff Strategies: Avalanche vs. Snowball | debt payoff strategies | card payoff calc, consolidation |
| 5 | ✅ | Financial Planning for Beginners | financial planning for beginners | investment calc, retirement |
| 29 | ✅ | The 50/30/20 Rule Explained (With Examples) | 50/30/20 rule | budget calc, budget guide |
| 30 | 📝 | Zero-Based Budgeting: A Step-by-Step Guide | zero based budgeting | budget guide |
| 31 | ✅ | Sinking Funds: How to Save for Irregular Expenses | sinking funds | budget guide, HYSA |
| 32 | 📝 | How to Calculate Your Net Worth (and Grow It) | how to calculate net worth | planning guide |
| 33 | 📝 | How Much Should I Save for Retirement? | how much to save for retirement | investment calc |
| 34 | 📝 | Roth IRA vs. Traditional IRA | roth vs traditional ira | planning guide |
| 35 | 📝 | How to Start Investing With Little Money | how to start investing | compound interest guide |
| 36 | 📝 | Financial Tips for Young Adults | financial tips for young adults | build credit, budget |

## Credit (hub: `/credit/`)

| # | Status | Article | Primary keyword | Links to |
|---|---|---|---|---|
| 6 | ✅ | How Does a Credit Score Work? | how credit scores work | improve score, credit report |
| 7 | ✅ | How to Improve Your Credit Score: 10 Steps | how to improve credit score | utilization, card payoff |
| 8 | ✅ | How to Build Credit From Scratch | how to build credit | beginner cards comparison |
| 9 | ✅ | How to Read a Credit Report and Dispute Errors | how to read a credit report | credit scores |
| 10 | ✅ | How Credit Card Interest Works | how credit card interest works | card payoff calc |
| 11 | ✅ | How to Pay Off Credit Card Debt | how to pay off credit card debt | balance transfer, consolidation |
| 12 | ✅ | What Is a Balance Transfer? | balance transfer credit cards | BT comparison |
| 13 | ✅ | Credit Card Rewards Explained | credit card rewards | beginner cards |
| 37 | 📝 | Credit Utilization Explained | credit utilization | improve score |
| 38 | ✅ | Hard vs. Soft Credit Inquiries | hard vs soft inquiry | credit scores |
| 39 | ✅ | How to Freeze Your Credit (Free) | how to freeze credit | credit report guide |
| 40 | 📝 | Secured vs. Unsecured Credit Cards | secured credit card | build credit |

## Banking (hub: `/banking/`)

| # | Status | Article | Primary keyword | Links to |
|---|---|---|---|---|
| 14 | ✅ | What Is a High-Yield Savings Account? | high yield savings account | HYSA comparison |
| 15 | ✅ | Checking vs. Savings Account | checking vs savings account | checking comparison |
| 16 | ✅ | How Compound Interest Works | compound interest formula | compound interest calc |
| 17 | ✅ | What Is APY? | what is apy | CD calc |
| 18 | ✅ | How Does a CD Work? | certificate of deposit rates | CD comparison |
| 41 | 📝 | Money Market Account vs. High-Yield Savings | money market vs high yield savings | HYSA guide |
| 42 | 📝 | How FDIC Insurance Works (and Coverage Limits) | fdic insurance limits | online banks |
| 43 | ✅ | How to Avoid Overdraft Fees | how to avoid overdraft fees | banking fees |
| 44 | ✅ | How to Build a CD Ladder | cd ladder | CD calc |

## Loans (hub: `/loans/`)

| # | Status | Article | Primary keyword | Links to |
|---|---|---|---|---|
| 19 | ✅ | What Is APR? | what is apr | loan calc |
| 20 | ✅ | Personal Loan vs. Credit Card | personal loan vs credit card | personal loans comparison |
| 21 | ✅ | What Is Debt Consolidation? | debt consolidation | consolidation calc |
| 22 | ✅ | How Auto Loans Work | auto loan rates | auto loan calc |
| 23 | ✅ | Student Loan Repayment Options | student loan repayment | student loan calc |
| 45 | 📝 | Personal Loans for Bad Credit: Options and Risks | personal loans for bad credit | personal loans comparison |
| 46 | 📝 | How to Get Preapproved for a Personal Loan | personal loan preapproval | loan calc |
| 47 | 📝 | Should You Refinance Student Loans? | refinance student loans | student loan guide |

## Mortgage (hub: `/mortgage/`)

| # | Status | Article | Primary keyword | Links to |
|---|---|---|---|---|
| 24 | ✅ | How Mortgage Payments Work | mortgage payment calculator | mortgage calc |
| 25 | ✅ | How Much House Can I Afford? | how much house can i afford | affordability calc |
| 26 | ✅ | First-Time Home Buyer Guide | first time home buyer guide | affordability calc |
| 27 | ✅ | HELOC vs. Home Equity Loan | heloc vs home equity loan | home equity calc |
| 48 | 📝 | Fixed vs. Adjustable-Rate Mortgage | fixed vs adjustable rate mortgage | mortgage basics |
| 49 | ✅ | How to Remove PMI | how to remove pmi | mortgage payments guide |
| 50 | 📝 | When Does Refinancing Make Sense? | when to refinance | refinancing |

## Insurance (hub: `/insurance/`)

| # | Status | Article | Primary keyword | Links to |
|---|---|---|---|---|
| 28 | ✅ | Types of Insurance | types of insurance | all insurance topics |
| 51 | ✅ | Term vs. Whole Life Insurance | term vs whole life insurance | life insurance |
| 52 | 📝 | How to Lower Your Car Insurance | how to lower car insurance | auto insurance |

## Publishing standard for every new article

1. Keyword and SERP review: search intent, the formats that rank (list, table, steps), questions in “People also ask”.
2. Outline with a 40–60 word quick answer, 3+ takeaways, `##`/`###` hierarchy, a table or list every few sections.
3. Primary sources only; list them in `sources`.
4. Recalculate every example with `src/lib/finance.ts`.
5. Internal links: hub, pillar, 2+ related guides, the relevant calculator/comparison — descriptive anchors only.
6. `npm run build && npm run qa` must pass (word count, headings, metadata, links).
7. After publishing, add the new slug to the `related` lists of 2–3 existing guides.
