import { SITE } from '@/data/site';

type Json = Record<string, unknown>;
export const abs = (path: string) => new URL(path, SITE.url).toString();

export const ORG_ID = `${SITE.url}/#organization`;
export const WEBSITE_ID = `${SITE.url}/#website`;

export function organization(): Json {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE.name,
    url: `${SITE.url}/`,
    logo: { '@type': 'ImageObject', url: abs(SITE.logo), width: 512, height: 512 },
    description: SITE.description,
    email: SITE.email,
    foundingDate: String(SITE.foundingYear),
    areaServed: { '@type': 'Country', name: 'United States' },
    knowsAbout: ['Personal finance', 'Budgeting', 'Credit scores', 'Credit cards', 'Savings accounts', 'Personal loans', 'Mortgages', 'Insurance'],
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: SITE.email, availableLanguage: 'English', url: abs('/contact/') },
    publishingPrinciples: abs('/editorial-standards/'),
    correctionsPolicy: abs('/corrections/'),
    ...(SITE.social.length ? { sameAs: SITE.social.map((s) => s.url) } : {}),
  };
}

export function website(): Json {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${SITE.url}/`,
    name: SITE.name,
    description: SITE.description,
    inLanguage: SITE.language,
    publisher: { '@id': ORG_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE.url}/search/?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export interface Crumb {
  name: string;
  href: string;
}

export function breadcrumb(items: Crumb[]): Json {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.href) })),
  };
}

export interface AuthorLike {
  id: string;
  name: string;
  type: 'Person' | 'Organization';
  sameAs?: string[];
}

export function authorRef(a: AuthorLike): Json {
  if (a.id === 'editorial-team') {
    return { '@type': 'Organization', name: a.name, url: abs('/authors/editorial-team/'), parentOrganization: { '@id': ORG_ID } };
  }
  return { '@type': a.type, name: a.name, url: abs(`/authors/${a.id}/`), ...(a.sameAs?.length ? { sameAs: a.sameAs } : {}) };
}

export function article(o: {
  url: string;
  title: string;
  description: string;
  published: Date;
  updated: Date;
  author: AuthorLike;
  reviewer?: AuthorLike;
  keywords: string[];
  section: string;
  wordCount?: number;
  image?: string;
}): Json {
  return {
    '@type': 'Article',
    '@id': `${abs(o.url)}#article`,
    headline: o.title,
    description: o.description,
    url: abs(o.url),
    mainEntityOfPage: abs(o.url),
    datePublished: o.published.toISOString(),
    dateModified: o.updated.toISOString(),
    author: authorRef(o.author),
    ...(o.reviewer ? { reviewedBy: authorRef(o.reviewer) } : {}),
    publisher: { '@id': ORG_ID },
    isPartOf: { '@id': WEBSITE_ID },
    inLanguage: SITE.language,
    articleSection: o.section,
    keywords: o.keywords.join(', '),
    image: abs(o.image ?? SITE.ogImage),
    ...(o.wordCount ? { wordCount: o.wordCount } : {}),
  };
}

export const stripMd = (s: string) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1');

export function faqPage(faqs: { q: string; a: string }[]): Json {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: stripMd(f.a) },
    })),
  };
}

export function howTo(url: string, h: { name: string; totalTime?: string; steps: { name: string; text: string }[] }): Json {
  return {
    '@type': 'HowTo',
    name: h.name,
    ...(h.totalTime ? { totalTime: h.totalTime } : {}),
    step: h.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
      url: `${abs(url)}#step-${i + 1}`,
    })),
  };
}

export function webApp(o: { url: string; name: string; description: string }): Json {
  return {
    '@type': 'WebApplication',
    name: o.name,
    url: abs(o.url),
    description: o.description,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@id': ORG_ID },
  };
}

export function itemList(name: string, items: { name: string; url: string }[]): Json {
  return {
    '@type': 'ItemList',
    name,
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, url: abs(it.url) })),
  };
}

export function collectionPage(o: { url: string; name: string; description: string }): Json {
  return {
    '@type': 'CollectionPage',
    '@id': `${abs(o.url)}#webpage`,
    url: abs(o.url),
    name: o.name,
    description: o.description,
    isPartOf: { '@id': WEBSITE_ID },
    inLanguage: SITE.language,
  };
}

export function graph(nodes: Json[]): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(/</g, '\\u003c');
}
