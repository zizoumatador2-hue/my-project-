/**
 * Site taxonomy: six pillar hubs, each with topic pages.
 * Topic pages live at short top-level URLs (e.g. /credit-cards/) and
 * their body copy lives in src/content/topics/<slug>.md.
 */
export type HubSlug = 'personal-finance' | 'credit' | 'banking' | 'loans' | 'mortgage' | 'insurance';

export interface Hub {
  slug: HubSlug;
  title: string;
  shortTitle: string;
  seoTitle: string;
  description: string;
  lede: string;
  keywords: string[];
  icon: string;
}

export const HUBS: Hub[] = [
  {
    slug: 'personal-finance',
    title: 'Personal Finance',
    shortTitle: 'Personal Finance',
    seoTitle: 'Personal Finance Guide: Budgeting, Saving & Debt Basics',
    description:
      'Practical personal finance guides for beginners and beyond: budgeting, saving money, emergency funds, debt management and financial planning.',
    lede: 'The everyday decisions that shape your financial life: how you budget, save, handle debt and plan ahead.',
    keywords: ['personal finance', 'personal finance tips', 'personal finance for beginners', 'how to manage money'],
    icon: 'wallet',
  },
  {
    slug: 'credit',
    title: 'Credit & Credit Cards',
    shortTitle: 'Credit',
    seoTitle: 'Credit Scores, Credit Reports & Credit Cards Explained',
    description:
      'Understand how credit scores work, read your credit reports, build credit from scratch and compare credit cards with clear, unbiased guides.',
    lede: 'How credit works, how lenders see you, and how to use credit cards without paying for it later.',
    keywords: ['credit score', 'credit cards', 'how to build credit', 'credit card comparison'],
    icon: 'card',
  },
  {
    slug: 'banking',
    title: 'Banking & Savings',
    shortTitle: 'Banking',
    seoTitle: 'Banking Guide: Checking, Savings, High-Yield Accounts & CDs',
    description:
      'Compare checking accounts, savings accounts, high-yield savings and CDs. Learn how APY, FDIC insurance and bank fees work before you open an account.',
    lede: 'Where to keep your money, how to earn more on it and how to avoid the fees that quietly eat into it.',
    keywords: ['savings account', 'high yield savings account', 'checking accounts', 'CD rates'],
    icon: 'bank',
  },
  {
    slug: 'loans',
    title: 'Loans',
    shortTitle: 'Loans',
    seoTitle: 'Loan Guides: Personal, Auto & Student Loans, Consolidation',
    description:
      'Learn how personal loans, auto loans, student loans and debt consolidation work. Compare costs with free loan calculators before you borrow.',
    lede: 'Borrowing costs real money. Understand the total cost before you sign anything.',
    keywords: ['personal loans', 'auto loans', 'student loans', 'debt consolidation'],
    icon: 'loan',
  },
  {
    slug: 'mortgage',
    title: 'Mortgage',
    shortTitle: 'Mortgage',
    seoTitle: 'Mortgage Guide: Rates, Payments, Refinancing & Home Equity',
    description:
      'Mortgage basics for first-time home buyers and homeowners: how rates are set, how payments work, when refinancing makes sense and how home equity loans compare.',
    lede: 'The largest loan most Americans ever take on, explained step by step.',
    keywords: ['mortgage calculator', 'mortgage rates', 'first time home buyer', 'home equity'],
    icon: 'home',
  },
  {
    slug: 'insurance',
    title: 'Insurance',
    shortTitle: 'Insurance',
    seoTitle: 'Insurance Guide: Auto, Home, Renters & Life Insurance Basics',
    description:
      'Understand the main types of insurance (auto, home, renters and life), what coverage you actually need and how to compare policies fairly.',
    lede: 'Insurance protects the financial progress you have already made. Here is how to buy the right amount.',
    keywords: ['types of insurance', 'insurance comparison', 'affordable insurance'],
    icon: 'shield',
  },
];

export const hubBySlug = (slug: string) => HUBS.find((h) => h.slug === slug);
