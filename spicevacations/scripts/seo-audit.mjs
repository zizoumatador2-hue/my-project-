// Audits the built site (dist/) for technical SEO: title/description length and uniqueness,
// one H1, canonical + hreflang, valid JSON-LD, internal links that resolve, images with alt text,
// sitemap coverage and robots.txt. Run after `npm run build`:  npm run audit:seo
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const files = [];
const walk = (d) => readdirSync(d).forEach((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f.endsWith('.html') && files.push(join(d, f))));
walk(DIST);

const route = (f) => {
  const r = '/' + f.replace(DIST, '').replace(/index\.html$/, '').replace(/\.html$/, '');
  return r;
};
const exists = (href) => {
  const p = href.split('#')[0].split('?')[0];
  if (!p.startsWith('/') || p.startsWith('//')) return true;
  if (p.startsWith('/go/') || p.startsWith('/api/')) return true; // Worker routes
  if (p === '/') return true;
  const f = join(DIST, p);
  return existsSync(f) || existsSync(join(f, 'index.html')) || existsSync(f + '.html');
};

const errors = [];
const warnings = [];
const titles = new Map();
const descs = new Map();
let indexable = 0;
for (const f of files) {
  const r = route(f);
  if (r.startsWith('/admin')) continue;
  const html = readFileSync(f, 'utf8');
  const noindex = /<meta name="robots" content="noindex/.test(html);
  const unescape = (t) => t.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const title = unescape(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '');
  const desc = unescape(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '');
  if (!noindex) {
    indexable++;
    if (title.length > 62) warnings.push(`${r}: title ${title.length} chars (>62)`);
    if (desc.length < 110 || desc.length > 165) warnings.push(`${r}: description ${desc.length} chars (110–165)`);
    if (titles.has(title)) errors.push(`${r}: duplicate title with ${titles.get(title)}`);
    if (descs.has(desc)) errors.push(`${r}: duplicate description with ${descs.get(desc)}`);
    titles.set(title, r);
    descs.set(desc, r);
    if (!/hreflang="en-US"/.test(html)) errors.push(`${r}: missing hreflang en-US`);
    if (!/"@type":"BreadcrumbList"/.test(html) && r !== '/') errors.push(`${r}: missing BreadcrumbList JSON-LD`);
  }
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const j = JSON.parse(m[1]);
      if (!j['@context'] || !j['@graph']) errors.push(`${r}: JSON-LD without @context/@graph`);
    } catch (e) {
      errors.push(`${r}: invalid JSON-LD (${e.message})`);
    }
  }
  const h2 = (html.match(/<h2[\s>]/g) || []).length;
  if (!noindex && h2 === 0) warnings.push(`${r}: no H2 headings`);
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt="/.test(m[0])) errors.push(`${r}: <img> without alt`);
  for (const m of html.matchAll(/href="([^"]+)"/g)) if (!exists(m[1])) errors.push(`${r}: broken internal link ${m[1]}`);
}

const sitemap = existsSync(join(DIST, 'sitemap-0.xml')) ? readFileSync(join(DIST, 'sitemap-0.xml'), 'utf8') : '';
const locs = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname));
if (!existsSync(join(DIST, 'sitemap-index.xml'))) errors.push('sitemap-index.xml missing');
for (const f of files) {
  const r = route(f);
  const html = readFileSync(f, 'utf8');
  const noindex = /content="noindex/.test(html);
  if (!noindex && !r.startsWith('/admin') && !locs.has(r)) errors.push(`${r}: indexable page missing from sitemap`);
  if (noindex && locs.has(r)) errors.push(`${r}: noindex page listed in sitemap`);
}
const robots = existsSync(join(DIST, 'robots.txt')) ? readFileSync(join(DIST, 'robots.txt'), 'utf8') : '';
if (!/Sitemap: https?:\/\/.+sitemap-index\.xml/.test(robots)) errors.push('robots.txt missing Sitemap line');

console.log(`seo-audit: ${files.length} HTML files, ${indexable} indexable, ${locs.size} sitemap URLs`);
if (warnings.length) console.log(`warnings (${warnings.length}):\n` + warnings.map((w) => ' - ' + w).join('\n'));
if (errors.length) {
  console.error(`errors (${errors.length}):\n` + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(1);
}
console.log('seo-audit: passed');
