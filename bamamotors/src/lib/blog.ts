import { all, first } from './db';

export interface PostCard { id: number; slug: string; title: string; excerpt: string; published_at: string; updated_at: string; category_name: string | null; category_slug: string | null; }
export interface Post extends PostCard {
  body: string; meta_title: string | null; meta_description: string | null; keywords: string | null; faq_json: string | null; howto_json: string | null;
  cover_key: string | null; status: string; created_at: string; category_id: number | null; author_id: number | null;
  author_name: string | null; author_slug: string | null; author_title: string | null; author_bio: string | null;
}

const CARD = `SELECT p.id, p.slug, p.title, p.excerpt, p.published_at, p.updated_at, c.name AS category_name, c.slug AS category_slug
  FROM blog_posts p LEFT JOIN categories c ON c.id = p.category_id`;

export const listPosts = (db: D1Database, opts: { categoryId?: number; authorId?: number; limit: number; offset: number }) => {
  const where = ["p.status = 'published'"];
  const params: (number | string)[] = [];
  if (opts.categoryId) { where.push('p.category_id = ?'); params.push(opts.categoryId); }
  if (opts.authorId) { where.push('p.author_id = ?'); params.push(opts.authorId); }
  return all<PostCard>(db, `${CARD} WHERE ${where.join(' AND ')} ORDER BY p.published_at DESC, p.id DESC LIMIT ? OFFSET ?`, [...params, opts.limit, opts.offset]);
};

export const countPosts = async (db: D1Database, categoryId?: number) =>
  (await first<{ n: number }>(db, `SELECT COUNT(*) AS n FROM blog_posts WHERE status = 'published'${categoryId ? ' AND category_id = ?' : ''}`, categoryId ? [categoryId] : []))?.n ?? 0;

export const getPost = (db: D1Database, slug: string) =>
  first<Post>(
    db,
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug, u.name AS author_name, u.author_slug, u.author_title, u.author_bio
       FROM blog_posts p LEFT JOIN categories c ON c.id = p.category_id LEFT JOIN users u ON u.id = p.author_id WHERE p.slug = ?`,
    [slug],
  );

export const relatedPosts = (db: D1Database, post: Post, limit = 3) =>
  all<PostCard>(db, `${CARD} WHERE p.status = 'published' AND p.id != ? ORDER BY (p.category_id = ?) DESC, p.published_at DESC LIMIT ?`, [post.id, post.category_id ?? 0, limit]);

export const getCategories = (db: D1Database) =>
  all<{ id: number; slug: string; name: string; description: string | null; n: number }>(
    db,
    "SELECT c.*, (SELECT COUNT(*) FROM blog_posts p WHERE p.category_id = c.id AND p.status = 'published') AS n FROM categories c ORDER BY c.sort_order, c.name",
  );
