import { first, run } from './db';

export type RedirectKind = 'vehicle' | 'post';

/** Remembers a public slug that just changed, so links and search results keep working (301 to the current slug). */
export async function recordSlugChange(db: D1Database, kind: RedirectKind, oldSlug: string, targetId: number): Promise<void> {
  await run(db, 'INSERT OR REPLACE INTO slug_redirects (kind, old_slug, target_id) VALUES (?, ?, ?)', [kind, oldSlug, targetId]);
}

/** Current slug for an old one, or null. Only consulted after the direct slug lookup failed. */
export async function findRedirect(db: D1Database, kind: RedirectKind, slug: string): Promise<string | null> {
  const table = kind === 'vehicle' ? 'vehicles' : 'blog_posts';
  const row = await first<{ slug: string }>(db, `SELECT t.slug FROM slug_redirects r JOIN ${table} t ON t.id = r.target_id WHERE r.kind = ? AND r.old_slug = ?`, [kind, slug]);
  return row && row.slug !== slug ? row.slug : null;
}
