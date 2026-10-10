import { SITE } from '../data/site';

/** JSON-LD builders. Every page composes these into one @graph. */

export const abs = (path: string) => new URL(path, SITE.url).toString();
const ORG_ID = abs('/#organization');
const SITE_ID = abs('/#website');

export function organization() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE.domain,
    alternateName: SITE.name,
    url: abs('/'),
    logo: { '@type': 'ImageObject', url: abs('/icons/icon-512.png'), width: 512, height: 512 },
    email: SITE.email,
    slogan: SITE.tagline,
    description: SITE.description,
    foundingDate: String(SITE.foundingYear),
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: SITE.email, availableLanguage: ['English'], areaServed: 'US' },
    ...(SITE.sameAs.length ? { sameAs: SITE.sameAs } : {}),
  };
}

export function website() {
  return {
    '@type': 'WebSite',
    '@id': SITE_ID,
    url: abs('/'),
    name: SITE.domain,
    description: SITE.description,
    inLanguage: 'en-US',
    publisher: { '@id': ORG_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: abs('/search/') + '?q={search_term_string}' },
      'query-input': 'required name=search_term_string',
    },
  };
}

export type Crumb = { name: string; href: string };
export function breadcrumbList(crumbs: Crumb[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.href) })),
  };
}

export function webPage(opts: { path: string; title: string; description: string; type?: string; image?: string }) {
  return {
    '@type': opts.type ?? 'WebPage',
    '@id': abs(opts.path) + '#webpage',
    url: abs(opts.path),
    name: opts.title,
    description: opts.description,
    inLanguage: 'en-US',
    isPartOf: { '@id': SITE_ID },
    ...(opts.image ? { primaryImageOfPage: { '@type': 'ImageObject', url: abs(opts.image) } } : {}),
  };
}

export function faqPage(faqs: { q: string; a: string }[], path: string) {
  if (!faqs.length) return null;
  return {
    '@type': 'FAQPage',
    '@id': abs(path) + '#faq',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

export function article(opts: {
  path: string;
  title: string;
  description: string;
  image: string;
  published: Date;
  updated: Date;
  words: number;
  keywords: string[];
  section: string;
}) {
  return {
    '@type': 'Article',
    '@id': abs(opts.path) + '#article',
    headline: opts.title.slice(0, 110),
    description: opts.description,
    image: [abs(opts.image)],
    datePublished: opts.published.toISOString(),
    dateModified: opts.updated.toISOString(),
    wordCount: opts.words,
    keywords: opts.keywords.join(', '),
    articleSection: opts.section,
    inLanguage: 'en-US',
    mainEntityOfPage: { '@id': abs(opts.path) + '#webpage' },
    author: { '@type': 'Organization', name: 'SpiceVacations Editorial Team', url: abs('/about/') },
    publisher: { '@id': ORG_ID },
  };
}

export function howTo(h: { name: string; totalTime: string; steps: { name: string; text: string }[] }, path: string) {
  return {
    '@type': 'HowTo',
    '@id': abs(path) + '#howto',
    name: h.name,
    totalTime: h.totalTime,
    step: h.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.name, text: s.text, url: abs(path) + `#step-${i + 1}` })),
  };
}

export function touristDestination(opts: { path: string; name: string; description: string; image: string; country: string; region?: string; activities: string[] }) {
  return {
    '@type': 'TouristDestination',
    '@id': abs(opts.path) + '#destination',
    name: opts.name,
    description: opts.description,
    url: abs(opts.path),
    image: abs(opts.image),
    touristType: ['Couples', 'Honeymooners', 'Leisure travelers'],
    includesAttraction: opts.activities.slice(0, 6).map((a) => ({ '@type': 'TouristAttraction', name: a })),
    containedInPlace: { '@type': 'Place', name: opts.region ? `${opts.region}, ${opts.country}` : opts.country },
  };
}

export function lodging(opts: {
  path: string;
  name: string;
  description: string;
  image: string;
  locality: string;
  country: string;
  amenities: string[];
  rating?: { value: number; count: number };
}) {
  return {
    '@type': 'Resort',
    '@id': abs(opts.path) + '#lodging',
    name: opts.name,
    description: opts.description,
    url: abs(opts.path),
    image: abs(opts.image),
    address: { '@type': 'PostalAddress', addressLocality: opts.locality, addressCountry: opts.country },
    amenityFeature: opts.amenities.map((a) => ({ '@type': 'LocationFeatureSpecification', name: a, value: true })),
    ...(opts.rating ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: opts.rating.value, reviewCount: opts.rating.count, bestRating: 5 } } : {}),
  };
}

export function itemList(name: string, items: { name: string; href: string }[]) {
  return {
    '@type': 'ItemList',
    name,
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, url: abs(it.href) })),
  };
}

export function graph(...nodes: (object | null | undefined | false)[]) {
  return { '@context': 'https://schema.org', '@graph': [organization(), website(), ...nodes.filter(Boolean)] };
}
