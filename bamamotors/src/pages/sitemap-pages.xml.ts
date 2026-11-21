import type { APIRoute } from 'astro';
import { urlset, landingEntries } from '../lib/sitemap';
import { first } from '../lib/db';

export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime.env;
  // /used-cars and /dealers are noindex until they have results (same rule as the pages themselves).
  const counts = await first<{ vehicles: number; dealers: number }>(env.DB, "SELECT (SELECT COUNT(*) FROM vehicles v JOIN dealers d ON d.id = v.dealer_id WHERE v.status = 'active' AND d.status = 'active') AS vehicles, (SELECT COUNT(*) FROM dealers WHERE status = 'active') AS dealers");
  const statics = ['/', '/financing', '/for-dealers', '/blog', '/about', '/how-it-works', '/faq', '/contact', '/privacy', '/terms', '/disclaimer', '/editorial-policy'];
  if ((counts?.vehicles ?? 0) > 0) statics.splice(1, 0, '/used-cars');
  if ((counts?.dealers ?? 0) > 0) statics.splice(statics.includes('/used-cars') ? 2 : 1, 0, '/dealers');
  return urlset(env.SITE_URL, [...statics.map((loc) => ({ loc })), ...(await landingEntries(env.DB))]);
};
