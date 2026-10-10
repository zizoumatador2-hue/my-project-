import { describe, it, expect } from 'vitest';
import { BASE } from './http';

/**
 * Crawls public pages from the homepage and audits on-page SEO + accessibility rules:
 * status codes, one <h1>, no skipped heading levels, unique titles, meta description ≤ 160,
 * absolute canonical, valid JSON-LD, labelled <aside>, alt text on images, no broken internal links,
 * title length, self-referencing canonicals, social image, and no links into empty (noindex) landing combinations.
 */
const SKIP = /^\/(api|media|admin|dashboard|account|logout|login|signup|forgot-password|reset-password)(\/|$|\?)/;

interface PageInfo { path: string; status: number; title: string; description: string; canonical: string; robots: string; html: string; }

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\s${name}=("([^"]*)"|'([^']*)')`, 'i'));
  if (m) return m[2] ?? m[3] ?? '';
  // A bare attribute (Astro renders alt="" as `alt`) is an empty value in HTML.
  return new RegExp(`\\s${name}(?=[\\s/>])`, 'i').test(tag) ? '' : null;
}
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

async function crawl(limit = 220): Promise<Map<string, PageInfo>> {
  const seen = new Map<string, PageInfo>();
  const queue = ['/'];
  while (queue.length && seen.size < limit) {
    const path = queue.shift()!;
    if (seen.has(path)) continue;
    const res = await fetch(BASE + path, { redirect: 'manual' });
    const html = res.headers.get('content-type')?.includes('text/html') ? await res.text() : '';
    const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '');
    const metaTag = (name: string) => html.match(new RegExp(`<meta[^>]+name="${name}"[^>]*>`))?.[0] ?? '';
    const info: PageInfo = {
      path, status: res.status, title, html,
      description: decode(attr(metaTag('description'), 'content') ?? ''),
      robots: attr(metaTag('robots'), 'content') ?? '',
      canonical: attr(html.match(/<link[^>]+rel="canonical"[^>]*>/)?.[0] ?? '', 'href') ?? '',
    };
    seen.set(path, info);
    for (const m of html.matchAll(/<a\s[^>]*href="([^"#]*)(#[^"]*)?"/g)) {
      let href = decode(m[1]);
      if (!href.startsWith('/') || href.startsWith('//') || SKIP.test(href)) continue;
      href = href.replace(/\/+$/, '') || '/';
      if (/[?&](sort|page)=/.test(href) && seen.size > 60) continue; // keep the crawl bounded
      if (!seen.has(href) && !queue.includes(href)) queue.push(href);
    }
  }
  return seen;
}

describe('SEO & accessibility audit (crawl)', () => {
  it('passes on-page checks for every crawled page', async () => {
    const pages = await crawl();
    expect(pages.size).toBeGreaterThan(40);
    const problems: string[] = [];
    const titles = new Map<string, string>();
    for (const p of pages.values()) {
      if (p.status !== 200) { problems.push(`${p.path}: HTTP ${p.status}`); continue; }
      if (!p.html) continue;
      const h1s = p.html.match(/<h1[\s>]/g)?.length ?? 0;
      if (h1s !== 1) problems.push(`${p.path}: ${h1s} <h1> elements`);
      let prev = 0;
      for (const m of p.html.matchAll(/<h([1-6])[\s>]/g)) {
        const lvl = Number(m[1]);
        if (prev && lvl > prev + 1) { problems.push(`${p.path}: heading jumps h${prev} → h${lvl}`); break; }
        prev = lvl;
      }
      if (!p.title) problems.push(`${p.path}: missing <title>`);
      if (!p.description) problems.push(`${p.path}: missing meta description`);
      if (p.description.length > 160) problems.push(`${p.path}: meta description ${p.description.length} chars`);
      if (!/^https?:\/\//.test(p.canonical)) problems.push(`${p.path}: canonical missing or relative`);
      if (!p.robots.includes('noindex')) {
        const other = titles.get(p.title);
        if (other) problems.push(`${p.path}: duplicate title with ${other}`);
        titles.set(p.title, p.path);
      }
      for (const m of p.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
        try { JSON.parse(m[1]); } catch { problems.push(`${p.path}: invalid JSON-LD`); }
      }
      for (const m of p.html.matchAll(/<aside[^>]*>/g)) {
        if (/role="complementary"/.test(m[0])) problems.push(`${p.path}: aside has role=complementary`);
        if (!/aria-label(ledby)?=/.test(m[0])) problems.push(`${p.path}: aside without aria-label`);
      }
      for (const m of p.html.matchAll(/<img\s[^>]*>/g)) if (attr(m[0], 'alt') === null) problems.push(`${p.path}: <img> without alt`);
      if (!/<html lang="en-US"/.test(p.html)) problems.push(`${p.path}: missing lang`);
      if (!p.robots.includes('noindex')) {
        // Indexable pages: search-result-friendly title, a real description, self canonical, social image.
        if (p.title.length > 65) problems.push(`${p.path}: title ${p.title.length} chars (max 65)`);
        if (p.description.length < 50) problems.push(`${p.path}: meta description only ${p.description.length} chars`);
        const canonicalPath = p.canonical ? new URL(p.canonical).pathname + new URL(p.canonical).search : '';
        const selfPath = p.path.replace(/\?(?!page=\d+$).*$/, '');
        if (canonicalPath !== selfPath) problems.push(`${p.path}: canonical points to ${canonicalPath}`);
        if (!/<meta property="og:image" content="https?:\/\//.test(p.html)) problems.push(`${p.path}: missing absolute og:image`);
      }
      if (/"image":\[\]/.test(p.html)) problems.push(`${p.path}: JSON-LD has an empty image list`);
    }
    // Crawl budget: no page should link into empty two-level landing combinations (city×body, make×model).
    for (const p of pages.values()) {
      for (const m of p.html.matchAll(/<a\s[^>]*href="(\/used-cars\/[a-z0-9-]+\/[a-z0-9-]+)"/g)) {
        const target = pages.get(m[1]);
        if (target?.robots.includes('noindex')) problems.push(`${p.path}: links to noindex landing page ${m[1]}`);
      }
    }
    expect(problems, problems.join('\n')).toEqual([]);
  }, 240_000);

  it('serves robots.txt and a sitemap index whose URLs all resolve', async () => {
    const robots = await (await fetch(`${BASE}/robots.txt`)).text();
    expect(robots).toMatch(/User-agent: \*/);
    const index = await (await fetch(`${BASE}/sitemap.xml`)).text();
    const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
    expect(maps).toEqual(['/sitemap-pages.xml', '/sitemap-vehicles.xml', '/sitemap-dealers.xml', '/sitemap-blog.xml']);
    const bad: string[] = [];
    for (const map of maps) {
      const xml = await (await fetch(BASE + map)).text();
      for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
        const path = new URL(m[1].replace(/&amp;/g, '&')).pathname;
        const r = await fetch(BASE + path, { redirect: 'manual' });
        if (r.status !== 200) bad.push(`${path} → ${r.status}`);
        else if (/noindex/.test((await r.text()).match(/<meta name="robots"[^>]*>/)?.[0] ?? '')) bad.push(`${path} is noindex but in sitemap`);
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  }, 240_000);

  it('returns 404 for unknown pages and sets security headers', async () => {
    const r = await fetch(`${BASE}/used-cars/not-a-real-page`);
    expect(r.status).toBe(404);
    const home = await fetch(`${BASE}/`);
    expect(home.headers.get('x-content-type-options')).toBe('nosniff');
    expect(home.headers.get('x-frame-options')).toBe('DENY');
    const dash = await fetch(`${BASE}/login`);
    expect(dash.headers.get('x-robots-tag')).toContain('noindex');
  });

  it('error pages are 404, noindex and have no canonical; out-of-range pagination is a 404', async () => {
    for (const path of ['/vehicles/not-a-real-vehicle', '/blog/not-a-real-post', '/blog?page=999', '/blog/category/financing?page=99', '/used-cars/birmingham-al?page=999', '/dealers?page=999']) {
      const r = await fetch(BASE + path, { redirect: 'manual' });
      expect(r.status, path).toBe(404);
      const html = await r.text();
      expect(html, path).toMatch(/<meta name="robots" content="noindex/);
      expect(html, path).not.toMatch(/rel="canonical"/);
    }
  });

  it('normalizes URLs with one 301 hop (case, trailing slash) and keeps tracking parameters out of canonicals', async () => {
    const upper = await fetch(`${BASE}/Used-Cars/Birmingham-AL`, { redirect: 'manual' });
    expect(upper.status).toBe(301);
    expect(new URL(upper.headers.get('location')!, BASE).pathname).toBe('/used-cars/birmingham-al');
    const slash = await fetch(`${BASE}/used-cars/`, { redirect: 'manual' });
    expect(slash.status).toBe(301);
    expect(new URL(slash.headers.get('location')!, BASE).pathname).toBe('/used-cars');
    const tracked = await (await fetch(`${BASE}/used-cars/birmingham-al?utm_source=newsletter`)).text();
    expect(tracked.match(/<link rel="canonical" href="([^"]+)"/)?.[1]).toMatch(/\/used-cars\/birmingham-al$/);
  });

  it('keeps private and machine routes out of the index', async () => {
    const robots = await (await fetch(`${BASE}/robots.txt`)).text();
    // Production lists each private prefix; every other environment disallows everything.
    if (!/^Disallow: \/$/m.test(robots)) for (const p of ['/admin', '/dashboard', '/account', '/api/', '/login', '/signup']) expect(robots, p).toContain(`Disallow: ${p}`);
    for (const p of ['/admin', '/dashboard', '/account']) {
      const r = await fetch(BASE + p, { redirect: 'manual' });
      expect([302, 403], p).toContain(r.status);
    }
    const api = await fetch(`${BASE}/api/models?make=toyota`);
    expect(api.headers.get('x-robots-tag')).toContain('noindex');
    const index = await (await fetch(`${BASE}/sitemap.xml`)).text();
    expect(index).not.toMatch(/<lastmod>/); // child sitemaps carry real dates; the index must not invent one
  });
});
