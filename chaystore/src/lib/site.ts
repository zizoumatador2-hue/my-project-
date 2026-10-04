export const SITE = {
  name: 'ChayStore',
  url: 'https://chaystore.com',
  tagline: 'Your Everyday Guide to Great Tea',
  description:
    'Independent tea guides: how to brew, how to choose, and how to enjoy chai, green tea, matcha, black tea and herbal tea at home.',
  // Contact point (a contact site, not a mailbox).
  contactUrl: 'https://info.christopherkunz.com',
  contactLabel: 'info.christopherkunz.com',
  author: 'ChayStore Editorial Team',
  gaId: import.meta.env.PUBLIC_GA_ID ?? '',
};

export const HUBS = {
  brewing: { name: 'Brewing Guides', blurb: 'Ratios, temperatures, timing and technique for a better cup.' },
  'chai-black-tea': { name: 'Chai & Black Tea', blurb: 'Masala chai, Assam, Darjeeling, Earl Grey and more.' },
  'green-tea-matcha': { name: 'Green Tea & Matcha', blurb: 'Matcha, sencha, jasmine, kahwa and everything green.' },
  'herbal-tea': { name: 'Herbal Tea', blurb: 'Caffeine-free infusions for any hour of the day.' },
  'tea-gear': { name: 'Tea Gear', blurb: 'Kettles, infusers and tools, explained before you buy.' },
  'tea-wellness': { name: 'Tea & Wellness', blurb: 'Caffeine, daily habits and what reputable sources say.' },
} as const;
export type HubId = keyof typeof HUBS;
export const HUB_IDS = Object.keys(HUBS) as [HubId, ...HubId[]];

// Flip to true once an ad network approves the site (reserves space to avoid layout shift).
export const ADS_ENABLED = false;
// Set to true only after you are enrolled in Amazon Associates (shows the required statement).
export const AMAZON_ASSOCIATE = false;
