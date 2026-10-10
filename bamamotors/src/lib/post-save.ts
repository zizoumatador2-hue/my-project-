import { z } from 'zod';
import { first, insert, run, nowIso, audit } from './db';
import { slugify, uniqueSlug } from './slug';
import { recordSlugChange } from './redirects';
import { faqFromText } from './markdown';
import { zodErrors, type FieldErrors } from './validation';

const schema = z.object({
  title: z.string().trim().min(5, 'Enter a title').max(160),
  slug: z.string().trim().max(90).optional().default(''),
  excerpt: z.string().trim().min(20, 'Write a short excerpt (20+ characters)').max(400),
  body: z.string().trim().min(50, 'The article body is too short').max(100_000),
  category_id: z.coerce.number().int().nonnegative().optional().default(0),
  status: z.enum(['draft', 'published']),
  meta_title: z.string().trim().max(70, 'Keep meta titles under 70 characters').optional().default(''),
  meta_description: z.string().trim().max(160, 'Keep meta descriptions under 160 characters').optional().default(''),
  keywords: z.string().trim().max(300).optional().default(''),
  faq: z.string().max(20_000).optional().default(''),
  howto: z.string().max(20_000).optional().default(''),
  substantial: z.string().optional(),
});

/**
 * Creates/updates a blog post. `updated_at` only moves forward when the editor marks the edit
 * as substantial, so freshness dates stay honest.
 */
export async function savePost(db: D1Database, input: Record<string, string>, actorId: number, postId?: number): Promise<{ ok: true; id: number } | { ok: false; errors: FieldErrors }> {
  const p = schema.safeParse(input);
  if (!p.success) return { ok: false, errors: zodErrors(p.error) };
  const d = p.data;
  let howtoJson: string | null = null;
  if (d.howto.trim()) {
    const steps = d.howto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
      const [name, ...rest] = l.split('|');
      return { name: name.trim(), text: (rest.join('|') || name).trim() };
    });
    howtoJson = JSON.stringify({ name: d.title, steps });
  }
  const faq = faqFromText(d.faq);
  const existing = postId ? await first<{ id: number; slug: string; status: string; published_at: string | null }>(db, 'SELECT id, slug, status, published_at FROM blog_posts WHERE id = ?', [postId]) : null;
  const slug = await uniqueSlug(db, 'blog_posts', slugify(d.slug || d.title), postId);
  const now = nowIso();
  const publishedAt = d.status === 'published' ? existing?.published_at ?? now : existing?.published_at ?? null;
  const values = [slug, d.title, d.excerpt, d.body, d.category_id || null, d.status, d.meta_title || null, d.meta_description || null, d.keywords || null, faq.length ? JSON.stringify(faq) : null, howtoJson, publishedAt];
  let id: number;
  if (existing) {
    const bump = d.substantial === 'on' || existing.status !== d.status;
    await run(db, `UPDATE blog_posts SET slug=?, title=?, excerpt=?, body=?, category_id=?, status=?, meta_title=?, meta_description=?, keywords=?, faq_json=?, howto_json=?, published_at=?${bump ? ', updated_at=?' : ''} WHERE id = ?`,
      bump ? [...values, now, existing.id] : [...values, existing.id]);
    // A published post's old URL may be indexed or linked: keep it alive as a 301.
    if (existing.slug !== slug && existing.published_at) await recordSlugChange(db, 'post', existing.slug, existing.id);
    id = existing.id;
  } else {
    id = await insert(db, 'INSERT INTO blog_posts (slug, title, excerpt, body, category_id, status, meta_title, meta_description, keywords, faq_json, howto_json, published_at, author_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [...values, actorId]);
  }
  await audit(db, actorId, existing ? 'post.update' : 'post.create', 'post', id);
  return { ok: true, id };
}
