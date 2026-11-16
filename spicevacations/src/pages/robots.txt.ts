import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const origin = (site ?? new URL('https://spicevacations.com')).origin;
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /go/',
    'Disallow: /api/',
    'Disallow: /go-map.json',
    'Disallow: /admin/',
    '',
    `Sitemap: ${origin}/sitemap-index.xml`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
