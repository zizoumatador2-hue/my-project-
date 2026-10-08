import { allArticles, url } from '../lib/content';
import { SITE } from '../lib/site';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export async function GET() {
  const a = await allArticles();
  const items = a.map((x) => `<item><title>${esc(x.data.title)}</title><link>${SITE.url}${url(x)}</link><guid>${SITE.url}${url(x)}</guid><pubDate>${x.data.publishDate.toUTCString()}</pubDate><description>${esc(x.data.description)}</description></item>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${SITE.name}</title><link>${SITE.url}</link><description>${esc(SITE.description)}</description><language>en-us</language>${items}</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
