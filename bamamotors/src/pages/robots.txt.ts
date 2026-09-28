import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ locals }) => {
  const env = locals.runtime.env;
  const base = env.SITE_URL.replace(/\/$/, '');
  // Non-production deployments are never indexed.
  const body = env.ENVIRONMENT === 'production'
    ? `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /dashboard\nDisallow: /account\nDisallow: /api/\nDisallow: /login\nDisallow: /signup\nDisallow: /forgot-password\nDisallow: /reset-password\nDisallow: /*?*sort=\n\nSitemap: ${base}/sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
