// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

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

/** Sitemap <lastmod> straight from each entry's `updated` frontmatter, so crawlers see real edit dates. */
const LASTMOD = (() => {
  const map = new Map();
  for (const dir of ['destinations', 'resorts', 'guides', 'deals']) {
    const base = `./src/content/${dir}`;
    if (!existsSync(base)) continue;
    for (const f of readdirSync(base).filter((x) => x.endsWith('.md'))) {
      const m = /^updated:\s*["']?(\d{4}-\d{2}-\d{2})/m.exec(readFileSync(`${base}/${f}`, 'utf8'));
      if (m) map.set(`/${dir}/${f.replace(/\.md$/, '')}/`, new Date(m[1]).toISOString());
    }
  }
  return map;
})();

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
        const lastmod = LASTMOD.get(new URL(item.url).pathname);
        if (lastmod) item.lastmod = lastmod;
        return item;
      },
    }),
  ],
  vite: {
    // Keep every script as an external file so the CSP can stay `script-src 'self'`.
    build: { assetsInlineLimit: 0 },
  },
});
