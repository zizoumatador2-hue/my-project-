// Build-time integrity checks: internal links/anchors, single H1, heading order, title/description length, canonical.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') && files.push(p); } })(DIST);

const urlToFile = (u) => {
  const clean = u.split('#')[0].split('?')[0];
  const cands = [join(DIST, clean), join(DIST, clean, 'index.html'), join(DIST, clean.replace(/\/$/, '') + '.html')];
  return cands.find((c) => existsSync(c) && statSync(c).isFile());
};
const ids = new Map();
const idsOf = (f) => { if (!ids.has(f)) { const h = readFileSync(f, 'utf8'); ids.set(f, new Set([...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))); } return ids.get(f); };

let errors = 0;
const err = (f, m) => { errors++; console.error(`✗ ${f.replace(DIST, '')}: ${m}`); };

for (const f of files) {
  if (f.endsWith('404.html')) continue;
  const html = readFileSync(f, 'utf8');
  const rel = f.replace(DIST, '');
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) err(f, `expected 1 <h1>, found ${h1}`);
  let last = 0;
  for (const m of html.matchAll(/<h([1-6])[\s>]/g)) { const l = +m[1]; if (last && l > last + 1) err(f, `heading skip h${last} → h${l}`); last = l; }
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  if (!title) err(f, 'missing <title>'); else if (title.length > 65) err(f, `title too long (${title.length}): ${title}`);
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  if (!desc) err(f, 'missing meta description'); else if (desc.length > 165) err(f, `description too long (${desc.length})`);
  if (!/<link rel="canonical"/.test(html)) err(f, 'missing canonical');
  for (const m of html.matchAll(/<a\s[^>]*href="([^"]+)"/g)) {
    const href = m[1];
    if (/^(https?:|mailto:|tel:|#?$)/.test(href)) continue;
    if (href.startsWith('#')) { if (!idsOf(f).has(href.slice(1))) err(f, `missing anchor ${href}`); continue; }
    const target = urlToFile(href);
    if (!target) { err(f, `broken link ${href}`); continue; }
    const hash = href.split('#')[1];
    if (hash && !idsOf(target).has(hash)) err(f, `missing anchor ${href}`);
  }
}
console.log(`${files.length} pages checked, ${errors} problem(s).`);
process.exit(errors ? 1 : 0);
