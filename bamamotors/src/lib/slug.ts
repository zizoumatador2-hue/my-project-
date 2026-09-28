export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

export function vehicleSlugBase(v: { year: number; make: string; model: string; trim?: string | null; city: string }): string {
  return slugify([v.year, v.make, v.model, v.trim ?? '', v.city, 'al'].join(' '));
}

/** Ensures a slug is unique by probing the table; appends -2, -3, … on collision. */
export async function uniqueSlug(
  db: D1Database,
  table: 'vehicles' | 'dealers' | 'blog_posts' | 'categories' | 'cities',
  base: string,
  excludeId?: number,
): Promise<string> {
  const root = base || 'item';
  for (let i = 1; i < 500; i++) {
    const candidate = i === 1 ? root : `${root}-${i}`;
    const row = await db
      .prepare(`SELECT id FROM ${table} WHERE slug = ?${excludeId ? ' AND id != ?' : ''}`)
      .bind(...(excludeId ? [candidate, excludeId] : [candidate]))
      .first<{ id: number }>();
    if (!row) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}
