import { SITE } from '../config/site';
import { abs } from './utils';

const sameAs = () => Object.values(SITE.social).filter(Boolean);

export const organizationSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE.url}/#organization`,
  name: SITE.name,
  url: SITE.url,
  logo: { '@type': 'ImageObject', url: abs('/logo.png'), width: 512, height: 512 },
  description: SITE.description,
  foundingDate: String(SITE.foundingYear),
  ...(sameAs().length ? { sameAs: sameAs() } : {}),
  contactPoint: { '@type': 'ContactPoint', contactType: 'editorial and general enquiries', email: SITE.contactEmail },
});

export const websiteSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE.url}/#website`,
  url: SITE.url,
  name: SITE.name,
  description: SITE.description,
  inLanguage: 'en-US',
  publisher: { '@id': `${SITE.url}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE.url}/search/?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
});

export const breadcrumbSchema = (items: { name: string; href: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.name,
    item: abs(it.href),
  })),
});

export const faqSchema = (faq: { q: string; a: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faq.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
});

export const howToSchema = (h: { name: string; totalTime?: string; steps: { name: string; text: string }[] }, url: string) => ({
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: h.name,
  ...(h.totalTime ? { totalTime: h.totalTime } : {}),
  step: h.steps.map((s, i) => ({
    '@type': 'HowToStep',
    position: i + 1,
    name: s.name,
    text: s.text,
    url: `${url}#step-${i + 1}`,
  })),
});
