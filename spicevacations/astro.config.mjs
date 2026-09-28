// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/** rehype: wrap tables for horizontal scroll on mobile, and harden external links in Markdown. */
function rehypeSpice() {
  const walk = (node, parent) => {
    if (node.type === 'element') {
      if (node.tagName === 'table' && parent && !(parent.properties?.className || []).includes('table-wrap')) {
        const idx = parent.children.indexOf(node);
        parent.children[idx] = { type: 'element', tagName: 'div', properties: { className: ['table-wrap'], tabIndex: 0, role: 'region', ariaLabel: 'Comparison table' }, children: [node] };
      }
      if (node.tagName === 'a' && /^https?:/.test(String(node.properties?.href || '')) && !String(node.properties.href).includes('spicevacations.com')) {
        node.properties.rel = ['noopener', 'noreferrer'];
        node.properties.target = '_blank';
      }
    }
    (node.children || []).slice().forEach((c) => walk(c, node));
  };
  return (tree) => walk(tree, null);
}

const SITE = process.env.SITE_URL || 'https://spicevacations.com';

// Utility pages that must never appear in the sitemap (they are also noindex).
const EXCLUDE = ['/brand/', '/search/', '/contact/thanks/', '/newsletter/thanks/', '/500/', '/404/', '/saved/'];

export default defineConfig({
  site: SITE,
  trailingSlash: 'always',
  output: 'static',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  compressHTML: true,
  markdown: { rehypePlugins: [rehypeSpice], smartypants: true },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  integrations: [
    sitemap({
      entryLimit: 5000,
      filter: (page) => !EXCLUDE.some((p) => page.endsWith(p)),
      i18n: undefined,
      serialize(item) {
        item.links = [{ lang: 'en-US', url: item.url }];
        return item;
      },
    }),
  ],
  vite: {
    // Keep every script as an external file so the CSP can stay `script-src 'self'`.
    build: { assetsInlineLimit: 0 },
  },
});
