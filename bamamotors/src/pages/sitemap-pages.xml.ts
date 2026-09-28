import type { APIRoute } from 'astro';
import { urlset, landingEntries } from '../lib/sitemap';

export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime.env;
  const statics = ['/', '/used-cars', '/dealers', '/financing', '/for-dealers', '/blog', '/about', '/how-it-works', '/faq', '/contact', '/privacy', '/terms'];
  return urlset(env.SITE_URL, [...statics.map((loc) => ({ loc })), ...(await landingEntries(env.DB))]);
};
