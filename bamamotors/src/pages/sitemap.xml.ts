import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ locals }) => {
  const base = locals.runtime.env.SITE_URL.replace(/\/$/, '');
  const now = new Date().toISOString().slice(0, 10);
  const maps = ['pages', 'vehicles', 'dealers', 'blog'];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${maps
    .map((m) => `  <sitemap><loc>${base}/sitemap-${m}.xml</loc><lastmod>${now}</lastmod></sitemap>`)
    .join('\n')}\n</sitemapindex>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
