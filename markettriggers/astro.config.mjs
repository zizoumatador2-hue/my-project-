import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdirSync } from 'node:fs';

// The /articles/ index is kept out of the sitemap (and noindexed) until at least one article is published.
const hasArticles = readdirSync(new URL('./src/content/articles/', import.meta.url)).some(
  (f) => f.endsWith('.md') && !f.startsWith('_')
);

export default defineConfig({
  site: 'https://markettriggers.com',
  trailingSlash: 'always',
  prefetch: false,
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404') && (hasArticles || !page.endsWith('/articles/')),
      serialize(item) {
        item.lastmod = new Date().toISOString();
        item.changefreq = item.url === 'https://markettriggers.com/' ? 'weekly' : 'monthly';
        item.priority = item.url === 'https://markettriggers.com/' ? 1.0 : 0.7;
        return item;
      },
    }),
  ],
  build: {
    inlineStylesheets: 'never',
  },
  compressHTML: true,
});
