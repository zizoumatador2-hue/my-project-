import type { APIRoute } from 'astro';
import { first, insert } from '../../../../lib/db';
import { storeImage, deleteImages } from '../../../../lib/uploads';
import { rateLimit } from '../../../../lib/security';

const MAX_IMAGES = 30;

export const POST: APIRoute = async ({ params, request, locals, redirect }) => {
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  const user = locals.user;
  const env = locals.runtime.env;
  const id = Number(params.id);
  const reply = (status: number, error?: string) =>
    wantsJson ? Response.json(error ? { ok: false, error } : { ok: true }, { status }) : redirect(`${backUrl}${error ? `?upload_err=${encodeURIComponent(error)}` : '?ok=uploaded'}#photos`, 303);
  const backUrl = user?.role === 'admin' ? `/admin/vehicles/${id}` : `/dashboard/vehicles/${id}`;

  if (!user || (user.role !== 'dealer' && user.role !== 'admin')) return reply(401, 'Sign in as a dealer.');
  const v = await first<{ id: number; dealer_id: number }>(env.DB, 'SELECT id, dealer_id FROM vehicles WHERE id = ?', [id]);
  if (!v) return reply(404, 'Vehicle not found.');
  if (user.role === 'dealer' && locals.dealer?.id !== v.dealer_id) return reply(403, 'Not your vehicle.');
  if (!(await rateLimit(env.DB, `upload:${user.id}`, 200, 3600))) return reply(429, 'Upload limit reached. Try again later.');

  const count = await first<{ n: number; pos: number }>(env.DB, 'SELECT COUNT(*) AS n, COALESCE(MAX(position), -1) AS pos FROM vehicle_images WHERE vehicle_id = ?', [id]);
  if ((count?.n ?? 0) >= MAX_IMAGES) return reply(400, `A vehicle can have up to ${MAX_IMAGES} photos.`);

  const fd = await request.formData();
  const large = await storeImage(env.MEDIA, fd.get('large'), `v/${id}`, 'l');
  if (!large.ok) return reply(400, large.error);
  const smallFile = fd.get('small');
  let smallKey = large.key;
  if (smallFile && typeof smallFile !== 'string' && smallFile.size > 0) {
    const small = await storeImage(env.MEDIA, smallFile, `v/${id}`, 's');
    if (!small.ok) {
      await deleteImages(env.MEDIA, [large.key]);
      return reply(400, small.error);
    }
    smallKey = small.key;
  }
  const w = Number(fd.get('width')) || null;
  const h = Number(fd.get('height')) || null;
  await insert(env.DB, 'INSERT INTO vehicle_images (vehicle_id, key_large, key_small, width, height, position) VALUES (?,?,?,?,?,?)', [
    id, large.key, smallKey, w, h, (count?.pos ?? -1) + 1,
  ]);
  await env.DB.prepare("UPDATE vehicles SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").bind(id).run();
  return reply(200);
};
