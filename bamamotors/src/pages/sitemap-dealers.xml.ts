import type { APIRoute } from 'astro';
import { all } from '../lib/db';
import { urlset } from '../lib/sitemap';

export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime.env;
  const rows = await all<{ slug: string; updated_at: string }>(env.DB, "SELECT slug, updated_at FROM dealers WHERE status = 'active' ORDER BY id");
  return urlset(env.SITE_URL, rows.map((r) => ({ loc: `/dealers/${r.slug}`, lastmod: r.updated_at })));
};
