import { all } from './db';
import { BODY_TYPES, PRICE_BUCKETS } from './constants';

export interface UrlEntry { loc: string; lastmod?: string | null; }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function urlset(site: string, entries: UrlEntry[]): Response {
  const base = site.replace(/\/$/, '');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
    .map((e) => `  <url><loc>${esc(base + e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod.slice(0, 10)}</lastmod>` : ''}</url>`)
    .join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}

/** Landing pages are only listed when they have real inventory or unique editorial content (no thin pages). */
export async function landingEntries(db: D1Database): Promise<UrlEntry[]> {
  const active = "v.status = 'active' AND d.status = 'active'";
  const [cities, bodies, makes, models, cityBodies, prices] = await Promise.all([
    all<{ slug: string; updated_at: string }>(db, 'SELECT slug, updated_at FROM cities ORDER BY sort_order'),
    all<{ body_type: string }>(db, `SELECT DISTINCT v.body_type FROM vehicles v JOIN dealers d ON d.id = v.dealer_id WHERE ${active}`),
    all<{ slug: string }>(db, `SELECT mk.slug FROM makes mk WHERE EXISTS (SELECT 1 FROM vehicles v JOIN dealers d ON d.id = v.dealer_id WHERE v.make_id = mk.id AND ${active})`),
    all<{ make: string; model: string }>(db, `SELECT DISTINCT mk.slug AS make, md.slug AS model FROM vehicles v JOIN dealers d ON d.id = v.dealer_id JOIN makes mk ON mk.id = v.make_id JOIN models md ON md.id = v.model_id WHERE ${active}`),
    all<{ city: string; body_type: string; lat: number; lng: number }>(db, `SELECT c.slug AS city, v.body_type, c.lat, c.lng FROM cities c JOIN vehicles v JOIN dealers d ON d.id = v.dealer_id
       WHERE ${active} AND v.lat IS NOT NULL AND ((v.lat - c.lat) * (v.lat - c.lat) * 4761 + (v.lng - c.lng) * (v.lng - c.lng) * 3350) <= 900 GROUP BY c.slug, v.body_type`),
    all<{ p: number }>(db, `SELECT MIN(v.price_cents) AS p FROM vehicles v JOIN dealers d ON d.id = v.dealer_id WHERE ${active}`),
  ]);
  const minPrice = (prices[0]?.p ?? Infinity) / 100;
  const bodySlug = (value: string) => BODY_TYPES.find((b) => b.value === value)?.slug;
  return [
    ...cities.map((c) => ({ loc: `/used-cars/${c.slug}`, lastmod: c.updated_at })),
    ...bodies.map((b) => bodySlug(b.body_type)).filter(Boolean).map((s) => ({ loc: `/used-cars/${s}` })),
    ...PRICE_BUCKETS.filter((p) => p.max >= minPrice).map((p) => ({ loc: `/used-cars/${p.slug}` })),
    ...makes.map((m) => ({ loc: `/used-cars/${m.slug}` })),
    ...models.map((m) => ({ loc: `/used-cars/${m.make}/${m.model}` })),
    ...cityBodies.map((cb) => bodySlug(cb.body_type)).map((s, i) => (s ? { loc: `/used-cars/${cityBodies[i].city}/${s}` } : null)).filter((x): x is UrlEntry => !!x),
  ];
}

let indexableCache: { at: number; paths: Set<string> } | null = null;
/**
 * Paths of landing pages that are indexable right now (same rule as the sitemap). Templates use it to link only to
 * landing pages worth crawling, instead of to hundreds of empty city/body/model combinations. Cached per isolate for
 * `ttlMs` (production only; elsewhere links must match the noindex decision immediately, e.g. right after a sale).
 */
export async function indexableLandingPaths(db: D1Database, ttlMs = 0): Promise<Set<string>> {
  if (ttlMs > 0 && indexableCache && Date.now() - indexableCache.at < ttlMs) return indexableCache.paths;
  const paths = new Set((await landingEntries(db)).map((e) => e.loc));
  indexableCache = { at: Date.now(), paths };
  return paths;
}

/**
 * Editorial Markdown links to two-level landing pages (e.g. /used-cars/huntsville-al/suvs) point to empty, noindexed
 * pages until inventory exists. Send those links to the nearest indexable parent (the city or make page, else the
 * main search) so readers and crawlers land on a useful page. Links become specific again once inventory exists.
 */
export function resolveLandingLinks(html: string, indexable: Set<string>): string {
  return html.replace(/href="(\/used-cars\/([a-z0-9-]+)\/[a-z0-9-]+)"/g, (whole, path: string, parent: string) => {
    if (indexable.has(path)) return whole;
    return `href="${indexable.has(`/used-cars/${parent}`) ? `/used-cars/${parent}` : '/used-cars'}"`;
  });
}

