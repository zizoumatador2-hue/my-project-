import type { HubSlug } from './taxonomy';

export interface CalculatorMeta {
  slug: string;
  name: string;
  short: string;
  description: string;
  seoTitle: string;
  hub: HubSlug;
  icon: string;
  keywords: string[];
  featured?: boolean;
}

export const CALCULATORS: CalculatorMeta[] = [
  {
    slug: 'budget',
    name: 'Budget Calculator',
    short: 'See where every dollar of your monthly income goes and how much is left to save.',
    description: 'Free monthly budget calculator: enter your take-home pay and expenses to see total spending, money left over, your savings rate and a category breakdown.',
    seoTitle: 'Free Monthly Budget Calculator (Income & Expenses)',
    hub: 'personal-finance',
    icon: 'wallet',
    keywords: ['budget calculator', 'monthly budget calculator', 'personal budget calculator', 'income and expense calculator', 'free budget calculator'],
    featured: true,
  },
  {
    slug: 'loan',
    name: 'Loan Payment Calculator',
    short: 'Estimate the monthly payment, total interest and total cost of a personal loan.',
    description: 'Personal loan calculator: estimate your monthly payment, total interest and total repayment from the loan amount, APR and term, with a yearly payoff schedule.',
    seoTitle: 'Personal Loan Payment Calculator: Monthly Cost & Interest',
    hub: 'loans',
    icon: 'loan',
    keywords: ['personal loan calculator', 'loan payment calculator', 'monthly loan payment calculator', 'loan interest calculator', 'personal loan repayment calculator'],
    featured: true,
  },
  {
    slug: 'mortgage',
    name: 'Mortgage Calculator',
    short: 'Estimate a full monthly house payment, including taxes, insurance, PMI and HOA dues.',
    description: 'Mortgage payment calculator: estimate principal and interest, property taxes, homeowners insurance, PMI and HOA dues for a complete monthly housing cost.',
    seoTitle: 'Mortgage Calculator: Estimate Your Monthly House Payment',
    hub: 'mortgage',
    icon: 'home',
    keywords: ['mortgage calculator', 'mortgage payment calculator', 'home loan calculator', 'monthly mortgage calculator'],
    featured: true,
  },
  {
    slug: 'home-affordability',
    name: 'Home Affordability Calculator',
    short: 'Find a home price that fits your income and debts using lender-style ratios.',
    description: 'Mortgage affordability calculator: see how much house you can afford based on income, monthly debts, down payment, interest rate and property taxes.',
    seoTitle: 'How Much House Can I Afford? Affordability Calculator',
    hub: 'mortgage',
    icon: 'target',
    keywords: ['mortgage affordability calculator', 'how much house can I afford', 'home affordability calculator'],
  },
  {
    slug: 'credit-card-payoff',
    name: 'Credit Card Payoff Calculator',
    short: 'See how long it will take to pay off a card balance and what the interest will cost.',
    description: 'Credit card payoff calculator: see how many months it takes to pay off your balance, the total interest and the payment needed to be debt-free sooner.',
    seoTitle: 'Credit Card Payoff Calculator: Interest & Payoff Date',
    hub: 'credit',
    icon: 'card',
    keywords: ['credit card debt calculator', 'credit card payoff calculator', 'credit card interest calculator'],
    featured: true,
  },
  {
    slug: 'compound-interest',
    name: 'Compound Interest Calculator',
    short: 'Project how savings grow with regular deposits and compounding interest.',
    description: 'Compound interest calculator: see the future value of a deposit plus monthly contributions, with interest earned and a year-by-year growth table.',
    seoTitle: 'Compound Interest Calculator With Monthly Contributions',
    hub: 'banking',
    icon: 'trend',
    keywords: ['compound interest calculator', 'compound interest formula', 'compound interest savings'],
    featured: true,
  },
  {
    slug: 'investment',
    name: 'Investment Growth Calculator',
    short: 'Estimate long-term investment growth with rising contributions and inflation.',
    description: 'Investment calculator: estimate growth with an assumed return, contributions that rise each year and an inflation-adjusted value in today’s dollars.',
    seoTitle: 'Investment Calculator: Growth, Returns & Inflation',
    hub: 'personal-finance',
    icon: 'chart',
    keywords: ['investment calculator', 'investment return calculator', 'compound investment calculator', 'investment growth calculator'],
  },
  {
    slug: 'emergency-fund',
    name: 'Emergency Fund Calculator',
    short: 'Set an emergency savings target and see how long it will take to reach it.',
    description: 'Emergency fund calculator: estimate how much emergency savings you need based on essential expenses and see how many months it will take to build it.',
    seoTitle: 'Emergency Fund Calculator: How Much Should You Save?',
    hub: 'personal-finance',
    icon: 'umbrella',
    keywords: ['emergency fund calculator', 'how much emergency savings', 'emergency savings calculator'],
  },
  {
    slug: 'auto-loan',
    name: 'Auto Loan Calculator',
    short: 'Estimate a car payment including sales tax, fees, trade-in and down payment.',
    description: 'Auto loan calculator: estimate your monthly car payment and total cost, including sales tax, dealer fees, trade-in value, down payment, APR and loan term.',
    seoTitle: 'Auto Loan Calculator: Estimate Your Monthly Car Payment',
    hub: 'loans',
    icon: 'car',
    keywords: ['car loan calculator', 'auto loan payment calculator', 'auto loan calculator'],
  },
  {
    slug: 'debt-consolidation',
    name: 'Debt Consolidation Calculator',
    short: 'Compare paying debts separately with one consolidation loan, fees included.',
    description: 'Debt consolidation calculator: compare your current debts with one consolidation loan, including origination fees, to see the difference in interest and time.',
    seoTitle: 'Debt Consolidation Calculator: Compare Interest & Time',
    hub: 'loans',
    icon: 'scale',
    keywords: ['debt consolidation calculator', 'debt consolidation loan calculator'],
  },
  {
    slug: 'cd',
    name: 'CD Calculator',
    short: 'See what a certificate of deposit will be worth at maturity.',
    description: 'CD calculator: estimate the interest a certificate of deposit earns and its value at maturity from the deposit amount, APY and term length in months.',
    seoTitle: 'CD Calculator: Interest Earned & Value at Maturity',
    hub: 'banking',
    icon: 'piggy',
    keywords: ['CD calculator', 'certificate of deposit calculator', 'CD interest calculator'],
  },
  {
    slug: 'student-loan',
    name: 'Student Loan Calculator',
    short: 'Estimate student loan payments and how extra payments shorten repayment.',
    description: 'Student loan calculator: estimate your monthly student loan payment, total interest and how much time and money extra monthly payments can save.',
    seoTitle: 'Student Loan Calculator: Payments & Extra-Payment Savings',
    hub: 'loans',
    icon: 'grad',
    keywords: ['student loan calculator', 'student loan repayment calculator', 'student loan payment calculator'],
  },
  {
    slug: 'home-equity',
    name: 'Home Equity Calculator',
    short: 'See how much equity you have and how much a lender may let you borrow.',
    description: 'Home equity calculator: estimate your home equity, the amount you may be able to borrow with a home equity loan or HELOC, and the monthly payment.',
    seoTitle: 'Home Equity Calculator: Equity, Borrowing Limit & Payment',
    hub: 'mortgage',
    icon: 'home',
    keywords: ['home equity calculator', 'home equity loan calculator', 'HELOC calculator'],
  },
];

export const calcBySlug = (slug: string) => CALCULATORS.find((c) => c.slug === slug);
