import type { APIRoute } from 'astro';
import { all } from '../lib/db';
import { urlset } from '../lib/sitemap';

export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime.env;
  const rows = await all<{ slug: string; updated_at: string }>(
    env.DB,
    "SELECT v.slug, v.updated_at FROM vehicles v JOIN dealers d ON d.id = v.dealer_id WHERE v.status = 'active' AND d.status = 'active' ORDER BY v.updated_at DESC LIMIT 45000",
  );
  return urlset(env.SITE_URL, rows.map((r) => ({ loc: `/vehicles/${r.slug}`, lastmod: r.updated_at })));
};
