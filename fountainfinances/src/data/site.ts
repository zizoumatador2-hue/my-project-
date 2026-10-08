export const SITE = {
  name: 'Fountain Finances',
  legalName: 'Fountain Finances',
  domain: 'FountainFinances.com',
  url: 'https://fountainfinances.com',
  tagline: 'Smarter Money Decisions, Made Simple.',
  supportingLine: 'Compare. Learn. Plan. Make Better Financial Decisions.',
  description:
    'Fountain Finances is an independent personal finance resource with plain-English guides, free financial calculators and transparent product comparisons for American consumers.',
  email: 'info.christopherkunz@gmail.com',
  /** Founder and publisher: shown on About/Contact and in the Organization schema. */
  founder: 'Christopher Kunz',
  locale: 'en_US',
  language: 'en-US',
  country: 'US',
  foundingYear: 2026,
  logo: '/images/logo-512.png',
  ogImage: '/images/og-default.png',
  /**
   * Official brand profiles. Only list accounts that actually exist —
   * they feed the footer and the Organization schema (`sameAs`).
   */
  social: [] as { name: string; url: string }[],
  /** Date the site-wide policies were last reviewed. */
  policiesUpdated: '2026-09-28',
} as const;

export const NAV = [
  { label: 'Personal Finance', href: '/personal-finance/' },
  { label: 'Credit', href: '/credit/' },
  { label: 'Banking', href: '/banking/' },
  { label: 'Loans', href: '/loans/' },
  { label: 'Mortgage', href: '/mortgage/' },
  { label: 'Insurance', href: '/insurance/' },
  { label: 'Calculators', href: '/calculators/' },
] as const;
