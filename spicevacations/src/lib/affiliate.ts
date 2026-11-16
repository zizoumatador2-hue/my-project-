import registry from '../data/affiliates.json';

export type ProductType = 'hotel' | 'resort' | 'flight' | 'cruise' | 'car' | 'tour' | 'insurance';
export type ItemKind = 'destination' | 'resort' | 'deal';

type Partner = (typeof registry.partners)[number];
type Override = { partner: string; query?: string; url?: string };

export interface AffiliateTarget {
  kind: ItemKind;
  slug: string;
  productType: ProductType;
  /** Free-text search the partner should run, e.g. "Hotel Wailea Maui". */
  query: string;
  /** Our own page to use when no active partner exists for this product. */
  fallbackHref: string;
}

export interface ResolvedLink {
  /** Internal URL rendered in HTML. Affiliate URLs never appear in markup. */
  href: string;
  /** True when the link leaves the site through /go/ (sponsored). */
  sponsored: boolean;
  partnerName?: string;
  /** Registry key, also the /go/ path. */
  id?: string;
}

const partners = new Map<string, Partner>(registry.partners.map((p) => [p.id, p]));
const overrides = registry.overrides as unknown as Record<string, Override | string>;

export function partnerFor(productType: ProductType, override?: Override): Partner | undefined {
  const id = override?.partner ?? (registry.defaults as Record<string, string>)[productType];
  const p = id ? partners.get(id) : undefined;
  if (!p || !p.active || !p.urlTemplate || !p.productTypes.includes(productType)) return undefined;
  return p;
}

export function goId(t: Pick<AffiliateTarget, 'kind' | 'slug' | 'productType'>) {
  return `${t.kind}/${t.slug}/${t.productType}`;
}

function overrideFor(t: AffiliateTarget): Override | undefined {
  const o = overrides[`${t.kind}:${t.slug}`];
  return typeof o === 'object' ? o : undefined;
}

/** Final outbound URL, including tracking ID and UTM defaults. Used only by the /go/ map. */
export function buildOutboundUrl(t: AffiliateTarget): string | undefined {
  const o = overrideFor(t);
  const p = partnerFor(t.productType, o);
  if (!p) return undefined;
  const raw = o?.url ?? p.urlTemplate.replace('{query}', encodeURIComponent(o?.query ?? t.query));
  const url = new URL(raw);
  if (p.trackingParam && p.trackingId) url.searchParams.set(p.trackingParam, p.trackingId);
  for (const [k, v] of Object.entries(p.utm as Record<string, string>)) if (!url.searchParams.has(k)) url.searchParams.set(k, v);
  url.searchParams.set('utm_campaign', `${t.kind}-${t.slug}`);
  return url.toString();
}

/** The single resolver every CTA uses. */
export function getAffiliateUrl(t: AffiliateTarget): ResolvedLink {
  const p = partnerFor(t.productType, overrideFor(t));
  if (!p) return { href: t.fallbackHref, sponsored: false };
  const id = goId(t);
  return { href: `/go/${id}/`, sponsored: true, partnerName: p.name, id };
}

export const PRODUCT_LABEL: Record<ProductType, string> = {
  hotel: 'Hotels',
  resort: 'Resorts',
  flight: 'Flights',
  cruise: 'Cruises',
  car: 'Car rentals',
  tour: 'Tours & activities',
  insurance: 'Travel insurance',
};

export const listPartners = () => registry.partners.map(({ id, name, productTypes, active }) => ({ id, name, productTypes, active }));
