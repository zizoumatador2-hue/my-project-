import { SITE } from './site';

export const abs = (p: string) => new URL(p, SITE.url).toString();

export const organization = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE.url}/#org`,
  name: SITE.name,
  url: SITE.url,
  description: SITE.description,
  email: SITE.email,
});

export const website = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE.url}/#website`,
  url: SITE.url,
  name: SITE.name,
  description: SITE.description,
  inLanguage: 'en-US',
  publisher: { '@id': `${SITE.url}/#org` },
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE.url}/search/?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
});

export const breadcrumbs = (items: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path) })),
});

export const faqPage = (faq: { q: string; a: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
});

export const article = (o: { title: string; description: string; path: string; published: string; modified: string; image?: string }) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: o.title,
  description: o.description,
  mainEntityOfPage: abs(o.path),
  datePublished: o.published,
  dateModified: o.modified,
  inLanguage: 'en-US',
  author: { '@type': 'Organization', name: SITE.author, url: abs('/about/') },
  publisher: { '@id': `${SITE.url}/#org` },
  ...(o.image ? { image: abs(o.image) } : {}),
});

export const howTo = (o: { name: string; totalTime: string; steps: { name: string; text: string }[] }) => ({
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: o.name,
  totalTime: o.totalTime,
  step: o.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.name, text: s.text })),
});
