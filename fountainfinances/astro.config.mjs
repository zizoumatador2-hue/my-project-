// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import rehypeLinks from './src/lib/rehype-links.mjs';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import react from '@astrojs/react';

const SITE = 'https://fountainfinances.com';

/** Read `updated:` dates from content front matter so the sitemap carries real lastmod values. */
function contentDates() {
  const map = new Map();
  const dirs = [
    ['src/content/guides', '/guides/'],
    ['src/content/topics', '/'],
    ['src/content/comparisons', '/best/'],
  ];
  for (const [dir, prefix] of dirs) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.md')) continue;
      const raw = readFileSync(join(dir, file), 'utf8');
      const m = raw.match(/^updated:\s*['"]?(\d{4}-\d{2}-\d{2})/m);
      if (m) map.set(`${prefix}${file.replace(/\.md$/, '')}/`, m[1]);
    }
  }
  return map;
}
const dates = contentDates();
const SITE_UPDATED = '2026-09-28';

/** @param {string} path */
function priorityFor(path) {
  if (path === '/') return 1.0;
  if (/^\/(personal-finance|credit|banking|loans|mortgage|insurance|calculators|guides|best)\/$/.test(path)) return 0.9;
  if (path.startsWith('/calculators/') || path.startsWith('/best/')) return 0.8;
  if (path.startsWith('/guides/')) return 0.8;
  if (/^\/(about|contact|privacy|terms|disclaimer|accessibility|corrections|affiliate-disclosure|editorial-standards|newsletter)/.test(path)) return 0.3;
  return 0.7;
}

export default defineConfig({
  site: SITE,
  trailingSlash: 'always',
  prefetch: false,
  build: { format: 'directory', inlineStylesheets: 'never' },
  compressHTML: true,
  markdown: { rehypePlugins: [rehypeLinks], smartypants: true },
  integrations: [sitemap({
    filter: (page) =>
      !/\/(search|newsletter\/(confirmed|unsubscribed|unsubscribe|error|check-email)|contact\/thanks|404)\/?$/.test(new URL(page).pathname),
    serialize(item) {
      const path = new URL(item.url).pathname;
      item.priority = priorityFor(path);
      item.lastmod = dates.get(path) ?? SITE_UPDATED;
      item.changefreq = /** @type {any} */ (path.startsWith('/guides/') || path.startsWith('/best/') ? 'monthly' : 'weekly');
      return item;
    },
  }), react()],
});