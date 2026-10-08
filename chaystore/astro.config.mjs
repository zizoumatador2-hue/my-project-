import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import { readFileSync, readdirSync } from 'node:fs';

// lastmod from each article's modifiedDate; other pages use the newest article date
const dir = new URL('./src/content/articles/', import.meta.url);
const mods = {};
for (const f of readdirSync(dir)) {
  const m = readFileSync(new URL(f, dir), 'utf8').match(/^modifiedDate:\s*(\S+)/m);
  if (m) mods[f.replace(/\.md$/, '')] = new Date(m[1]).toISOString();
}
const newest = Object.values(mods).sort().pop();

// Static site, no prefetch (SEO/perf), all CSS inlined so nothing blocks rendering.
export default defineConfig({
  site: 'https://chaystore.com',
  trailingSlash: 'always',
  prefetch: false,
  compressHTML: true,
  build: { inlineStylesheets: 'always', format: 'directory' },
  integrations: [react(), sitemap({
    serialize(item) {
      const slug = item.url.match(/\/guides\/([^/]+)\/$/)?.[1];
      item.lastmod = (slug && mods[slug]) || newest;
      return item;
    },
  })],
});
