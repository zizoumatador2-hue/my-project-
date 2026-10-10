import { describe, it, expect } from 'vitest';
import { parseFilters, buildSearchQuery, filtersToQuery } from '../../src/lib/search';
import { slugify, vehicleSlugBase } from '../../src/lib/slug';
import { hashPassword, verifyPassword, hmacSha256Hex } from '../../src/lib/crypto';
import { verifyStripeSignature } from '../../src/lib/stripe';
import { renderMarkdown, faqFromText, faqToText, parseFaq } from '../../src/lib/markdown';
import { sniffImage, cleanText, escapeHtml } from '../../src/lib/security';
import { safeNext } from '../../src/lib/auth';
import { monthlyPayment, formatPrice, truncate } from '../../src/lib/format';
import { leadSchema, vehicleSchema } from '../../src/lib/validation';
import { planOf, PLANS } from '../../src/lib/plans';

describe('search filters', () => {
  it('whitelists and normalizes query params', () => {
    const f = parseFilters(new URLSearchParams('make=toyota&model=Camry!&min_price=$5,000&body=suv&fuel=rocket&zip=3520&radius=37&page=-4&sort=hax&q=<b>camry</b>'));
    expect(f.make).toBe('toyota');
    expect(f.model).toBeUndefined();
    expect(f.minPrice).toBe(5000);
    expect(f.body).toBe('SUV');
    expect(f.fuel).toBeUndefined();
    expect(f.zip).toBeUndefined();
    expect(f.radius).toBe(50);
    expect(f.page).toBe(1);
    expect(f.sort).toBe('recommended');
    expect(f.q).toBe('b camry b');
  });

  it('builds parameterized SQL with no user input in the SQL text', () => {
    const f = parseFilters(new URLSearchParams("make=ford&q=f-150' OR 1=1&max_price=30000"));
    const q = buildSearchQuery(f, null, '2026-01-01T00:00:00Z');
    expect(q.listSql).not.toContain("OR 1=1");
    expect(q.params).toContain('ford');
    expect(q.params).toContain(3_000_000);
    expect(q.countSql.match(/\?/g)!.length).toBe(q.params.length);
    expect(q.listSql.match(/\?/g)!.length).toBe(q.listParams.length);
  });

  it('adds radius filtering and distance sort with matching params', () => {
    const f = parseFilters(new URLSearchParams('zip=35203&radius=25&sort=distance'));
    const q = buildSearchQuery(f, { lat: 33.52, lng: -86.8, label: 'x' }, '2026-01-01T00:00:00Z');
    expect(q.listSql).toContain('AS dist2');
    expect(q.listSql).toContain('ORDER BY (((v.lat');
    expect(q.listSql.match(/\?/g)!.length).toBe(q.listParams.length);
    expect(q.params).toContain(625);
  });

  it('round-trips filters to a clean query string', () => {
    expect(filtersToQuery({ make: 'honda', sort: 'recommended', page: 1 })).toBe('?make=honda');
    expect(filtersToQuery({ make: 'honda', page: 3 })).toBe('?make=honda&page=3');
  });
});

describe('slugs', () => {
  it('creates SEO-friendly vehicle slugs', () => {
    expect(vehicleSlugBase({ year: 2023, make: 'Toyota', model: 'Camry', trim: 'SE', city: 'Birmingham' })).toBe('2023-toyota-camry-se-birmingham-al');
    expect(slugify('Mercedes-Benz GLE 350 & More!')).toBe('mercedes-benz-gle-350-and-more');
  });
});

describe('crypto', () => {
  it('hashes and verifies passwords', async () => {
    const h = await hashPassword('correct horse battery');
    expect(h.startsWith('pbkdf2$100000$')).toBe(true);
    expect(await verifyPassword('correct horse battery', h)).toBe(true);
    expect(await verifyPassword('wrong', h)).toBe(false);
    expect(await verifyPassword('x', '!disabled')).toBe(false);
  });

  it('verifies Stripe webhook signatures', async () => {
    const payload = '{"id":"evt_1"}';
    const t = 1_800_000_000;
    const sig = await hmacSha256Hex('whsec_test', `${t}.${payload}`);
    expect(await verifyStripeSignature(payload, `t=${t},v1=${sig}`, 'whsec_test', t)).toBe(true);
    expect(await verifyStripeSignature(payload, `t=${t},v1=${sig}`, 'whsec_other', t)).toBe(false);
    expect(await verifyStripeSignature(payload, `t=${t},v1=${sig}`, 'whsec_test', t + 1000)).toBe(false);
    expect(await verifyStripeSignature(payload, null, 'whsec_test', t)).toBe(false);
  });
});

describe('markdown', () => {
  it('escapes raw HTML, demotes H1 and builds a TOC', () => {
    const { html, toc } = renderMarkdown('# Title\n\n## First part\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1)) [ok](https://example.com)');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<h1');
    expect(html).toContain('<h2 id="first-part">');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('rel="noopener" target="_blank"');
    expect(toc.map((t) => t.id)).toContain('first-part');
  });

  it('parses the admin FAQ text format', () => {
    const faq = faqFromText('Q: One?\nA: Yes.\n\nQ: Two?\nA: Line one\nline two');
    expect(faq).toEqual([{ q: 'One?', a: 'Yes.' }, { q: 'Two?', a: 'Line one line two' }]);
    expect(parseFaq(JSON.stringify(faq))).toEqual(faq);
    expect(faqFromText(faqToText(faq))).toEqual(faq);
    expect(parseFaq('not json')).toEqual([]);
  });
});

describe('security helpers', () => {
  it('sniffs images by magic bytes', () => {
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))?.type).toBe('image/jpeg');
    expect(sniffImage(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull();
  });
  it('blocks open redirects', () => {
    expect(safeNext('/dashboard')).toBe('/dashboard');
    expect(safeNext('//evil.com')).toBe('/');
    expect(safeNext('https://evil.com')).toBe('/');
    expect(safeNext('/\\evil.com')).toBe('/');
  });
  it('cleans and escapes text', () => {
    expect(cleanText('  hi\u0000 there ')).toBe('hi there');
    expect(escapeHtml('<a href="x">')).toBe('&lt;a href=&quot;x&quot;&gt;');
  });
});

describe('validation', () => {
  it('requires consent on leads', () => {
    expect(leadSchema.safeParse({ type: 'contact', name: 'Al', email: 'a@b.co' }).success).toBe(false);
    expect(leadSchema.safeParse({ type: 'contact', name: 'Al', email: 'a@b.co', consent: 'on' }).success).toBe(true);
  });
  it('validates VINs and normalizes prices', () => {
    const base = { year: '2020', make_id: '1', model_id: '1', price: '$21,995', mileage: '40,000', body_type: 'Sedan', fuel_type: 'Gasoline', transmission: 'Automatic', drivetrain: 'FWD', condition: 'used', status: 'active' };
    const ok = vehicleSchema.safeParse({ ...base, vin: '1hgcm82633a004352' });
    expect(ok.success && ok.data.price).toBe(21995);
    expect(ok.success && ok.data.vin).toBe('1HGCM82633A004352');
    expect(vehicleSchema.safeParse({ ...base, vin: 'IOQ123' }).success).toBe(false);
  });
});

describe('formatting & plans', () => {
  it('computes loan payments', () => {
    expect(Math.round(monthlyPayment(20000, 6, 60))).toBe(387);
    expect(monthlyPayment(12000, 0, 12)).toBe(1000);
  });
  it('formats and truncates', () => {
    expect(formatPrice(2199500)).toBe('$21,995');
    expect(truncate('The quick brown fox jumps', 15)).toBe('The quick…');
  });
  it('has the documented plan prices', () => {
    expect(PLANS.basic.priceCents).toBe(4900);
    expect(PLANS.pro.priceCents).toBe(9900);
    expect(planOf('nope').id).toBe('free');
  });
});

describe('seed bootstrap', () => {
  it('splits SQL on statement boundaries, respecting quotes and comments', async () => {
    const { splitStatements } = await import('../../src/lib/bootstrap');
    const sql = "-- header\nINSERT INTO a VALUES ('x; y', 'it''s');\nINSERT INTO b VALUES (1);\n";
    expect(splitStatements(sql)).toEqual(["INSERT INTO a VALUES ('x; y', 'it''s');", 'INSERT INTO b VALUES (1);']);
  });
});

describe('resolveLandingLinks', () => {
  it('keeps links to indexable combinations and sends empty ones to the nearest indexable parent', async () => {
    const { resolveLandingLinks } = await import('../../src/lib/sitemap');
    const indexable = new Set(['/used-cars/huntsville-al', '/used-cars/birmingham-al/suvs']);
    const html = '<a href="/used-cars/birmingham-al/suvs">a</a> <a href="/used-cars/huntsville-al/trucks">b</a> <a href="/used-cars/ford/f-150">c</a> <a href="/used-cars/ford">d</a>';
    expect(resolveLandingLinks(html, indexable)).toBe(
      '<a href="/used-cars/birmingham-al/suvs">a</a> <a href="/used-cars/huntsville-al">b</a> <a href="/used-cars">c</a> <a href="/used-cars/ford">d</a>',
    );
  });
});
