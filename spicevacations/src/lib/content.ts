import { getCollection, type CollectionEntry } from 'astro:content';
import { getAffiliateUrl, type AffiliateTarget, type ProductType } from './affiliate';

export type Destination = CollectionEntry<'destinations'>;
export type Resort = CollectionEntry<'resorts'>;
export type Guide = CollectionEntry<'guides'>;
export type VacationType = CollectionEntry<'vacationTypes'>;
export type Deal = CollectionEntry<'deals'>;

export const url = {
  destination: (id: string) => `/destinations/${id}/`,
  resort: (id: string) => `/resorts/${id}/`,
  guide: (id: string) => `/guides/${id}/`,
  vacationType: (id: string) => `/vacation-types/${id}/`,
  deal: (id: string) => `/deals/${id}/`,
};

const byOrder = <T extends { data: { order?: number } }>(a: T, b: T) => (a.data.order ?? 100) - (b.data.order ?? 100);

export async function getDestinations() {
  return (await getCollection('destinations')).sort(byOrder);
}
export async function getResorts() {
  return (await getCollection('resorts')).sort((a, b) => Number(b.data.featured) - Number(a.data.featured) || a.data.name.localeCompare(b.data.name));
}
export async function getGuides() {
  return (await getCollection('guides', (g) => !g.data.draft)).sort((a, b) => b.data.updated.valueOf() - a.data.updated.valueOf() || a.data.title.localeCompare(b.data.title));
}
export async function getVacationTypes() {
  return (await getCollection('vacationTypes')).sort(byOrder);
}
export async function getDeals() {
  return (await getCollection('deals')).sort((a, b) => Number(b.data.featured) - Number(a.data.featured) || a.data.title.localeCompare(b.data.title));
}

export async function lookup() {
  const [d, r, g, v, de] = await Promise.all([getDestinations(), getResorts(), getGuides(), getVacationTypes(), getDeals()]);
  return {
    destinations: new Map(d.map((x) => [x.id, x])),
    resorts: new Map(r.map((x) => [x.id, x])),
    guides: new Map(g.map((x) => [x.id, x])),
    vacationTypes: new Map(v.map((x) => [x.id, x])),
    deals: new Map(de.map((x) => [x.id, x])),
  };
}

/** Affiliate targets for every item, shared by the CTAs and the /go/ map so both always agree. */
export function destinationTarget(d: Destination, productType: ProductType = 'hotel', fallbackHref = url.destination(d.id)): AffiliateTarget {
  const where = d.data.state ? `${d.data.name}, ${d.data.state}` : d.data.name;
  return { kind: 'destination', slug: d.id, productType, query: where, fallbackHref };
}
export function resortTarget(r: Resort, fallbackHref = url.resort(r.id)): AffiliateTarget {
  return { kind: 'resort', slug: r.id, productType: 'resort', query: `${r.data.name} ${r.data.location}`, fallbackHref };
}
export function dealTarget(d: Deal, destName: string, fallbackHref = url.deal(d.id)): AffiliateTarget {
  return { kind: 'deal', slug: d.id, productType: d.data.productType, query: destName, fallbackHref };
}

export async function allAffiliateTargets(): Promise<AffiliateTarget[]> {
  const { destinations, resorts, deals } = await lookup();
  const out: AffiliateTarget[] = [];
  for (const d of destinations.values()) out.push(destinationTarget(d, 'hotel'), destinationTarget(d, 'tour'), destinationTarget(d, 'flight'));
  for (const r of resorts.values()) out.push(resortTarget(r));
  for (const d of deals.values()) out.push(dealTarget(d, destinations.get(d.data.destination)?.data.name ?? d.data.destination));
  return out;
}

export { getAffiliateUrl };

export function readingTime(body = '') {
  const words = body.split(/\s+/).filter(Boolean).length;
  return { words, minutes: Math.max(1, Math.round(words / 230)) };
}

export const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export const TRAVELER_LABEL: Record<string, string> = {
  couples: 'Couples',
  honeymooners: 'Honeymooners',
  families: 'Families',
  friends: 'Friends',
  solo: 'Solo travelers',
};
export const BUDGET_LABEL: Record<string, string> = { value: 'Value', 'mid-range': 'Mid-range', splurge: 'Splurge' };
export const RESORT_TYPE_LABEL: Record<string, string> = {
  'all-inclusive': 'All-inclusive',
  'adults-only': 'Adults-only',
  luxury: 'Luxury',
  beachfront: 'Beachfront',
  boutique: 'Boutique',
  spa: 'Spa',
  casino: 'Casino resort',
  historic: 'Historic',
  overwater: 'Overwater',
};
export const REGION_LABEL: Record<string, string> = { usa: 'United States', mexico: 'Mexico', caribbean: 'Caribbean' };
