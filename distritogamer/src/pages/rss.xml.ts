import { allArticles, modified } from '../lib/articles';
import { SITE } from '../config/site';
import { abs, articleUrl } from '../lib/utils';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function GET() {
  const items = (await allArticles()).slice(0, 30);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>${esc(SITE.name)}</title><link>${SITE.url}/</link><description>${esc(SITE.description)}</description><language>en-us</language>
<atom:link href="${SITE.url}/rss.xml" rel="self" type="application/rss+xml"/>
${items.map((a) => `<item><title>${esc(a.data.title)}</title><link>${abs(articleUrl(a))}</link><guid isPermaLink="true">${abs(articleUrl(a))}</guid><pubDate>${a.data.published.toUTCString()}</pubDate><description>${esc(a.data.description)}</description></item>`).join('\n')}
</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
