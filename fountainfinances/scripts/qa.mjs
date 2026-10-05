// Site-wide quality gate for the built site in ./dist.
//   node scripts/qa.mjs              → SEO, links, headings, schema, content checks
//   node scripts/qa.mjs --external   → also verifies every outbound link responds
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = 'dist';
const SITE = 'https://fountainfinances.com';
const errors = [];
const warnings = [];
const err = (page, msg) => errors.push(`${page}: ${msg}`);
const warn = (page, msg) => warnings.push(`${page}: ${msg}`);

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk(DIST);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const pathOf = (f) => '/' + relative(DIST, f).replace(/index\.html$/, '').replace(/\\/g, '/');
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const text = (html) =>
  decode(
    html
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ');

const pages = new Map();
for (const f of htmlFiles) {
  const html = readFileSync(f, 'utf8');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  pages.set(pathOf(f), { file: f, html, ids });
}

const titles = new Map();
const descs = new Map();
const externals = new Set();
const BANNED = [/lorem ipsum/i, /coming soon/i, /\bTODO\b/, /\bTBD\b/, /as an ai\b/i, /ai[- ]generated/i, /language model/i, /chatgpt/i, /\bclaude\b/i, /\bopenai\b/i, /\bplaceholder\b/i, /undefined|NaN|\[object Object\]/];

for (const [path, { html }] of pages) {
  const noindex = /<meta name="robots" content="noindex/.test(html);
  const is404 = path === '/404.html';

  // <title>
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  if (!title) err(path, 'missing <title>');
  else {
    if (decode(title).length > 70) warn(path, `title is ${decode(title).length} chars`);
    if (!noindex) titles.set(title, [...(titles.get(title) || []), path]);
  }

  // meta description
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if (!desc) err(path, 'missing meta description');
  else {
    const len = decode(desc).length;
    if (len > 160) err(path, `meta description ${len} chars (> 160)`);
    if (len < 70) warn(path, `meta description only ${len} chars`);
    if (!noindex) descs.set(desc, [...(descs.get(desc) || []), path]);
  }

  // canonical
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (!canonical) err(path, 'missing canonical');
  else if (!is404 && canonical !== SITE + path) err(path, `canonical ${canonical} ≠ ${SITE + path}`);

  // social tags
  for (const tag of ['og:title', 'og:description', 'og:image', 'og:url']) if (!html.includes(`property="${tag}"`)) err(path, `missing ${tag}`);
  if (!html.includes('name="twitter:card"')) err(path, 'missing twitter:card');
  if (!html.includes('<html lang="en-US"')) err(path, 'missing lang');

  // headings
  const headings = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  const h1s = headings.filter((h) => h === 1).length;
  if (h1s !== 1) err(path, `${h1s} <h1> elements`);
  for (let i = 1; i < headings.length; i++) {
    if (headings[i] > headings[i - 1] + 1) {
      err(path, `heading level skips from h${headings[i - 1]} to h${headings[i]}`);
      break;
    }
  }
  if (headings[0] !== 1) err(path, `first heading is h${headings[0]}`);

  // structured data
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(m[1]);
      const types = (data['@graph'] || [data]).map((n) => n['@type']);
      if (!types.includes('Organization')) err(path, 'JSON-LD without Organization');
      if (path.startsWith('/guides/') && path !== '/guides/' && !types.includes('Article')) err(path, 'guide without Article schema');
      for (const n of data['@graph'] || []) {
        if (n['@type'] === 'FAQPage' && !(n.mainEntity || []).length) err(path, 'empty FAQPage');
      }
    } catch (e) {
      err(path, `invalid JSON-LD: ${e.message}`);
    }
  }

  // images
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\salt(="|[\s/>])/.test(m[0])) err(path, 'img without alt');

  // navs must be labeled
  for (const m of html.matchAll(/<nav\b[^>]*>/g)) if (!/aria-label=/.test(m[0])) err(path, 'nav without aria-label');

  // form controls must have labels
  for (const m of html.matchAll(/<(input|select|textarea)\b[^>]*>/g)) {
    const tag = m[0];
    if (/type="(hidden|submit|checkbox|radio)"/.test(tag) || /tabindex="-1"/.test(tag)) continue;
    const id = tag.match(/\sid="([^"]+)"/)?.[1];
    if (!id || !html.includes(`for="${id}"`)) err(path, `form control without <label>: ${tag.slice(0, 60)}`);
  }

  // content hygiene
  const body = text(html.replace(/<head>[\s\S]*?<\/head>/, ''));
  for (const re of BANNED) if (re.test(body)) err(path, `banned text ${re}`);

  // links
  for (const m of html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/g)) {
    const href = decode(m[1]);
    const tag = m[0];
    if (/^(mailto:|tel:)/.test(href)) continue;
    if (/^https?:\/\//.test(href)) {
      if (href.startsWith(SITE)) err(path, `absolute internal link ${href}`);
      else {
        externals.add(href);
        if (/target="_blank"/.test(tag) && !/rel="[^"]*noopener/.test(tag)) err(path, `target=_blank without noopener: ${href}`);
      }
      continue;
    }
    if (href.startsWith('#')) {
      if (href.length > 1 && !pages.get(path).ids.has(href.slice(1))) err(path, `broken anchor ${href}`);
      continue;
    }
    const url = new URL(href, SITE + path);
    const p = url.pathname;
    let target = pages.get(p);
    if (!target) {
      const file = join(DIST, p);
      if (existsSync(file) && statSync(file).isFile()) continue;
      err(path, `broken internal link ${href}`);
      continue;
    }
    if (!p.endsWith('/') && !p.includes('.')) err(path, `link without trailing slash ${href}`);
    if (url.hash && !target.ids.has(decodeURIComponent(url.hash.slice(1)))) err(path, `broken anchor ${href}`);
  }
}

for (const [t, list] of titles) if (list.length > 1) err(list.join(', '), `duplicate title "${t}"`);
for (const [d, list] of descs) if (list.length > 1) err(list.join(', '), `duplicate description "${d.slice(0, 50)}…"`);

// Word counts (thin-content guard)
const words = (p) => text(pages.get(p).html.match(/<main[\s\S]*<\/main>/)?.[0] || '').split(' ').filter(Boolean).length;
const home = words('/');
if (home < 8000) err('/', `homepage has ${home} words (< 8000)`);
for (const p of pages.keys()) {
  if (/^\/guides\/[^/]+\/$/.test(p)) {
    const w = words(p);
    if (w < 1500) err(p, `guide has ${w} words (< 1500)`);
  }
  if (/^\/(calculators|best)\/[^/]+\/$/.test(p) && words(p) < 500) err(p, `only ${words(p)} words`);
}

// Sitemap: every indexable page listed; nothing noindex listed
const sm = readdirSync(DIST).filter((f) => /^sitemap-\d+\.xml$/.test(f)).map((f) => readFileSync(join(DIST, f), 'utf8')).join('');
const inSitemap = new Set([...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(SITE, '')));
for (const [p, { html }] of pages) {
  if (p === '/404.html') continue;
  const noindex = /<meta name="robots" content="noindex/.test(html);
  if (!noindex && !inSitemap.has(p)) err(p, 'indexable page missing from sitemap');
  if (noindex && inSitemap.has(p)) err(p, 'noindex page listed in sitemap');
}
if (!/<lastmod>/.test(sm)) err('sitemap', 'no lastmod values');
const robots = readFileSync(join(DIST, 'robots.txt'), 'utf8');
if (!robots.includes('Sitemap: https://fountainfinances.com/sitemap-index.xml')) err('robots.txt', 'missing sitemap');
if (/Disallow: \/(\s|$)/.test(robots)) err('robots.txt', 'blocks the whole site');

// Optional: external link check
if (process.argv.includes('--external')) {
  // Pexels photo pages block automated requests; they are credits, not sources.
  const list = [...externals].filter((u) => !u.startsWith('https://www.pexels.com/'));
  console.log(`Checking ${list.length} external links…`);
  await Promise.all(
    list.map(async (u) => {
      try {
        let res = await fetch(u, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'Mozilla/5.0 (FountainFinances link check)' } });
        if (res.status >= 400) res = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'Mozilla/5.0 (FountainFinances link check)' } });
        if (res.status === 403 || res.status === 429) warn('external', `${res.status} (blocks automated checks) ${u}`);
        else if (res.status >= 400) err('external', `${res.status} ${u}`);
      } catch (e) {
        err('external', `${e.name} ${u}`);
      }
    }),
  );
}

console.log(`QA: ${pages.size} pages, ${externals.size} unique external links, homepage ${home} words`);
for (const w of warnings) console.log(`  warn  ${w}`);
for (const e of errors) console.log(`  ERROR ${e}`);
if (errors.length) {
  console.log(`\n${errors.length} error(s)`);
  process.exit(1);
}
console.log('QA passed');
