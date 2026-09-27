import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv, Env } from '../env';
import { auditStmt, notifyStmt } from '../lib/audit';
import { can, requireUser } from '../lib/auth';
import { putEncrypted, readUpload, signFileUrl } from '../lib/files';
import { rateLimit } from '../lib/ratelimit';
import { body, cleanText } from '../lib/validate';
import { HttpError, newId, now } from '../lib/util';

const r = new Hono<AppEnv>();

interface DisputeRow { id: string; deal_id: string; status: string; opened_by: string; assigned_to: string | null; buyer_id: string; seller_id: string }

export async function loadDispute(env: Env, id: string) {
  const d = await env.DB.prepare('SELECT ds.*, d.buyer_id, d.seller_id FROM disputes ds JOIN deals d ON d.id = ds.deal_id WHERE ds.id = ?').bind(id).first<DisputeRow>();
  if (!d) throw new HttpError(404, 'not_found', 'النزاع غير موجود.');
  return d;
}

/** Evidence access: parties may open files in their own dispute; admins only if they hold disputes.manage. */
export async function disputeEvents(env: Env, disputeId: string, viewerId: string) {
  const rows = await env.DB.prepare(
    `SELECT e.id, e.actor_id, u.display_name AS actor_name, u.role AS actor_role, e.kind, e.body, e.evidence_key, e.evidence_mime, e.evidence_size, e.created_at
     FROM dispute_events e LEFT JOIN users u ON u.id = e.actor_id WHERE e.dispute_id = ? ORDER BY e.created_at`,
  ).bind(disputeId).all<Record<string, any>>();
  const out = [];
  for (const e of rows.results) {
    const { evidence_key, ...rest } = e;
    out.push({ ...rest, has_file: !!evidence_key, file_url: evidence_key ? await signFileUrl(env, { k: evidence_key, u: viewerId, c: `dispute:${disputeId}` }) : null });
  }
  return out;
}

r.get('/disputes/:id', async (c) => {
  const u = requireUser(c);
  const d = await loadDispute(c.env, c.req.param('id'));
  const isParty = d.buyer_id === u.id || d.seller_id === u.id;
  if (!isParty && !can(u.role, 'disputes.manage')) throw new HttpError(404, 'not_found', 'النزاع غير موجود.');
  const { assigned_to: _a, ...safe } = d;
  return c.json({ dispute: isParty ? safe : d, events: await disputeEvents(c.env, d.id, u.id), role: d.buyer_id === u.id ? 'buyer' : d.seller_id === u.id ? 'seller' : 'admin' });
});

r.post('/disputes/:id/statements', async (c) => {
  const u = requireUser(c);
  await rateLimit(c.env, 'dispute-stmt', u.id, 30, 3600_000);
  const d = await loadDispute(c.env, c.req.param('id'));
  if (d.buyer_id !== u.id && d.seller_id !== u.id) throw new HttpError(404, 'not_found', 'النزاع غير موجود.');
  if (d.status === 'resolved') throw new HttpError(409, 'resolved', 'تم الفصل في النزاع.');
  const b = await body(c.req, z.object({ body: cleanText(5, 4000) }));
  const t = now();
  const other = d.buyer_id === u.id ? d.seller_id : d.buyer_id;
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO dispute_events (id, dispute_id, actor_id, kind, body, created_at) VALUES (?,?,?,?,?,?)').bind(newId('dev'), d.id, u.id, 'statement', b.body, t),
    c.env.DB.prepare(`UPDATE disputes SET status = 'open' WHERE id = ? AND status = 'awaiting_evidence'`).bind(d.id),
    notifyStmt(c.env, other, 'إفادة جديدة في النزاع', 'أضاف الطرف الآخر إفادة جديدة.', `/disputes/${d.id}`),
    auditStmt(c.env, { actorId: u.id, action: 'dispute.statement', subjectType: 'dispute', subjectId: d.id }),
  ]);
  return c.json({ ok: true }, 201);
});

r.post('/disputes/:id/evidence', async (c) => {
  const u = requireUser(c);
  await rateLimit(c.env, 'dispute-evidence', u.id, 20, 3600_000);
  const d = await loadDispute(c.env, c.req.param('id'));
  if (d.buyer_id !== u.id && d.seller_id !== u.id) throw new HttpError(404, 'not_found', 'النزاع غير موجود.');
  if (d.status === 'resolved') throw new HttpError(409, 'resolved', 'تم الفصل في النزاع.');
  const form = await c.req.formData().catch(() => { throw new HttpError(400, 'bad_form', 'نموذج غير صالح.'); });
  const note = String(form.get('note') ?? '').slice(0, 500).trim() || null;
  const f = await readUpload(form.get('file') as File | null, true);
  const id = newId('dev');
  const key = `disputes/${d.id}/${id}`;
  await putEncrypted(c.env, key, f.bytes, f.mime);
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO dispute_events (id, dispute_id, actor_id, kind, body, evidence_key, evidence_mime, evidence_size, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(id, d.id, u.id, 'evidence', note, key, f.mime, f.size, now()),
    c.env.DB.prepare(`UPDATE disputes SET status = 'open' WHERE id = ? AND status = 'awaiting_evidence'`).bind(d.id),
    auditStmt(c.env, { actorId: u.id, action: 'dispute.evidence_upload', subjectType: 'dispute', subjectId: d.id, details: { size: f.size, mime: f.mime } }),
  ]);
  return c.json({ id }, 201);
});

export default r;
