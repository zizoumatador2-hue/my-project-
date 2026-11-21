import type { APIRoute } from 'astro';
import { all } from '../../lib/db';

export const GET: APIRoute = async ({ url, locals }) => {
  const db = locals.runtime.env.DB;
  const make = url.searchParams.get('make') ?? '';
  const makeId = Number(url.searchParams.get('make_id') ?? 0);
  let models: { id: number; slug: string; name: string; body_type: string | null }[] = [];
  if (/^[a-z0-9-]{1,60}$/.test(make)) {
    models = await all(db, 'SELECT md.id, md.slug, md.name, md.body_type FROM models md JOIN makes mk ON mk.id = md.make_id WHERE mk.slug = ? ORDER BY md.name', [make]);
  } else if (makeId > 0) {
    models = await all(db, 'SELECT id, slug, name, body_type FROM models WHERE make_id = ? ORDER BY name', [makeId]);
  }
  return Response.json({ models }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
};
