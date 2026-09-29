import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '@/data/site';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = async () => {
  const guides = (await getCollection('guides', (g) => !g.data.draft)).sort((a, b) => b.data.updated.getTime() - a.data.updated.getTime());
  const items = guides
    .map((g) => {
      const url = `${SITE.url}/guides/${g.id}/`;
      return `<item><title>${esc(g.data.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${g.data.published.toUTCString()}</pubDate><description>${esc(g.data.description)}</description></item>`;
    })
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(SITE.name)} Guides</title><link>${SITE.url}/</link><atom:link href="${SITE.url}/rss.xml" rel="self" type="application/rss+xml"/><description>${esc(SITE.description)}</description><language>en-us</language><lastBuildDate>${(guides[0]?.data.updated ?? new Date()).toUTCString()}</lastBuildDate>${items}</channel></rss>`;
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
};
