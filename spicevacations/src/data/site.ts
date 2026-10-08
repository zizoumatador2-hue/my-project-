/** Global site settings and navigation. Edit here (or via the CMS "Site settings" file). */
export const SITE = {
  name: 'SpiceVacations',
  domain: 'SpiceVacations.com',
  tagline: 'Discover your next escape.',
  url: (import.meta.env.SITE_URL as string | undefined) ?? 'https://spicevacations.com',
  locale: 'en_US',
  lang: 'en-US',
  email: 'info.christopherkunz@gmail.com',
  description:
    'SpiceVacations.com helps couples find romantic getaways, adults-only and all-inclusive resorts, beach escapes and vacation deals across the USA, Mexico and the Caribbean.',
  foundingYear: 2026,
  /** Google AdSense publisher client. Public by design (it appears in every page's ad code and ads.txt). */
  adsenseClient: ((import.meta.env.PUBLIC_ADSENSE_CLIENT as string | undefined) || 'ca-pub-8532224804732263').trim(),
  twitter: '',
  sameAs: [] as string[],
};

export type NavItem = { label: string; href: string; children?: { label: string; href: string; description?: string }[] };

export const NAV: NavItem[] = [
  {
    label: 'Destinations',
    href: '/destinations/',
    children: [
      { label: 'Florida', href: '/destinations/florida/' },
      { label: 'Hawaii', href: '/destinations/hawaii/' },
      { label: 'Mexico', href: '/destinations/mexico/' },
      { label: 'Caribbean', href: '/destinations/caribbean/' },
      { label: 'Las Vegas', href: '/destinations/las-vegas/' },
      { label: 'All destinations', href: '/destinations/' },
    ],
  },
  {
    label: 'Vacation Types',
    href: '/vacation-types/',
    children: [
      { label: 'Romantic Getaways', href: '/vacation-types/romantic-getaways/' },
      { label: 'Couples Vacations', href: '/vacation-types/couples-vacations/' },
      { label: 'Honeymoon Vacations', href: '/vacation-types/honeymoon-vacations/' },
      { label: 'Adults-Only Resorts', href: '/vacation-types/adults-only-resorts/' },
      { label: 'All-Inclusive Resorts', href: '/vacation-types/all-inclusive-resorts/' },
      { label: 'All vacation types', href: '/vacation-types/' },
    ],
  },
  { label: 'Resorts', href: '/resorts/' },
  { label: 'Deals', href: '/deals/' },
  { label: 'Guides', href: '/guides/' },
];

export const FOOTER_NAV = [
  {
    title: 'Explore',
    links: [
      { label: 'Destinations', href: '/destinations/' },
      { label: 'Resorts', href: '/resorts/' },
      { label: 'Vacation deals', href: '/deals/' },
      { label: 'Travel guides', href: '/guides/' },
      { label: 'Search vacations', href: '/search/' },
      { label: 'Plan my vacation', href: '/plan-my-vacation/' },
    ],
  },
  {
    title: 'Vacation types',
    links: [
      { label: 'Romantic getaways', href: '/vacation-types/romantic-getaways/' },
      { label: 'Honeymoon vacations', href: '/vacation-types/honeymoon-vacations/' },
      { label: 'Adults-only resorts', href: '/vacation-types/adults-only-resorts/' },
      { label: 'All-inclusive resorts', href: '/vacation-types/all-inclusive-resorts/' },
      { label: 'Luxury vacations', href: '/vacation-types/luxury-vacations/' },
      { label: 'Beach vacations', href: '/vacation-types/beach-vacations/' },
      { label: 'Weekend getaways', href: '/vacation-types/weekend-getaways/' },
      { label: 'Cruise vacations', href: '/vacation-types/cruise-vacations/' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About us', href: '/about/' },
      { label: 'Contact', href: '/contact/' },
      { label: 'FAQ', href: '/faq/' },
      { label: 'Editorial policy', href: '/editorial-policy/' },
      { label: 'Photo credits', href: '/photo-credits/' },
      { label: 'Brand guidelines', href: '/brand/' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Affiliate disclosure', href: '/affiliate-disclosure/' },
      { label: 'Privacy policy', href: '/privacy-policy/' },
      { label: 'Terms of service', href: '/terms/' },
      { label: 'Cookie policy', href: '/cookie-policy/' },
    ],
  },
];

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
