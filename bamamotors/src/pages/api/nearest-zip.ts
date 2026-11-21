import type { APIRoute } from 'astro';
import { first } from '../../lib/db';

export const GET: APIRoute = async ({ url, locals }) => {
  const lat = Number(url.searchParams.get('lat'));
  const lng = Number(url.searchParams.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return Response.json({ error: 'Invalid coordinates' }, { status: 400 });
  }
  const kx = Math.cos((lat * Math.PI) / 180);
  // Search a ~1.5° box around the visitor — Alabama ZIPs only.
  const z = await first<{ zip: string; city: string }>(
    locals.runtime.env.DB,
    `SELECT zip, city FROM zip_codes
      WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
      ORDER BY ((lat - ?) * (lat - ?) + ((lng - ?) * ?) * ((lng - ?) * ?)) LIMIT 1`,
    [lat - 1.5, lat + 1.5, lng - 1.5, lng + 1.5, lat, lat, lng, kx, lng, kx],
  );
  return Response.json(z ?? {}, { headers: { 'Cache-Control': 'private, max-age=600' } });
};
