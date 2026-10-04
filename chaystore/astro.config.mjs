import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

// Static site, no prefetch (SEO/perf), all CSS inlined so nothing blocks rendering.
export default defineConfig({
  site: 'https://chaystore.com',
  trailingSlash: 'always',
  prefetch: false,
  compressHTML: true,
  build: { inlineStylesheets: 'always', format: 'directory' },
  integrations: [react(), sitemap()],
});
