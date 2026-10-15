import type { APIRoute } from 'astro';
import { all, run, first } from '../../lib/db';

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) return Response.json({ ids: [] });
  const rows = await all<{ vehicle_id: number }>(locals.runtime.env.DB, 'SELECT vehicle_id FROM saved_vehicles WHERE user_id = ?', [locals.user.id]);
  return Response.json({ ids: rows.map((r) => r.vehicle_id) }, { headers: { 'Cache-Control': 'private, no-store' } });
};

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  if (!locals.user) return wantsJson ? Response.json({ ok: false, error: 'Sign in to save vehicles' }, { status: 401 }) : redirect('/login', 303);
  const db = locals.runtime.env.DB;
  const fd = await request.formData();
  const vehicleId = Number(fd.get('vehicle_id'));
  const action = fd.get('action') === 'remove' ? 'remove' : 'add';
  if (!Number.isInteger(vehicleId) || vehicleId <= 0) return Response.json({ ok: false, error: 'Invalid vehicle' }, { status: 400 });
  if (action === 'add') {
    const v = await first(db, "SELECT id FROM vehicles WHERE id = ? AND status = 'active'", [vehicleId]);
    if (!v) return Response.json({ ok: false, error: 'Vehicle not available' }, { status: 404 });
    await run(db, 'INSERT OR IGNORE INTO saved_vehicles (user_id, vehicle_id) VALUES (?,?)', [locals.user.id, vehicleId]);
  } else {
    await run(db, 'DELETE FROM saved_vehicles WHERE user_id = ? AND vehicle_id = ?', [locals.user.id, vehicleId]);
  }
  return wantsJson ? Response.json({ ok: true, saved: action === 'add' }) : redirect('/account?ok=saved', 303);
};
