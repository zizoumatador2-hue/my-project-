import type { APIRoute } from 'astro';
import { lookup } from '../../lib/content';
import { pinTargets, pinsCsv } from '../../lib/pins';

/** Bulk-upload file for Pinterest; every Media URL points at /pins/<slug>.jpg on the live site. */
export const GET: APIRoute = async () =>
  new Response(pinsCsv(pinTargets(await lookup())), { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
