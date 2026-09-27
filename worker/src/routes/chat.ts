import { Hono } from 'hono';
import { z } from 'zod';
import { scanMessage, VIOLATION_LABELS } from '../../../shared/chatFilter';
import type { AppEnv } from '../env';
import { auditStmt, notifyStmt } from '../lib/audit';
import { can, requireUser } from '../lib/auth';
import { rateLimit } from '../lib/ratelimit';
import { getSettings } from '../lib/settings';
import { verifyTurnstile } from '../lib/turnstile';
import { body, cleanText } from '../lib/validate';
import { clientIp, HttpError, newId, now } from '../lib/util';

const r = new Hono<AppEnv>();

interface Conv { id: string; listing_id: string; buyer_id: string; seller_id: string; deal_id: string | null }

async function loadConv(c: { env: AppEnv['Bindings'] }, id: string, userId: string, allowAdmin: boolean) {
  const conv = await c.env.DB.prepare('SELECT * FROM conversations WHERE id = ?').bind(id).first<Conv>();
  if (!conv || (conv.buyer_id !== userId && conv.seller_id !== userId && !allowAdmin)) throw new HttpError(404, 'not_found', 'المحادثة غير موجودة.');
  return conv;
}

r.post('/listings/:id/conversations', async (c) => {
  const u = requireUser(c);
  const ip = clientIp(c.req.raw);
  const b = await body(c.req, z.object({ turnstileToken: z.string().max(4096).optional() }));
  const l = await c.env.DB.prepare('SELECT id, seller_id, status FROM listings WHERE id = ?').bind(c.req.param('id')).first<{ id: string; seller_id: string; status: string }>();
  if (!l || !['approved', 'reserved'].includes(l.status)) throw new HttpError(404, 'not_found', 'الإعلان غير متاح.');
  if (l.seller_id === u.id) throw new HttpError(403, 'own_listing', 'لا يمكنك مراسلة نفسك.');
  const existing = await c.env.DB.prepare('SELECT id FROM conversations WHERE listing_id = ? AND buyer_id = ?').bind(l.id, u.id).first<{ id: string }>();
  if (existing) return c.json({ id: existing.id });
  await rateLimit(c.env, 'conv-create', u.id, 20, 3600_000);
  await verifyTurnstile(c.env, b.turnstileToken, ip, 'chat');
  const id = newId('cnv');
  await c.env.DB.prepare('INSERT INTO conversations (id, listing_id, buyer_id, seller_id, created_at) VALUES (?,?,?,?,?)').bind(id, l.id, u.id, l.seller_id, now()).run();
  return c.json({ id }, 201);
});

r.get('/conversations', async (c) => {
  const u = requireUser(c);
  const rows = await c.env.DB.prepare(
    `SELECT cv.id, cv.listing_id, cv.deal_id, cv.last_message_at, cv.buyer_id, cv.seller_id, l.title, l.platform, l.handle,
       CASE WHEN cv.buyer_id = ?1 THEN s.display_name ELSE b.display_name END AS counterpart,
       (SELECT body FROM messages m WHERE m.conversation_id = cv.id AND (m.blocked = 0 OR m.sender_id = ?1) ORDER BY m.created_at DESC LIMIT 1) AS last_body,
       (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = cv.id AND m.blocked = 0 AND (m.sender_id IS NULL OR m.sender_id != ?1)
          AND m.created_at > COALESCE((SELECT last_read_at FROM message_reads r WHERE r.conversation_id = cv.id AND r.user_id = ?1), 0)) AS unread
     FROM conversations cv JOIN listings l ON l.id = cv.listing_id JOIN users b ON b.id = cv.buyer_id JOIN users s ON s.id = cv.seller_id
     WHERE cv.buyer_id = ?1 OR cv.seller_id = ?1 ORDER BY COALESCE(cv.last_message_at, cv.created_at) DESC LIMIT 100`,
  ).bind(u.id).all();
  return c.json({ items: rows.results });
});

r.get('/conversations/:id/messages', async (c) => {
  const u = requireUser(c);
  const isAdmin = can(u.role, 'chat.view');
  const conv = await loadConv(c, c.req.param('id'), u.id, isAdmin);
  const party = conv.buyer_id === u.id || conv.seller_id === u.id;
  const after = Math.max(0, Number(c.req.query('after')) || 0);
  // Parties never see the other side's blocked attempts; they see their own (marked blocked). Admins see everything.
  const rows = await c.env.DB.prepare(
    `SELECT id, sender_id, body, blocked, block_reasons, created_at FROM messages
     WHERE conversation_id = ? AND created_at > ? AND (blocked = 0 OR sender_id = ? OR ?) ORDER BY created_at ASC LIMIT 500`,
  ).bind(conv.id, after, u.id, isAdmin && !party ? 1 : 0).all();
  if (party) {
    await c.env.DB.prepare(`INSERT INTO message_reads (conversation_id, user_id, last_read_at) VALUES (?,?,?)
      ON CONFLICT(conversation_id, user_id) DO UPDATE SET last_read_at = excluded.last_read_at`).bind(conv.id, u.id, now()).run();
  }
  const meta = await c.env.DB.prepare(
    `SELECT l.id AS listing_id, l.title, l.handle, l.platform, l.status AS listing_status, b.display_name AS buyer_name, s.display_name AS seller_name, d.escrow_state
     FROM conversations cv JOIN listings l ON l.id = cv.listing_id JOIN users b ON b.id = cv.buyer_id JOIN users s ON s.id = cv.seller_id
     LEFT JOIN deals d ON d.id = cv.deal_id WHERE cv.id = ?`,
  ).bind(conv.id).first();
  return c.json({ conversation: { ...conv, ...meta }, messages: rows.results, serverTime: now() });
});

r.post('/conversations/:id/messages', async (c) => {
  const u = requireUser(c);
  const ip = clientIp(c.req.raw);
  await rateLimit(c.env, 'chat', u.id, 30, 60_000);
  const s = await getSettings(c.env);
  if (!s.flags.chat_enabled) throw new HttpError(503, 'chat_disabled', 'المحادثات متوقفة مؤقتًا.');
  const conv = await loadConv(c, c.req.param('id'), u.id, false);
  const b = await body(c.req, z.object({ body: cleanText(1, 2000, 'الرسالة فارغة'), turnstileToken: z.string().max(4096).optional() }));
  // Turnstile on the first message of a conversation (bots) — subsequent messages are rate limited instead.
  const count = await c.env.DB.prepare('SELECT COUNT(*) n FROM messages WHERE conversation_id = ? AND sender_id = ?').bind(conv.id, u.id).first<{ n: number }>();
  if ((count?.n ?? 0) === 0) await verifyTurnstile(c.env, b.turnstileToken, ip, 'chat');

  const listing = await c.env.DB.prepare('SELECT handle FROM listings WHERE id = ?').bind(conv.listing_id).first<{ handle: string }>();
  let dealComplete = false;
  if (conv.deal_id) {
    const d = await c.env.DB.prepare('SELECT escrow_state FROM deals WHERE id = ?').bind(conv.deal_id).first<{ escrow_state: string }>();
    dealComplete = !!d && ['released', 'refunded', 'split'].includes(d.escrow_state);
  }
  const violations = dealComplete && s.chat.allow_contact_after_complete ? [] : scanMessage(b.body, listing ? [listing.handle] : []);
  const blocked = violations.length > 0;
  const id = newId('msg');
  const t = now();
  const stmts: D1PreparedStatement[] = [
    c.env.DB.prepare('INSERT INTO messages (id, conversation_id, sender_id, body, blocked, block_reasons, created_at) VALUES (?,?,?,?,?,?,?)')
      .bind(id, conv.id, u.id, b.body, blocked ? 1 : 0, blocked ? JSON.stringify(violations) : null, t),
  ];
  if (!blocked) {
    const other = conv.buyer_id === u.id ? conv.seller_id : conv.buyer_id;
    stmts.push(c.env.DB.prepare('UPDATE conversations SET last_message_at = ? WHERE id = ?').bind(t, conv.id));
    // Throttle notifications: one per conversation per 10 minutes.
    stmts.push(c.env.DB.prepare(
      `INSERT INTO notifications (id, user_id, title, body, link, created_at)
       SELECT ?, ?, 'رسالة جديدة', ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = ? AND link = ? AND read_at IS NULL AND created_at > ?)`,
    ).bind(newId('ntf'), other, `${u.display_name}: ${b.body.slice(0, 80)}`, `/messages/${conv.id}`, t, other, `/messages/${conv.id}`, t - 600_000));
  } else {
    stmts.push(
      c.env.DB.prepare('UPDATE users SET chat_violations = chat_violations + 1 WHERE id = ?').bind(u.id),
      auditStmt(c.env, { actorId: u.id, action: 'chat.blocked', subjectType: 'conversation', subjectId: conv.id, details: { violations, messageId: id }, ip }),
    );
  }
  await c.env.DB.batch(stmts);

  let flagged = false;
  if (blocked) {
    const v = await c.env.DB.prepare('SELECT chat_violations FROM users WHERE id = ?').bind(u.id).first<{ chat_violations: number }>();
    if ((v?.chat_violations ?? 0) >= s.chat.violation_flag_threshold) {
      // Repeated attempts → fraud queue (one open case per user at a time).
      await c.env.DB.prepare(
        `INSERT INTO fraud_cases (id, subject_type, subject_id, reason, severity, details, created_at)
         SELECT ?, 'user', ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM fraud_cases WHERE subject_type = 'user' AND subject_id = ? AND status = 'open' AND reason LIKE 'محاولات متكررة%')`,
      ).bind(newId('frd'), u.id, `محاولات متكررة لنقل التواصل خارج المنصة (${v!.chat_violations})`, v!.chat_violations >= s.chat.violation_flag_threshold * 2 ? 'high' : 'medium',
        JSON.stringify({ conversation: conv.id, last: violations }), t, u.id).run();
      flagged = true;
      await notifyStmt(c.env, u.id, 'تنبيه: محاولات مشاركة بيانات تواصل', 'تكرار محاولة مشاركة بيانات تواصل خارجية يعرّض حسابك للمراجعة والإيقاف.', `/messages/${conv.id}`).run();
    }
    await c.env.VERIFY_QUEUE.send({ type: 'recompute_trust', userId: u.id }).catch(() => {});
  }
  return c.json({
    id, blocked, created_at: t, flagged,
    violations: violations.map((v) => ({ code: v, label: VIOLATION_LABELS[v] })),
  }, blocked ? 422 : 201);
});

export default r;
