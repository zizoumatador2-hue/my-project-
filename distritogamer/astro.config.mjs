import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Sitemap lastmod values come from content dates (see src/lib/lastmod.mjs).
import { lastmodFor } from './src/lib/lastmod.mjs';
import rehypeExtras from './src/lib/rehype-extras.mjs';

const SITE = process.env.PUBLIC_SITE_URL || 'https://distritogamer.com';

export default defineConfig({
  site: SITE,
  trailingSlash: 'always',
  prefetch: false,
  compressHTML: true,
  build: { format: 'directory', inlineStylesheets: 'never' },
  vite: { build: { assetsInlineLimit: 0 } },
  markdown: { rehypePlugins: [[rehypeExtras, { host: SITE }]] },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/search/') && !page.endsWith('/gaming-news/'),
      serialize(item) {
        const { priority, changefreq, lastmod } = lastmodFor(item.url, SITE);
        return { ...item, priority, changefreq, lastmod: lastmod ? new Date(lastmod).toISOString() : undefined };
      },
    }),
  ],
});
