import type { APIRoute } from 'astro';
import { run } from '../../../../lib/db';
import { clientIp, rateLimit } from '../../../../lib/security';

/** View beacon (sent after page load) so edge-cached pages still count views. One count per IP per vehicle per hour. */
export const POST: APIRoute = async ({ params, request, locals }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return new Response(null, { status: 204 });
  const db = locals.runtime.env.DB;
  if (await rateLimit(db, `view:${id}:${clientIp(request)}`, 1, 3600)) {
    const day = new Date().toISOString().slice(0, 10);
    await db.batch([
      db.prepare("UPDATE vehicles SET views = views + 1 WHERE id = ? AND status = 'active'").bind(id),
      db.prepare('INSERT INTO vehicle_view_stats (vehicle_id, day, views) SELECT ?, ?, 1 WHERE EXISTS (SELECT 1 FROM vehicles WHERE id = ?) ON CONFLICT(vehicle_id, day) DO UPDATE SET views = views + 1').bind(id, day, id),
    ]);
  }
  return new Response(null, { status: 204 });
};
export { run };
