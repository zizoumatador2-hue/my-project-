import { describe, expect, it } from 'vitest';
import { buildOutboundUrl, getAffiliateUrl, goId } from '../src/lib/affiliate';

const resort = { kind: 'resort' as const, slug: 'hotel-wailea', productType: 'resort' as const, query: 'Hotel Wailea Maui', fallbackHref: '/resorts/hotel-wailea/' };

describe('affiliate resolver', () => {
  it('returns an internal /go/ link, never a partner URL', () => {
    const link = getAffiliateUrl(resort);
    expect(link.sponsored).toBe(true);
    expect(link.href).toBe(`/go/${goId(resort)}/`);
    expect(link.href).not.toMatch(/^https?:/);
  });

  it('falls back to our own page when no active partner exists', () => {
    const cruise = { ...resort, kind: 'deal' as const, productType: 'cruise' as const, fallbackHref: '/deals/x/' };
    expect(getAffiliateUrl(cruise)).toEqual({ href: '/deals/x/', sponsored: false });
    expect(buildOutboundUrl(cruise)).toBeUndefined();
  });

  it('builds the outbound URL with query, UTM defaults and campaign', () => {
    const u = new URL(buildOutboundUrl(resort)!);
    expect(u.hostname).toBe('www.booking.com');
    expect(u.searchParams.get('ss')).toBe('Hotel Wailea Maui');
    expect(u.searchParams.get('utm_source')).toBe('spicevacations');
    expect(u.searchParams.get('utm_campaign')).toBe('resort-hotel-wailea');
  });

  it('applies per-item overrides from the registry', () => {
    const u = new URL(buildOutboundUrl({ ...resort, slug: 'jade-mountain', query: 'ignored' })!);
    expect(u.searchParams.get('ss')).toBe('Jade Mountain Saint Lucia');
  });
});
