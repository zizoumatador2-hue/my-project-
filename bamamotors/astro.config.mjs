// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: process.env.SITE_URL || 'https://bamamotors.com',
  output: 'server',
  adapter: cloudflare({
    imageService: 'passthrough',
    platformProxy: { enabled: true },
  }),
  // No render-blocking stylesheets: every page's CSS is inlined into <head>.
  build: { inlineStylesheets: 'always', format: 'directory' },
  prefetch: false,
  trailingSlash: 'never',
  security: { checkOrigin: true },
  devToolbar: { enabled: false },
  vite: { build: { cssMinify: true } },
});
