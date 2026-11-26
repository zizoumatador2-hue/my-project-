import { SITE } from '../data/site';
import { url, type lookup } from './content';
import { photoFor } from './photos';

/** One Pinterest pin per guide, destination and vacation type (src/pages/pins/*). */
export type PinTarget = {
  slug: string;
  pkey: string;
  href: string;
  kicker: string;
  /** Short headline printed on the pin image. */
  pinTitle: string;
  /** Pin title field (max 100 characters). */
  title: string;
  description: string;
  board: string;
  keywords: string[];
  scene: string;
  palette: string;
  ai: boolean;
};

export const BOARDS = {
  romantic: 'Romantic Getaways for Couples',
  honeymoon: 'Honeymoon Destinations & Resorts',
  resorts: 'All-Inclusive & Adults-Only Resorts',
  beach: 'Beach Vacations for Couples',
  usa: 'USA Romantic Getaways',
  tropics: 'Mexico & Caribbean Vacations',
  tips: 'Couples Travel Tips & Deals',
} as const;

const GUIDE_BOARD: Record<string, string> = {
  'honeymoon-vacations': BOARDS.honeymoon,
  'adults-only-resorts': BOARDS.resorts,
  'all-inclusive-resorts': BOARDS.resorts,
  'beach-vacations': BOARDS.beach,
  'weekend-getaways': BOARDS.usa,
  'luxury-vacations': BOARDS.romantic,
  'couples-vacations': BOARDS.romantic,
  'romantic-getaways': BOARDS.romantic,
  'cruise-vacations': BOARDS.tips,
};

const clip = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');
const headline = (t: string) => {
  const head = t.split(/[:—–]/)[0].trim();
  return head.length >= 18 ? head : t;
};

export function pinTargets(L: Awaited<ReturnType<typeof lookup>>): PinTarget[] {
  const out: PinTarget[] = [];
  const cta = 'Read the full guide on SpiceVacations.com.';
  for (const g of L.guides.values()) {
    const d = g.data;
    const usa = d.destinations.length > 0 && d.destinations.every((id) => L.destinations.get(id)?.data.region === 'usa');
    const tropics = d.destinations.length > 0 && d.destinations.every((id) => L.destinations.get(id)?.data.region !== 'usa');
    out.push({
      slug: `guide-${g.id}`,
      pkey: `guides/${g.id}`,
      href: url.guide(g.id),
      kicker: 'Travel guide',
      pinTitle: headline(d.title),
      title: clip(d.title, 100),
      description: clip(`${d.metaDescription} ${cta}`, 500),
      // Topic boards (honeymoon, resorts, beach) win; otherwise file by region.
      board: [BOARDS.honeymoon, BOARDS.resorts, BOARDS.beach].includes(GUIDE_BOARD[d.category] as never)
        ? GUIDE_BOARD[d.category]
        : usa
          ? BOARDS.usa
          : tropics
            ? BOARDS.tropics
            : (GUIDE_BOARD[d.category] ?? BOARDS.romantic),
      keywords: [d.primaryKeyword, ...d.secondaryKeywords].slice(0, 6),
      scene: d.scene,
      palette: d.palette,
      ai: Boolean(photoFor(`guides/${g.id}`)?.ai),
    });
  }
  for (const x of L.destinations.values()) {
    const d = x.data;
    out.push({
      slug: `destination-${x.id}`,
      pkey: `destinations/${x.id}`,
      href: url.destination(x.id),
      kicker: 'Destination guide',
      pinTitle: `${d.name} for Couples`,
      title: clip(`${d.name} for Couples: Where to Stay, When to Go & What to Do`, 100),
      description: clip(`${d.tagline} ${d.summary} ${cta}`, 500),
      board: d.region === 'usa' ? BOARDS.usa : BOARDS.tropics,
      keywords: [`${d.name} couples vacation`, `${d.name} romantic getaway`, `${d.name} resorts for couples`, `best time to visit ${d.name}`],
      scene: d.scene,
      palette: d.palette,
      ai: Boolean(photoFor(`destinations/${x.id}`)?.ai),
    });
  }
  for (const t of L.vacationTypes.values()) {
    const d = t.data;
    const singular = d.name.replace(/s$/, ''); // "Beach Vacations" → "Beach Vacation Ideas"
    out.push({
      slug: `type-${t.id}`,
      pkey: `vacation-types/${t.id}`,
      href: url.vacationType(t.id),
      kicker: 'Ideas for couples',
      pinTitle: `${singular} Ideas`,
      title: clip(`${singular} Ideas${/couple/i.test(d.name) ? '' : ' for Couples'}: Resorts, Destinations & Tips`, 100),
      description: clip(`${d.tagline} ${d.summary} Explore resorts, destinations and planning tips on SpiceVacations.com.`, 500),
      board: GUIDE_BOARD[t.id] ?? BOARDS.romantic,
      keywords: [d.name.toLowerCase(), `${d.name.toLowerCase()} for couples`, `${d.name.toLowerCase()} ideas`],
      scene: d.scene,
      palette: d.palette,
      ai: Boolean(photoFor(`vacation-types/${t.id}`)?.ai),
    });
  }
  return out;
}

/** Pinterest bulk-upload CSV (Business accounts: Create → Create Pin → Bulk create Pins). */
export function pinsCsv(targets: PinTarget[]) {
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = targets.map((t) => {
    const link = new URL(t.href, SITE.url);
    link.searchParams.set('utm_source', 'pinterest');
    link.searchParams.set('utm_medium', 'social');
    link.searchParams.set('utm_campaign', 'pins');
    return [t.title, new URL(`/pins/${t.slug}.jpg`, SITE.url).toString(), t.board, '', t.description, link.toString(), '', t.keywords.join(', ')].map(q).join(',');
  });
  return ['Title,Media URL,Pinterest board,Thumbnail,Description,Link,Publish date,Keywords', ...rows].join('\n') + '\n';
}
