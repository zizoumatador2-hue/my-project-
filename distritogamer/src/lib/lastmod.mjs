import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'src/content/articles');
const articles = new Map();
if (existsSync(dir)) {
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    const raw = readFileSync(join(dir, f), 'utf8');
    const fm = raw.split('---')[1] || '';
    const get = (k) => (fm.match(new RegExp(`^${k}:\\s*"?([^"\\n]+)"?`, 'm')) || [])[1];
    articles.set(f.replace(/\.md$/, ''), {
      category: get('category'),
      updated: get('updated') || get('published'),
    });
  }
}
const newest = [...articles.values()].map((a) => a.updated).sort().pop();

export function lastmodFor(url, site) {
  const path = url.replace(site, '').replace(/\/$/, '');
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return { priority: 1.0, changefreq: 'weekly', lastmod: newest };
  if (parts.length === 2) {
    const a = articles.get(parts[1]);
    if (a && a.category === parts[0]) return { priority: 0.8, changefreq: 'monthly', lastmod: a.updated };
  }
  if (parts.length === 1 && ['about','contact','privacy-policy','terms-of-use','affiliate-disclosure','editorial-policy'].includes(parts[0]))
    return { priority: 0.3, changefreq: 'yearly', lastmod: undefined };
  return { priority: 0.6, changefreq: 'weekly', lastmod: newest };
}
