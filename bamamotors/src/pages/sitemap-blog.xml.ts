import type { APIRoute } from 'astro';
import { all } from '../lib/db';
import { urlset } from '../lib/sitemap';

export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime.env;
  const posts = await all<{ slug: string; updated_at: string }>(env.DB, "SELECT slug, updated_at FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC");
  const cats = await all<{ slug: string }>(env.DB, "SELECT DISTINCT c.slug FROM categories c JOIN blog_posts p ON p.category_id = c.id WHERE p.status = 'published'");
  const authors = await all<{ author_slug: string }>(env.DB, "SELECT DISTINCT u.author_slug FROM users u JOIN blog_posts p ON p.author_id = u.id WHERE p.status = 'published' AND u.author_slug IS NOT NULL");
  return urlset(env.SITE_URL, [
    ...posts.map((p) => ({ loc: `/blog/${p.slug}`, lastmod: p.updated_at })),
    ...cats.map((c) => ({ loc: `/blog/category/${c.slug}` })),
    ...authors.map((a) => ({ loc: `/authors/${a.author_slug}` })),
  ]);
};
