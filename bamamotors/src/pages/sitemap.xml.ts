import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ locals }) => {
  const base = locals.runtime.env.SITE_URL.replace(/\/$/, '');
  const maps = ['pages', 'vehicles', 'dealers', 'blog'];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${maps
    // No <lastmod> here: the child sitemaps carry real per-URL dates, and a fake "today" would only add noise.
    .map((m) => `  <sitemap><loc>${base}/sitemap-${m}.xml</loc></sitemap>`)
    .join('\n')}\n</sitemapindex>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
