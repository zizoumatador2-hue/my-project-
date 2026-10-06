const env = import.meta.env;

export const SITE = {
  name: 'DistritoGamer',
  domain: 'distritogamer.com',
  url: (env.PUBLIC_SITE_URL || 'https://distritogamer.com').replace(/\/$/, ''),
  tagline: 'Play Better. Know More. Game Smarter.',
  description:
    'Practical gaming tips, detailed guides, strategies, settings and recommendations to help you get more from every game.',
  locale: 'en_US',
  language: 'en',
  // Bump when /global.css changes so the long-lived cache is busted.
  assetVersion: '3',
  foundingYear: 2026,
  contactEmail: env.PUBLIC_CONTACT_EMAIL || 'contact@distritogamer.com',
  contactEndpoint: env.PUBLIC_CONTACT_ENDPOINT || '',
  newsletterEndpoint: env.PUBLIC_NEWSLETTER_ENDPOINT || '',
  adsenseClient: env.PUBLIC_ADSENSE_CLIENT || '',
  ga4Id: env.PUBLIC_GA4_ID || '',
  gscVerification: env.PUBLIC_GSC_VERIFICATION || '',
  bingVerification: env.PUBLIC_BING_VERIFICATION || '',
  social: {
    x: env.PUBLIC_SOCIAL_X || '',
    youtube: env.PUBLIC_SOCIAL_YOUTUBE || '',
    reddit: env.PUBLIC_SOCIAL_REDDIT || '',
  },
  // Treated as "no link yet" everywhere: the CTA button is simply not rendered.
  affiliatePlaceholder: 'AFFILIATE_LINK_PLACEHOLDER',
};

export const isAffiliateReady = (url?: string) =>
  !!url && url !== SITE.affiliatePlaceholder && /^https:\/\//.test(url);
