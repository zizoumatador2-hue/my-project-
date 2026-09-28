import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import { lookup, url } from '../../lib/content';

/** Generated 1200×630 Open Graph images: brand scene + title + logo, one per indexable page. */
type Card = { slug: string; title: string; kicker: string; scene: string; palette: string };

const STATIC: Card[] = [
  { slug: 'home', title: 'Romantic Getaways for Couples', kicker: 'The complete guide', scene: 'sunset', palette: 'coral' },
  { slug: 'destinations', title: 'Vacation Destinations for Couples', kicker: 'Destinations', scene: 'tropical', palette: 'coral' },
  { slug: 'resorts', title: 'Resorts for Couples', kicker: 'Resorts', scene: 'pool', palette: 'teal' },
  { slug: 'guides', title: 'Travel Guides for Couples', kicker: 'Guides', scene: 'harbor', palette: 'gold' },
  { slug: 'deals', title: 'Vacation Deals, Minus the Hype', kicker: 'Deals', scene: 'cruise', palette: 'gold' },
  { slug: 'vacation-types', title: 'Find Your Kind of Escape', kicker: 'Vacation types', scene: 'beach', palette: 'gold' },
  { slug: 'plan-my-vacation', title: 'Plan My Vacation', kicker: 'Free trip planner', scene: 'overwater', palette: 'dusk' },
  { slug: 'search', title: 'Search Vacations', kicker: 'Search', scene: 'beach', palette: 'teal' },
  { slug: 'saved', title: 'Your Saved Trips', kicker: 'Saved', scene: 'beach', palette: 'coral' },
  ...['about', 'contact', 'faq', 'privacy-policy', 'terms', 'affiliate-disclosure', 'cookie-policy', 'brand', 'contact--thanks', 'newsletter--thanks', '404', '500'].map((s) => ({
    slug: s,
    title: s === 'faq' ? 'Frequently Asked Questions' : s.replace(/--/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    kicker: 'SpiceVacations.com',
    scene: 'sunset',
    palette: 'dusk',
  })),
];

export const getStaticPaths = (async () => {
  const L = await lookup();
  const cards: Card[] = [...STATIC];
  const slugOf = (p: string) => p.replace(/^\/|\/$/g, '').replace(/\//g, '--');
  for (const d of L.destinations.values()) cards.push({ slug: slugOf(url.destination(d.id)), title: `${d.data.name} for Couples`, kicker: 'Destination', scene: d.data.scene, palette: d.data.palette });
  for (const r of L.resorts.values()) cards.push({ slug: slugOf(url.resort(r.id)), title: r.data.name, kicker: r.data.location, scene: r.data.scene, palette: r.data.palette });
  for (const g of L.guides.values()) cards.push({ slug: slugOf(url.guide(g.id)), title: g.data.title, kicker: 'Travel guide', scene: g.data.scene, palette: g.data.palette });
  for (const t of L.vacationTypes.values()) cards.push({ slug: slugOf(url.vacationType(t.id)), title: t.data.name, kicker: 'Vacation type', scene: t.data.scene, palette: t.data.palette });
  for (const de of L.deals.values()) cards.push({ slug: slugOf(url.deal(de.id)), title: de.data.title, kicker: 'Deal timing', scene: de.data.scene, palette: de.data.palette });
  return cards.map((c) => ({ params: { slug: c.slug }, props: c }));
}) satisfies GetStaticPaths;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function wrap(text: string, max: number) {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > max) {
      lines.push(line.trim());
      line = w;
    } else line += ' ' + w;
  }
  if (line.trim()) lines.push(line.trim());
  return lines.slice(0, 3);
}

export const GET: APIRoute = async ({ props }) => {
  const c = props as Card;
  const { readFile } = await import('node:fs/promises');
  const art = await readFile(new URL(`../../../public/art/${c.scene}-${c.palette}.svg`, import.meta.url)).catch(() => readFile(`public/art/${c.scene}-${c.palette}.svg`));
  const bg = await sharp(art).resize(1200, 630, { fit: 'cover' }).png().toBuffer();
  const lines = wrap(c.title, 26);
  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <defs><linearGradient id="f" x1="0" x2="1"><stop offset="0" stop-color="#0B1F3A" stop-opacity=".92"/><stop offset=".75" stop-color="#0B1F3A" stop-opacity=".35"/><stop offset="1" stop-color="#0B1F3A" stop-opacity="0"/></linearGradient>
    <linearGradient id="lg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#FF5A36"/><stop offset="1" stop-color="#FFB627"/></linearGradient></defs>
    <rect width="1200" height="630" fill="url(#f)"/>
    <g transform="translate(72 64) scale(1.1)"><circle cx="35" cy="44" r="11" fill="#FFB627"/><path d="M8 44A24 24 0 0 1 56 44A19.5 19.5 0 0 0 17 44Z" fill="url(#lg)"/><path d="M12.5 44.5c0 4.8-2.4 7.8-7 9" fill="none" stroke="#14B8A6" stroke-width="3.6" stroke-linecap="round"/><path d="M20 50.5h32M27 57h18" stroke="#FFF8F0" stroke-width="3.6" stroke-linecap="round"/></g>
    <text x="160" y="118" font-family="DejaVu Serif, Georgia, serif" font-weight="700" font-size="40" fill="#FFF8F0">Spice<tspan fill="#FFB627">Vacations</tspan><tspan font-size="24" fill="#FFF8F0" fill-opacity=".8">.com</tspan></text>
    <text x="72" y="${lines.length > 2 ? 290 : 330}" font-family="DejaVu Sans, Arial, sans-serif" font-size="26" font-weight="700" letter-spacing="3" fill="#FFB627">${esc(c.kicker.toUpperCase().slice(0, 48))}</text>
    ${lines.map((l, i) => `<text x="72" y="${(lines.length > 2 ? 360 : 400) + i * 72}" font-family="DejaVu Serif, Georgia, serif" font-weight="700" font-size="62" fill="#FFFFFF">${esc(l)}</text>`).join('')}
    <rect x="72" y="560" width="120" height="6" rx="3" fill="url(#lg)"/>
  </svg>`;
  const png = await sharp(bg).composite([{ input: Buffer.from(overlay) }]).png({ compressionLevel: 9 }).toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
