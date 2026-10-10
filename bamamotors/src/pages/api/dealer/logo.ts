import type { APIRoute } from 'astro';
import { first, run } from '../../../lib/db';
import { storeImage, deleteImages } from '../../../lib/uploads';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const env = locals.runtime.env;
  const user = locals.user;
  const fd = await request.formData();
  let dealerId = locals.dealer?.id ?? 0;
  if (user?.role === 'admin') dealerId = Number(fd.get('dealer_id')) || 0;
  const back = user?.role === 'admin' ? `/admin/dealers/${dealerId}` : '/dashboard/profile';
  if (!user || !dealerId) return redirect('/login', 303);
  const res = await storeImage(env.MEDIA, fd.get('logo'), `d/${dealerId}`, 'logo');
  if (!res.ok) return redirect(`${back}?logo_err=${encodeURIComponent(res.error)}`, 303);
  const old = await first<{ logo_key: string | null }>(env.DB, 'SELECT logo_key FROM dealer_profiles WHERE dealer_id = ?', [dealerId]);
  await run(
    env.DB,
    `INSERT INTO dealer_profiles (dealer_id, logo_key) VALUES (?, ?)
     ON CONFLICT(dealer_id) DO UPDATE SET logo_key = excluded.logo_key, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
    [dealerId, res.key],
  );
  if (old?.logo_key) await deleteImages(env.MEDIA, [old.logo_key]);
  return redirect(`${back}?ok=uploaded`, 303);
};
