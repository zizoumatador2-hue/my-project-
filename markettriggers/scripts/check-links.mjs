// Validates the built site in dist/: internal page links, #anchors, and local image/asset references.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const pages = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.html')) pages.push(p);
  }
})(DIST);

const idCache = new Map();
const idsOf = (file) => {
  if (!idCache.has(file)) {
    const html = readFileSync(file, 'utf8');
    idCache.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idCache.get(file);
};
const resolvePage = (path) => {
  const p = join(DIST, decodeURIComponent(path));
  if (existsSync(p) && statSync(p).isFile()) return p;
  const idx = join(p, 'index.html');
  if (existsSync(idx)) return idx;
  if (existsSync(p + '.html')) return p + '.html';
  return null;
};

let errors = 0;
const fail = (page, msg) => { errors++; console.log(`::error::${page.replace(DIST, '')}: ${msg}`); };

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const self = page;
  for (const [, href] of html.matchAll(/\shref="([^"]+)"/g)) {
    if (/^(https?:|mailto:|tel:|data:)/.test(href)) continue;
    const [pathPart, frag] = href.split('#');
    const path = pathPart.split('?')[0];
    const target = path === '' ? self : resolvePage(path);
    if (!target) { fail(page, `broken link ${href}`); continue; }
    if (frag && target.endsWith('.html') && !idsOf(target).has(decodeURIComponent(frag))) fail(page, `missing anchor ${href}`);
  }
  const srcs = [...html.matchAll(/\ssrc="(\/[^"]+)"/g)].map((m) => m[1]);
  const sets = [...html.matchAll(/\s(?:srcset|imagesrcset)="([^"]+)"/g)].flatMap((m) => m[1].split(',').map((s) => s.trim().split(/\s+/)[0]));
  for (const s of [...srcs, ...sets]) {
    if (!s.startsWith('/') || s.startsWith('//')) continue;
    if (!resolvePage(s.split('?')[0])) fail(page, `missing asset ${s}`);
  }
}
console.log(`checked ${pages.length} pages, ${errors} problem(s)`);
process.exit(errors ? 1 : 0);
