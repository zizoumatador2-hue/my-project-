import type { Faq } from './markdown';

export interface Crumb { name: string; href: string; }

export const absolute = (site: string, path: string) => `${site.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;

export function breadcrumbLd(site: string, crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: absolute(site, c.href) })),
  };
}

export function faqLd(faq: Faq[]) {
  if (!faq.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

export function organizationLd(site: string, settings: Record<string, string>) {
  const sameAs = ['social_facebook', 'social_instagram', 'social_x', 'social_youtube'].map((k) => settings[k]).filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${absolute(site, '/')}#organization`,
    name: settings.site_name || 'BamaMotors',
    url: absolute(site, '/'),
    logo: absolute(site, '/logo.png'),
    description: 'BamaMotors is an Alabama automotive marketplace that helps shoppers find used cars and connect with local dealerships.',
    areaServed: { '@type': 'State', name: 'Alabama', sameAs: 'https://en.wikipedia.org/wiki/Alabama' },
    ...(settings.contact_email ? { email: settings.contact_email } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function websiteLd(site: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${absolute(site, '/')}#website`,
    name: 'BamaMotors',
    url: absolute(site, '/'),
    publisher: { '@id': `${absolute(site, '/')}#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${absolute(site, '/used-cars')}?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function itemListLd(site: string, name: string, items: { slug: string; title: string }[]) {
  if (!items.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, url: absolute(site, `/vehicles/${it.slug}`), name: it.title })),
  };
}
