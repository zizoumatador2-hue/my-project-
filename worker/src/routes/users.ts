import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { audit } from '../lib/audit';
import { can, requireUser } from '../lib/auth';
import { getDecrypted, verifyFileToken } from '../lib/files';
import { HttpError, now, parseJson } from '../lib/util';

const r = new Hono<AppEnv>();

r.get('/users/:id', async (c) => {
  const u = await c.env.DB.prepare('SELECT id, display_name, created_at, trust_seller, trust_buyer, trust_breakdown, status FROM users WHERE id = ?')
    .bind(c.req.param('id')).first<Record<string, any>>();
  if (!u) throw new HttpError(404, 'not_found', 'المستخدم غير موجود.');
  const breakdown = parseJson<Record<string, any>>(u.trust_breakdown, {});
  const listings = await c.env.DB.prepare(
    `SELECT id, platform, handle, title, followers, engagement_rate, price_cents, currency, status FROM listings WHERE seller_id = ? AND status IN ('approved','sold') ORDER BY updated_at DESC LIMIT 24`,
  ).bind(u.id).all();
  // Public = summarized. Full history is only in the admin console.
  return c.json({
    user: {
      id: u.id, display_name: u.display_name, member_since: u.created_at, suspended: u.status === 'suspended',
      trust_seller: u.trust_seller, trust_buyer: u.trust_buyer,
      seller_stats: { completed: breakdown.seller?.stats?.completed ?? 0, disputes_lost: breakdown.seller?.stats?.disputes_lost ?? 0 },
      buyer_stats: { completed: breakdown.buyer?.stats?.completed ?? 0 },
      avg_response_minutes: breakdown.avg_response_minutes ?? null,
    },
    listings: listings.results,
  });
});

r.get('/notifications', async (c) => {
  const u = requireUser(c);
  const rows = await c.env.DB.prepare('SELECT id, title, body, link, read_at, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').bind(u.id).all();
  return c.json({ items: rows.results });
});

r.post('/notifications/read', async (c) => {
  const u = requireUser(c);
  await c.env.DB.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL').bind(now(), u.id).run();
  return c.json({ ok: true });
});

/**
 * Serves decrypted evidence behind a short-lived signed URL. Authorization is re-checked on every access
 * (the URL alone is not enough): the viewer must be the one it was minted for AND still be entitled.
 */
r.get('/files/:token', async (c) => {
  const u = requireUser(c);
  const g = await verifyFileToken(c.env, c.req.param('token'));
  if (g.u !== u.id) throw new HttpError(403, 'forbidden', 'هذا الرابط ليس لك.');
  const [kind, id] = g.c.split(':');
  let ok = false;
  if (kind === 'listing') {
    const l = await c.env.DB.prepare('SELECT reviewer_id FROM listings WHERE id = ?').bind(id).first<{ reviewer_id: string | null }>();
    ok = !!l && l.reviewer_id === u.id && can(u.role, 'listings.review') && g.k.startsWith(`listings/${id}/`);
    if (!ok && can(u.role, 'disputes.manage')) {
      // Arbiter of an active dispute on a deal for this listing may consult its verification evidence.
      const d = await c.env.DB.prepare(`SELECT 1 FROM disputes ds JOIN deals d ON d.id = ds.deal_id WHERE d.listing_id = ? AND ds.assigned_to = ? AND ds.status != 'resolved'`).bind(id, u.id).first();
      ok = !!d && g.k.startsWith(`listings/${id}/`);
    }
  } else if (kind === 'dispute') {
    const d = await c.env.DB.prepare('SELECT d.buyer_id, d.seller_id FROM disputes ds JOIN deals d ON d.id = ds.deal_id WHERE ds.id = ?').bind(id).first<{ buyer_id: string; seller_id: string }>();
    ok = !!d && g.k.startsWith(`disputes/${id}/`) && (d.buyer_id === u.id || d.seller_id === u.id || can(u.role, 'disputes.manage'));
  }
  if (!ok) throw new HttpError(403, 'forbidden', 'لا تملك صلاحية عرض هذا الملف.');
  const f = await getDecrypted(c.env, g.k);
  if (!f) throw new HttpError(404, 'not_found', 'الملف غير موجود.');
  await audit(c.env, { actorId: u.id, action: 'evidence.view', subjectType: kind, subjectId: id, details: { key: g.k } });
  return new Response(f.body, {
    headers: {
      'Content-Type': f.mime,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      'Content-Disposition': 'inline',
      'Referrer-Policy': 'no-referrer',
    },
  });
});

export default r;
