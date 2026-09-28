import { first } from './db';
import { BODY_TYPES, PRICE_BUCKETS } from './constants';
import { parseFaq, type Faq } from './markdown';
import type { SearchFilters } from './search';
import type { Crumb } from './seo';

export interface Landing {
  kind: 'city' | 'make' | 'body' | 'price' | 'city-body' | 'make-model';
  path: string;
  title: string; // <title>
  h1: string;
  description: string;
  keywords: string;
  intro: string;
  content: string | null; // markdown long-form
  faq: Faq[];
  filters: Partial<SearchFilters>;
  crumbs: Crumb[];
  /** Always-indexable pages have unique editorial content; others are noindexed when empty. */
  hasEditorial: boolean;
  statsWhere: { sql: string; params: (string | number)[] };
  city?: { slug: string; name: string; lat: number; lng: number; county: string | null };
  make?: { slug: string; name: string };
  model?: { slug: string; name: string };
  body?: (typeof BODY_TYPES)[number];
}

interface CityRow { id: number; slug: string; name: string; county: string | null; lat: number; lng: number; intro: string | null; body: string | null; faq_json: string | null; }
interface MakeRow { id: number; slug: string; name: string; intro: string | null; }

const base: Crumb[] = [{ name: 'Home', href: '/' }, { name: 'Used Cars', href: '/used-cars' }];

function geoWhere(lat: number, lng: number, radius = 30): { sql: string; params: number[] } {
  const kx = 69.0 * Math.cos((lat * Math.PI) / 180);
  return {
    sql: ' AND v.lat IS NOT NULL AND (((v.lat - ?) * 69.0) * ((v.lat - ?) * 69.0) + ((v.lng - ?) * ?) * ((v.lng - ?) * ?)) <= ?',
    params: [lat, lat, lng, kx, lng, kx, radius * radius],
  };
}

function genericFaq(scope: string, filterHint: string): Faq[] {
  return [
    { q: `How do I find ${scope} on BamaMotors?`, a: `This page lists ${scope} from Alabama dealerships. ${filterHint} Use the sort menu to see the lowest prices or newest listings first.` },
    { q: 'Can I contact the dealer directly?', a: 'Yes. Every listing includes Contact Dealer, Request Price, Schedule Test Drive and Financing buttons that send your request straight to the dealership.' },
    { q: 'Are the prices on BamaMotors final?', a: 'Prices are the dealer’s asking price and exclude sales tax, title, registration and dealer fees. Ask the dealer for an itemized out-the-door price before you visit.' },
  ];
}

export async function resolveLanding(db: D1Database, slug: string, sub?: string): Promise<Landing | null> {
  const city = /-al$/.test(slug) ? await first<CityRow>(db, 'SELECT * FROM cities WHERE slug = ?', [slug]) : null;
  const body = BODY_TYPES.find((b) => b.slug === slug);
  const price = PRICE_BUCKETS.find((p) => p.slug === slug);
  const make = !city && !body && !price ? await first<MakeRow>(db, 'SELECT id, slug, name, intro FROM makes WHERE slug = ?', [slug]) : null;

  // ── Single-segment pages ──
  if (!sub) {
    if (city) {
      const g = geoWhere(city.lat, city.lng);
      return {
        kind: 'city', path: `/used-cars/${city.slug}`,
        title: `Used Cars for Sale in ${city.name}, AL`,
        h1: `Used Cars for Sale in ${city.name}, AL`,
        description: `Shop used cars for sale in ${city.name}, AL from local dealers. Compare prices, mileage and photos, and contact ${city.name} dealerships directly on BamaMotors.`,
        keywords: `used cars ${city.name} AL, used cars for sale ${city.name}, cheap used cars ${city.name}, used car dealers ${city.name}`,
        intro: city.intro ?? '', content: city.body, faq: parseFaq(city.faq_json),
        filters: { city: city.slug }, crumbs: [...base, { name: city.name, href: `/used-cars/${city.slug}` }],
        hasEditorial: true, statsWhere: g, city,
      };
    }
    if (body) {
      return {
        kind: 'body', path: `/used-cars/${body.slug}`,
        title: `Used ${body.plural} for Sale in Alabama`,
        h1: `Used ${body.plural} for Sale in Alabama`,
        description: `Browse used ${body.plural.toLowerCase()} for sale across Alabama from local dealerships. Filter by price, mileage and city and contact dealers directly.`,
        keywords: `used ${body.plural.toLowerCase()} Alabama, used ${body.plural.toLowerCase()} for sale Alabama, cheap ${body.plural.toLowerCase()} Alabama, affordable ${body.plural.toLowerCase()} Alabama`,
        intro: `Find used ${body.plural.toLowerCase()} for sale from dealers in Birmingham, Huntsville, Mobile, Montgomery and across Alabama. Compare asking prices and mileage side by side, then send your questions straight to the dealership.`,
        content: null, faq: genericFaq(`used ${body.plural.toLowerCase()}`, 'Choose a city or enter your ZIP code to see the closest vehicles.'),
        filters: { body: body.value }, crumbs: [...base, { name: `Used ${body.plural}`, href: `/used-cars/${body.slug}` }],
        hasEditorial: false, statsWhere: { sql: ' AND v.body_type = ?', params: [body.value] }, body,
      };
    }
    if (price) {
      return {
        kind: 'price', path: `/used-cars/${price.slug}`,
        title: `Used Cars ${price.label} in Alabama`,
        h1: `Used Cars ${price.label} for Sale in Alabama`,
        description: `Find cheap used cars ${price.label.toLowerCase()} for sale in Alabama from local dealers. Compare affordable cars by mileage, city and body type.`,
        keywords: `cars ${price.label.toLowerCase()} Alabama, cheap used cars Alabama, affordable used cars Alabama, cheap cars for sale Alabama`,
        intro: `Shopping on a budget? These are affordable used cars priced ${price.label.toLowerCase()} from Alabama dealerships. At this price, condition and maintenance history matter more than age — read our guide to cars under $10,000 before you buy.`,
        content: null, faq: genericFaq(`used cars ${price.label.toLowerCase()}`, 'Sort by lowest price or narrow down by city, body type and mileage.'),
        filters: { maxPrice: price.max }, crumbs: [...base, { name: price.label, href: `/used-cars/${price.slug}` }],
        hasEditorial: false, statsWhere: { sql: ' AND v.price_cents <= ?', params: [price.max * 100] },
      };
    }
    if (make) {
      return {
        kind: 'make', path: `/used-cars/${make.slug}`,
        title: `Used ${make.name} for Sale in Alabama`,
        h1: `Used ${make.name} Cars, Trucks & SUVs for Sale in Alabama`,
        description: `Shop used ${make.name} vehicles for sale in Alabama. Compare ${make.name} prices, mileage and models from local dealers in Birmingham, Huntsville, Mobile and more.`,
        keywords: `used ${make.name} Alabama, ${make.name} used cars Alabama, used ${make.name} for sale, ${make.name} dealers Alabama`,
        intro: make.intro ?? `Browse used ${make.name} vehicles for sale from Alabama dealerships. Compare models, trims, prices and mileage and contact dealers directly.`,
        content: null, faq: genericFaq(`used ${make.name} vehicles`, `Choose a ${make.name} model to narrow the results.`),
        filters: { make: make.slug }, crumbs: [...base, { name: make.name, href: `/used-cars/${make.slug}` }],
        hasEditorial: Boolean(make.intro), statsWhere: { sql: ' AND mk.slug = ?', params: [make.slug] }, make,
      };
    }
    return null;
  }

  // ── Two-segment pages ──
  if (city) {
    const b = BODY_TYPES.find((x) => x.slug === sub);
    if (!b) return null;
    const g = geoWhere(city.lat, city.lng);
    return {
      kind: 'city-body', path: `/used-cars/${city.slug}/${b.slug}`,
      title: `Used ${b.plural} for Sale in ${city.name}, AL`,
      h1: `Used ${b.plural} for Sale in ${city.name}, AL`,
      description: `Shop used ${b.plural.toLowerCase()} for sale in ${city.name}, AL from local dealers. Compare prices and mileage and contact ${city.name} dealerships directly.`,
      keywords: `used ${b.plural.toLowerCase()} ${city.name} AL, used ${b.plural.toLowerCase()} for sale ${city.name}, affordable ${b.plural.toLowerCase()} ${city.name}`,
      intro: `Looking for a used ${b.value.toLowerCase()} in ${city.name}? These ${b.plural.toLowerCase()} are listed by dealers in and around ${city.name}${city.county ? ` (${city.county})` : ''}. Compare prices, check mileage and request a price or test drive in one click.`,
      content: null, faq: genericFaq(`used ${b.plural.toLowerCase()} in ${city.name}`, `Results include dealers within about 30 miles of ${city.name}.`),
      filters: { city: city.slug, body: b.value },
      crumbs: [...base, { name: city.name, href: `/used-cars/${city.slug}` }, { name: b.plural, href: `/used-cars/${city.slug}/${b.slug}` }],
      hasEditorial: false, statsWhere: { sql: `${g.sql} AND v.body_type = ?`, params: [...g.params, b.value] }, city, body: b,
    };
  }
  if (make) {
    const model = await first<{ slug: string; name: string; intro: string | null; body_type: string | null }>(db, 'SELECT slug, name, intro, body_type FROM models WHERE make_id = ? AND slug = ?', [make.id, sub]);
    if (!model) return null;
    const full = `${make.name} ${model.name}`;
    return {
      kind: 'make-model', path: `/used-cars/${make.slug}/${model.slug}`,
      title: `Used ${full} for Sale in Alabama`,
      h1: `Used ${full} for Sale in Alabama`,
      description: `Find a used ${full} for sale in Alabama. Compare prices, years, trims and mileage from local dealers and contact them directly.`,
      keywords: `used ${full} Alabama, used ${model.name} for sale Alabama, ${full} price Alabama`,
      intro: model.intro ?? `Compare every used ${full} listed by Alabama dealerships on BamaMotors. Filter by year, price and mileage, check the vehicle history section on each listing, and request an out-the-door price from the dealer.`,
      content: null, faq: genericFaq(`a used ${full}`, 'Filter by model year and mileage to compare similar vehicles.'),
      filters: { make: make.slug, model: model.slug },
      crumbs: [...base, { name: make.name, href: `/used-cars/${make.slug}` }, { name: model.name, href: `/used-cars/${make.slug}/${model.slug}` }],
      hasEditorial: false, statsWhere: { sql: ' AND mk.slug = ? AND md.slug = ?', params: [make.slug, model.slug] }, make, model,
    };
  }
  return null;
}
