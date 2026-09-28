import { Hono } from 'hono';
import { z } from 'zod';
import { ROLES, type Role, type Settings } from '../../../shared/domain';
import type { AppEnv } from '../env';
import { audit, auditStmt, notifyStmt } from '../lib/audit';
import { can, requirePerm } from '../lib/auth';
import { decryptText } from '../lib/crypto';
import { getDeal, refundDeal, releaseEffects, transition, type DealRow } from '../lib/escrow';
import { requireKeys, signFileUrl } from '../lib/files';
import { getSettings, saveSettings, settingsSchema } from '../lib/settings';
import { body, cleanText, pageParams } from '../lib/validate';
import { clientIp, HttpError, newId, now, parseJson } from '../lib/util';
import { loadDealView, markHeld } from './deals';
import { disputeEvents, loadDispute } from './disputes';

const r = new Hono<AppEnv>();

r.use('/admin/*', async (c, next) => {
  requirePerm(c, 'admin.access');
  c.header('Cache-Control', 'no-store');
  await next();
});

const n = (v: unknown) => Number(v ?? 0);

r.get('/admin/overview', async (c) => {
  const one = (sql: string, ...b: unknown[]) => c.env.DB.prepare(sql).bind(...b).first<{ n: number }>().then((x) => x?.n ?? 0);
  const [pendingReviews, needsEvidence, openFraud, openDisputes, pendingWithdrawals, approvedWithdrawals, awaitingVerify, byState, gmv30, commission30] = await Promise.all([
    one(`SELECT COUNT(*) n FROM listings WHERE status = 'pending_review'`),
    one(`SELECT COUNT(*) n FROM listings WHERE status = 'needs_evidence'`),
    one(`SELECT COUNT(*) n FROM fraud_cases WHERE status = 'open'`),
    one(`SELECT COUNT(*) n FROM disputes WHERE status != 'resolved'`),
    one(`SELECT COUNT(*) n FROM withdrawals WHERE status = 'pending_review'`),
    one(`SELECT COUNT(*) n FROM withdrawals WHERE status = 'approved'`),
    one(`SELECT COUNT(*) n FROM transfer_steps s JOIN deals d ON d.id = s.deal_id WHERE s.step_no = 6 AND s.status = 'active' AND d.escrow_state = 'transfer_in_progress'`),
    c.env.DB.prepare('SELECT escrow_state, COUNT(*) n, COALESCE(SUM(price_cents),0) amount FROM deals GROUP BY escrow_state').all(),
    one(`SELECT COALESCE(SUM(price_cents),0) n FROM deals WHERE escrow_state IN ('released','split') AND released_at > ?`, now() - 30 * 86400000),
    one(`SELECT COALESCE(SUM(amount_cents),0) n FROM platform_ledger WHERE kind IN ('commission','commission_reversal') AND created_at > ?`, now() - 30 * 86400000),
  ]);
  const [pendingProofs, pendingRefunds] = await Promise.all([
    one(`SELECT COUNT(*) n FROM payment_proofs WHERE status = 'pending'`),
    one(`SELECT COUNT(*) n FROM manual_refunds WHERE status = 'pending'`),
  ]);
  return c.json({ pendingProofs, pendingRefunds, pendingReviews, needsEvidence, openFraud, openDisputes, pendingWithdrawals, approvedWithdrawals, awaitingVerify, byState: byState.results, gmv30, commission30 });
});

// ================= Listing review =================
r.get('/admin/listings', async (c) => {
  requirePerm(c, 'listings.review');
  const status = c.req.query('status') || 'pending_review';
  const { limit, offset } = pageParams(c.req.query());
  const where = status === 'all' ? '1=1' : 'l.status = ?';
  const rows = await c.env.DB.prepare(
    `SELECT l.id, l.platform, l.handle, l.title, l.followers, l.price_cents, l.status, l.fraud_score, l.code_check_status, l.submitted_at, l.reviewer_id,
       r.display_name AS reviewer_name, u.display_name AS seller_name, u.trust_seller,
       (SELECT COUNT(*) FROM fraud_cases f WHERE f.subject_type = 'listing' AND f.subject_id = l.id AND f.status = 'open') AS open_cases
     FROM listings l JOIN users u ON u.id = l.seller_id LEFT JOIN users r ON r.id = l.reviewer_id
     WHERE ${where} ORDER BY l.fraud_score DESC, l.submitted_at ASC LIMIT ? OFFSET ?`,
  ).bind(...(status === 'all' ? [] : [status]), limit, offset).all();
  return c.json({ items: rows.results });
});

r.get('/admin/listings/:id', async (c) => {
  const me = requirePerm(c, 'listings.review');
  const l = await c.env.DB.prepare('SELECT l.*, r.display_name AS reviewer_name FROM listings l LEFT JOIN users r ON r.id = l.reviewer_id WHERE l.id = ?').bind(c.req.param('id')).first<Record<string, any>>();
  if (!l) throw new HttpError(404, 'not_found', 'الإعلان غير موجود.');
  const [evidence, history, cases, seller, sellerListings, sameHandle] = await Promise.all([
    c.env.DB.prepare('SELECT id, kind, r2_key, mime, size, sha256, created_at, (SELECT COUNT(*) FROM listing_evidence o WHERE o.sha256 = e.sha256 AND o.listing_id != e.listing_id) AS reused FROM listing_evidence e WHERE listing_id = ? ORDER BY created_at').bind(l.id).all<Record<string, any>>(),
    c.env.DB.prepare('SELECT h.action, h.note, h.created_at, u.display_name AS actor FROM listing_reviews h LEFT JOIN users u ON u.id = h.actor_id WHERE h.listing_id = ? ORDER BY h.created_at').bind(l.id).all(),
    c.env.DB.prepare(`SELECT * FROM fraud_cases WHERE subject_type = 'listing' AND subject_id = ? ORDER BY created_at DESC`).bind(l.id).all(),
    c.env.DB.prepare('SELECT id, display_name, email, created_at, trust_seller, trust_buyer, chat_violations, status, trust_breakdown FROM users WHERE id = ?').bind(l.seller_id).first(),
    c.env.DB.prepare('SELECT id, title, status, created_at FROM listings WHERE seller_id = ? AND id != ? ORDER BY created_at DESC LIMIT 20').bind(l.seller_id, l.id).all(),
    c.env.DB.prepare('SELECT l.id, l.status, l.seller_id, u.display_name AS seller_name, l.created_at FROM listings l JOIN users u ON u.id = l.seller_id WHERE l.platform = ? AND l.handle_normalized = ? AND l.id != ?').bind(l.platform, l.handle_normalized, l.id).all(),
  ]);
  // Evidence URLs are only minted for the reviewer who has claimed this listing.
  const claimedByMe = l.reviewer_id === me.id;
  const ev = [];
  for (const e of evidence.results) {
    const { r2_key, ...rest } = e;
    ev.push({ ...rest, url: claimedByMe ? await signFileUrl(c.env, { k: r2_key, u: me.id, c: `listing:${l.id}` }) : null });
  }
  if (claimedByMe) await audit(c.env, { actorId: me.id, action: 'evidence.urls_issued', subjectType: 'listing', subjectId: l.id, details: { count: ev.length } });
  return c.json({ listing: { ...l, fraud_flags: parseJson(l.fraud_flags, []) }, evidence: ev, claimedByMe, history: history.results, fraudCases: cases.results, seller, sellerListings: sellerListings.results, sameHandle: sameHandle.results });
});

r.post('/admin/listings/:id/claim', async (c) => {
  const me = requirePerm(c, 'listings.review');
  const id = c.req.param('id');
  const l = await c.env.DB.prepare('SELECT seller_id FROM listings WHERE id = ?').bind(id).first<{ seller_id: string }>();
  if (l?.seller_id === me.id) throw new HttpError(403, 'conflict_of_interest', 'لا يمكنك مراجعة إعلانك.');
  const res = await c.env.DB.prepare(`UPDATE listings SET reviewer_id = ?, reviewer_claimed_at = ? WHERE id = ? AND status IN ('pending_review','needs_evidence') AND (reviewer_id IS NULL OR reviewer_id = ?)`)
    .bind(me.id, now(), id, me.id).run();
  if ((res.meta.changes ?? 0) !== 1) throw new HttpError(409, 'claimed', 'الإعلان محجوز لمراجع آخر أو ليس في قائمة المراجعة.');
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO listing_reviews (id, listing_id, actor_id, action, note, created_at) VALUES (?,?,?,?,?,?)').bind(newId('lrv'), id, me.id, 'claim', null, now()),
    auditStmt(c.env, { actorId: me.id, action: 'listing.claim', subjectType: 'listing', subjectId: id }),
  ]);
  return c.json({ ok: true });
});

r.post('/admin/listings/:id/unclaim', async (c) => {
  const me = requirePerm(c, 'listings.review');
  const id = c.req.param('id');
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE listings SET reviewer_id = NULL, reviewer_claimed_at = NULL WHERE id = ? AND (reviewer_id = ? OR ?)').bind(id, me.id, can(me.role, 'users.manage') ? 1 : 0),
    c.env.DB.prepare('INSERT INTO listing_reviews (id, listing_id, actor_id, action, note, created_at) VALUES (?,?,?,?,?,?)').bind(newId('lrv'), id, me.id, 'unclaim', null, now()),
    auditStmt(c.env, { actorId: me.id, action: 'listing.unclaim', subjectType: 'listing', subjectId: id }),
  ]);
  return c.json({ ok: true });
});

r.post('/admin/listings/:id/decision', async (c) => {
  const me = requirePerm(c, 'listings.review');
  const b = await body(c.req, z.object({
    action: z.enum(['approve', 'reject', 'request_evidence']),
    note: cleanText(5, 2000, 'اكتب ملاحظة للبائع (5 أحرف على الأقل)'),
    observedFollowers: z.number().int().min(0).optional(),
    codeVerified: z.boolean().optional(),
    stepsChecked: z.boolean().optional(),
  }));
  const l = await c.env.DB.prepare('SELECT * FROM listings WHERE id = ?').bind(c.req.param('id')).first<Record<string, any>>();
  if (!l) throw new HttpError(404, 'not_found', 'الإعلان غير موجود.');
  if (l.reviewer_id !== me.id) throw new HttpError(403, 'not_claimed', 'يجب حجز الإعلان للمراجعة أولًا.');
  if (l.status !== 'pending_review' && !(l.status === 'needs_evidence' && b.action === 'reject')) throw new HttpError(409, 'not_pending', 'الإعلان ليس بانتظار قرار.');
  const t = now();
  const stmts: D1PreparedStatement[] = [];
  let status: string;
  if (b.action === 'approve') {
    const open = await c.env.DB.prepare(`SELECT COUNT(*) n FROM fraud_cases WHERE subject_type = 'listing' AND subject_id = ? AND status = 'open'`).bind(l.id).first<{ n: number }>();
    if (l.code_check_status === 'pending') throw new HttpError(409, 'checks_pending', 'الفحوص الآلية لم تكتمل بعد. انتظر لحظات ثم أعد المحاولة.');
    if ((open?.n ?? 0) > 0) throw new HttpError(409, 'open_fraud_case', 'توجد حالة اشتباه مفتوحة على هذا الإعلان. عالجها في قائمة الاحتيال أولًا.');
    if (!b.codeVerified) throw new HttpError(400, 'code_unverified', 'يجب التأكد بنفسك من ظهور رمز التحقق على الحساب.');
    if (!b.stepsChecked) throw new HttpError(400, 'checklist', 'أكمل قائمة التحقق قبل الاعتماد.');
    if (b.observedFollowers === undefined) throw new HttpError(400, 'observed_required', 'أدخل عدد المتابعين كما يظهر في لقطة الإحصاءات.');
    const deviation = Math.abs(b.observedFollowers - l.followers) / Math.max(1, l.followers);
    if (deviation > 0.1) {
      // Claimed stats don't match the evidence: open a case and refuse to approve.
      await c.env.DB.batch([
        c.env.DB.prepare(`INSERT INTO fraud_cases (id, subject_type, subject_id, reason, severity, details, created_at) VALUES (?,?,?,?,?,?,?)`)
          .bind(newId('frd'), 'listing', l.id, `عدم تطابق عدد المتابعين: المُعلن ${l.followers} مقابل ${b.observedFollowers} في لقطة الإحصاءات`, 'high', JSON.stringify({ claimed: l.followers, observed: b.observedFollowers, reviewer: me.id }), t),
        c.env.DB.prepare('UPDATE listings SET reviewer_observed_followers = ? WHERE id = ?').bind(b.observedFollowers, l.id),
        auditStmt(c.env, { actorId: me.id, action: 'listing.stats_mismatch', subjectType: 'listing', subjectId: l.id, details: { claimed: l.followers, observed: b.observedFollowers } }),
      ]);
      throw new HttpError(409, 'stats_mismatch', `فرق ${Math.round(deviation * 100)}% بين الأرقام المعلنة واللقطة. تم فتح حالة اشتباه ولا يمكن الاعتماد.`);
    }
    status = 'approved';
    stmts.push(c.env.DB.prepare(`UPDATE listings SET status = 'approved', approved_at = ?, review_note = ?, reviewer_observed_followers = ?, code_check_status = CASE WHEN code_check_status = 'found' THEN 'found' ELSE code_check_status END, updated_at = ? WHERE id = ?`)
      .bind(t, b.note, b.observedFollowers, t, l.id));
  } else if (b.action === 'reject') {
    status = 'rejected';
    stmts.push(c.env.DB.prepare(`UPDATE listings SET status = 'rejected', review_note = ?, updated_at = ? WHERE id = ?`).bind(b.note, t, l.id));
  } else {
    status = 'needs_evidence';
    stmts.push(c.env.DB.prepare(`UPDATE listings SET status = 'needs_evidence', review_note = ?, updated_at = ? WHERE id = ?`).bind(b.note, t, l.id));
  }
  const titles = { approved: 'تم نشر إعلانك', rejected: 'تم رفض إعلانك', needs_evidence: 'مطلوب أدلة إضافية لإعلانك' } as Record<string, string>;
  stmts.push(
    c.env.DB.prepare('INSERT INTO listing_reviews (id, listing_id, actor_id, action, note, created_at) VALUES (?,?,?,?,?,?)').bind(newId('lrv'), l.id, me.id, b.action, b.note, t),
    notifyStmt(c.env, l.seller_id, titles[status], b.note, `/sell/${l.id}`),
    auditStmt(c.env, { actorId: me.id, action: `listing.${b.action}`, subjectType: 'listing', subjectId: l.id, details: { observedFollowers: b.observedFollowers }, ip: clientIp(c.req.raw) }),
  );
  await c.env.DB.batch(stmts);
  await c.env.VERIFY_QUEUE.send({ type: 'recompute_trust', userId: l.seller_id }).catch(() => {});
  return c.json({ ok: true, status });
});

// ================= Fraud queue =================
r.get('/admin/fraud', async (c) => {
  requirePerm(c, 'fraud.manage');
  const status = c.req.query('status') || 'open';
  const rows = await c.env.DB.prepare(
    `SELECT f.*, CASE f.subject_type WHEN 'listing' THEN (SELECT title FROM listings WHERE id = f.subject_id)
       WHEN 'user' THEN (SELECT display_name FROM users WHERE id = f.subject_id)
       WHEN 'deal' THEN (SELECT l.title FROM deals d JOIN listings l ON l.id = d.listing_id WHERE d.id = f.subject_id) END AS subject_label,
       r.display_name AS resolver_name
     FROM fraud_cases f LEFT JOIN users r ON r.id = f.resolved_by WHERE ${status === 'all' ? '1=1' : 'f.status = ?'}
     ORDER BY CASE f.severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, f.created_at DESC LIMIT 200`,
  ).bind(...(status === 'all' ? [] : [status])).all();
  return c.json({ items: rows.results.map((x: any) => ({ ...x, details: parseJson(x.details, null) })) });
});

r.post('/admin/fraud/:id/resolve', async (c) => {
  const me = requirePerm(c, 'fraud.manage');
  const b = await body(c.req, z.object({
    outcome: z.enum(['cleared', 'actioned']),
    note: cleanText(5, 2000),
    rejectListing: z.boolean().optional(),
    suspendUser: z.boolean().optional(),
  }));
  const f = await c.env.DB.prepare('SELECT * FROM fraud_cases WHERE id = ?').bind(c.req.param('id')).first<{ id: string; subject_type: string; subject_id: string; status: string }>();
  if (!f) throw new HttpError(404, 'not_found', 'الحالة غير موجودة.');
  if (f.status !== 'open') throw new HttpError(409, 'closed', 'الحالة مغلقة مسبقًا.');
  const t = now();
  const stmts: D1PreparedStatement[] = [
    c.env.DB.prepare('UPDATE fraud_cases SET status = ?, resolved_by = ?, resolved_at = ?, resolution_note = ? WHERE id = ?').bind(b.outcome, me.id, t, b.note, f.id),
    auditStmt(c.env, { actorId: me.id, action: `fraud.${b.outcome}`, subjectType: f.subject_type, subjectId: f.subject_id, details: { case: f.id, rejectListing: b.rejectListing, suspendUser: b.suspendUser } }),
  ];
  if (b.outcome === 'actioned' && b.rejectListing && f.subject_type === 'listing') {
    stmts.push(c.env.DB.prepare(`UPDATE listings SET status = 'rejected', review_note = ?, updated_at = ? WHERE id = ? AND status IN ('pending_review','needs_evidence','approved')`).bind(b.note, t, f.subject_id));
    const l = await c.env.DB.prepare('SELECT seller_id FROM listings WHERE id = ?').bind(f.subject_id).first<{ seller_id: string }>();
    if (l) stmts.push(notifyStmt(c.env, l.seller_id, 'تم رفض إعلانك بعد التحقق', b.note, `/sell/${f.subject_id}`));
  }
  if (b.outcome === 'actioned' && b.suspendUser) {
    if (!can(me.role, 'users.manage')) throw new HttpError(403, 'forbidden', 'إيقاف المستخدمين يتطلب صلاحية إدارة المستخدمين.');
    const uid = f.subject_type === 'user' ? f.subject_id : f.subject_type === 'listing'
      ? (await c.env.DB.prepare('SELECT seller_id FROM listings WHERE id = ?').bind(f.subject_id).first<{ seller_id: string }>())?.seller_id : null;
    if (uid) stmts.push(
      c.env.DB.prepare(`UPDATE users SET status = 'suspended' WHERE id = ? AND role = 'user'`).bind(uid),
      c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(uid),
    );
  }
  await c.env.DB.batch(stmts);
  return c.json({ ok: true });
});

// ================= Deals =================
r.get('/admin/deals', async (c) => {
  requirePerm(c, 'deals.view');
  const state = c.req.query('state');
  const { limit, offset } = pageParams(c.req.query());
  const where = state === 'needs_verify'
    ? `d.escrow_state = 'transfer_in_progress' AND EXISTS (SELECT 1 FROM transfer_steps s WHERE s.deal_id = d.id AND s.step_no = 6 AND s.status = 'active')`
    : state ? 'd.escrow_state = ?' : '1=1';
  const rows = await c.env.DB.prepare(
    `SELECT d.id, d.escrow_state, d.price_cents, d.commission_cents, d.currency, d.created_at, d.updated_at, d.confirm_deadline,
       l.title, l.platform, l.handle, b.display_name AS buyer_name, s.display_name AS seller_name,
       (SELECT MAX(step_no) FROM transfer_steps t WHERE t.deal_id = d.id AND t.status = 'done') AS steps_done
     FROM deals d JOIN listings l ON l.id = d.listing_id JOIN users b ON b.id = d.buyer_id JOIN users s ON s.id = d.seller_id
     WHERE ${where} ORDER BY d.updated_at DESC LIMIT ? OFFSET ?`,
  ).bind(...(state && state !== 'needs_verify' ? [state] : []), limit, offset).all();
  return c.json({ items: rows.results });
});

async function transcript(env: AppEnv['Bindings'], dealId: string, listingId: string, buyerId: string) {
  const conv = await env.DB.prepare('SELECT id FROM conversations WHERE deal_id = ? OR (listing_id = ? AND buyer_id = ?) LIMIT 1').bind(dealId, listingId, buyerId).first<{ id: string }>();
  if (!conv) return { conversationId: null, messages: [] };
  const msgs = await env.DB.prepare(`SELECT m.id, m.sender_id, u.display_name AS sender_name, m.body, m.blocked, m.block_reasons, m.created_at
    FROM messages m LEFT JOIN users u ON u.id = m.sender_id WHERE m.conversation_id = ? ORDER BY m.created_at`).bind(conv.id).all();
  return { conversationId: conv.id, messages: msgs.results };
}

r.get('/admin/deals/:id', async (c) => {
  const me = requirePerm(c, 'deals.view');
  const deal = await getDeal(c.env, c.req.param('id'));
  const view = await loadDealView(c.env, deal, me.id);
  const [chat, auditRows, platform, ledger, disputes] = await Promise.all([
    can(me.role, 'chat.view') ? transcript(c.env, deal.id, deal.listing_id, deal.buyer_id) : Promise.resolve(null),
    c.env.DB.prepare(`SELECT a.action, a.details, a.created_at, u.display_name AS actor FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id WHERE a.subject_type = 'deal' AND a.subject_id = ? ORDER BY a.created_at`).bind(deal.id).all(),
    c.env.DB.prepare('SELECT kind, amount_cents, provider_ref, created_at FROM platform_ledger WHERE deal_id = ? ORDER BY created_at').bind(deal.id).all(),
    c.env.DB.prepare('SELECT kind, amount_cents, available_at, frozen, created_at FROM ledger_entries WHERE deal_id = ? ORDER BY created_at').bind(deal.id).all(),
    c.env.DB.prepare('SELECT id, status, reason_code, resolution, created_at FROM disputes WHERE deal_id = ? ORDER BY created_at').bind(deal.id).all(),
  ]);
  return c.json({ ...view, paymentRef: deal.payment_intent_id, chat, audit: auditRows.results, platformLedger: platform.results, sellerLedger: ledger.results, disputes: disputes.results });
});

// ================= Disputes =================
r.get('/admin/disputes', async (c) => {
  requirePerm(c, 'disputes.manage');
  const status = c.req.query('status') || 'active';
  const where = status === 'active' ? `ds.status != 'resolved'` : status === 'all' ? '1=1' : 'ds.status = ?';
  const rows = await c.env.DB.prepare(
    `SELECT ds.id, ds.deal_id, ds.status, ds.reason_code, ds.created_at, ds.resolution, ds.opened_in_state, d.price_cents, d.currency,
       l.title, o.display_name AS opened_by_name, a.display_name AS assignee_name, ds.assigned_to
     FROM disputes ds JOIN deals d ON d.id = ds.deal_id JOIN listings l ON l.id = d.listing_id JOIN users o ON o.id = ds.opened_by LEFT JOIN users a ON a.id = ds.assigned_to
     WHERE ${where} ORDER BY ds.created_at ASC LIMIT 200`,
  ).bind(...(status === 'active' || status === 'all' ? [] : [status])).all();
  return c.json({ items: rows.results });
});

r.get('/admin/disputes/:id', async (c) => {
  const me = requirePerm(c, 'disputes.manage');
  const d = await loadDispute(c.env, c.req.param('id'));
  const deal = await getDeal(c.env, d.deal_id);
  const [view, events, chat, listingHistory, evidence, assignee] = await Promise.all([
    loadDealView(c.env, deal, me.id),
    disputeEvents(c.env, d.id, me.id),
    transcript(c.env, deal.id, deal.listing_id, deal.buyer_id),
    c.env.DB.prepare('SELECT h.action, h.note, h.created_at, u.display_name AS actor FROM listing_reviews h LEFT JOIN users u ON u.id = h.actor_id WHERE h.listing_id = ? ORDER BY h.created_at').bind(deal.listing_id).all(),
    c.env.DB.prepare('SELECT id, kind, r2_key, mime, size, created_at FROM listing_evidence WHERE listing_id = ?').bind(deal.listing_id).all<Record<string, any>>(),
    d.assigned_to ? c.env.DB.prepare('SELECT display_name FROM users WHERE id = ?').bind(d.assigned_to).first<{ display_name: string }>() : Promise.resolve(null),
  ]);
  const assignedToMe = d.assigned_to === me.id;
  const listingEvidence = [];
  for (const e of evidence.results) {
    const { r2_key, ...rest } = e;
    listingEvidence.push({ ...rest, url: assignedToMe ? await signFileUrl(c.env, { k: r2_key, u: me.id, c: `listing:${deal.listing_id}` }) : null });
  }
  const listing = await c.env.DB.prepare('SELECT verification_code, code_method, code_check_status, reviewer_observed_followers, followers, fraud_score, fraud_flags FROM listings WHERE id = ?').bind(deal.listing_id).first<Record<string, any>>();
  return c.json({ ...view, dispute: d, assignee: assignee?.display_name ?? null, assignedToMe, disputeEvents: events, chat, listingHistory: listingHistory.results, listingEvidence, listingVerification: { ...listing, fraud_flags: parseJson(listing?.fraud_flags, []) } });
});

r.post('/admin/disputes/:id/assign', async (c) => {
  const me = requirePerm(c, 'disputes.manage');
  const d = await loadDispute(c.env, c.req.param('id'));
  if (d.buyer_id === me.id || d.seller_id === me.id) throw new HttpError(403, 'conflict_of_interest', 'لا يمكنك التحكيم في نزاع أنت طرف فيه.');
  if (d.status === 'resolved') throw new HttpError(409, 'resolved', 'النزاع مغلق.');
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE disputes SET assigned_to = ? WHERE id = ?').bind(me.id, d.id),
    c.env.DB.prepare('INSERT INTO dispute_events (id, dispute_id, actor_id, kind, body, created_at) VALUES (?,?,?,?,?,?)').bind(newId('dev'), d.id, me.id, 'assign', 'تولى المحكّم النزاع', now()),
    auditStmt(c.env, { actorId: me.id, action: 'dispute.assign', subjectType: 'dispute', subjectId: d.id }),
  ]);
  return c.json({ ok: true });
});

r.post('/admin/disputes/:id/request-evidence', async (c) => {
  const me = requirePerm(c, 'disputes.manage');
  const d = await loadDispute(c.env, c.req.param('id'));
  if (d.assigned_to !== me.id) throw new HttpError(403, 'not_assigned', 'تولَّ النزاع أولًا.');
  if (d.status === 'resolved') throw new HttpError(409, 'resolved', 'النزاع مغلق.');
  const b = await body(c.req, z.object({ body: cleanText(10, 2000), from: z.enum(['buyer', 'seller', 'both']) }));
  const targets = b.from === 'both' ? [d.buyer_id, d.seller_id] : [b.from === 'buyer' ? d.buyer_id : d.seller_id];
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE disputes SET status = 'awaiting_evidence' WHERE id = ?`).bind(d.id),
    c.env.DB.prepare('INSERT INTO dispute_events (id, dispute_id, actor_id, kind, body, created_at) VALUES (?,?,?,?,?,?)').bind(newId('dev'), d.id, me.id, 'request_evidence', `${b.from === 'both' ? 'للطرفين' : b.from === 'buyer' ? 'للمشتري' : 'للبائع'}: ${b.body}`, now()),
    ...targets.map((t) => notifyStmt(c.env, t, 'المحكّم يطلب أدلة إضافية', b.body, `/disputes/${d.id}`)),
    auditStmt(c.env, { actorId: me.id, action: 'dispute.request_evidence', subjectType: 'dispute', subjectId: d.id, details: { from: b.from } }),
  ]);
  return c.json({ ok: true });
});

r.post('/admin/disputes/:id/note', async (c) => {
  const me = requirePerm(c, 'disputes.manage');
  const d = await loadDispute(c.env, c.req.param('id'));
  const b = await body(c.req, z.object({ body: cleanText(3, 2000) }));
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO dispute_events (id, dispute_id, actor_id, kind, body, created_at) VALUES (?,?,?,?,?,?)').bind(newId('dev'), d.id, me.id, 'note', b.body, now()),
    auditStmt(c.env, { actorId: me.id, action: 'dispute.note', subjectType: 'dispute', subjectId: d.id }),
  ]);
  return c.json({ ok: true });
});

r.post('/admin/disputes/:id/resolve', async (c) => {
  const me = requirePerm(c, 'disputes.manage');
  const ip = clientIp(c.req.raw);
  const b = await body(c.req, z.object({
    action: z.enum(['refund', 'release', 'split', 'resume']),
    buyerRefundCents: z.number().int().min(1).optional(),
    note: cleanText(10, 3000, 'اكتب مسوغات القرار (10 أحرف على الأقل)'),
  }));
  const d = await loadDispute(c.env, c.req.param('id'));
  if (d.assigned_to !== me.id) throw new HttpError(403, 'not_assigned', 'تولَّ النزاع أولًا.');
  if (d.status === 'resolved') throw new HttpError(409, 'resolved', 'تم الفصل مسبقًا.');
  const deal = await getDeal(c.env, d.deal_id);
  if (deal.escrow_state !== 'disputed') throw new HttpError(409, 'not_disputed', 'حالة الضمان لا تسمح بالفصل.');
  const s = await getSettings(c.env);
  const dispRow = await c.env.DB.prepare('SELECT opened_in_state FROM disputes WHERE id = ?').bind(d.id).first<{ opened_in_state: string }>();
  const postRelease = dispRow?.opened_in_state === 'released';
  const t = now();
  const closeDispute = (g: import('../lib/escrow').Guard, refundCents: number | null) => [
    g.update(`UPDATE disputes SET status = 'resolved', resolution = ?, buyer_refund_cents = ?, resolved_by = ?, resolved_at = ?, resolution_note = ? WHERE id = ?`, b.action, refundCents, me.id, t, b.note, d.id),
    g.insert('dispute_events', { id: newId('dev'), dispute_id: d.id, actor_id: me.id, kind: 'resolve', body: b.note, created_at: t }),
    g.notify(deal.buyer_id, 'صدر قرار النزاع', b.note, `/disputes/${d.id}`),
    g.notify(deal.seller_id, 'صدر قرار النزاع', b.note, `/disputes/${d.id}`),
  ];

  if (b.action === 'refund') {
    const rf = await refundDeal(c.env, deal, deal.price_cents, `dispute:${d.id}`);
    const ref = rf.ref;
    await transition(c.env, deal, 'refunded', {
      actorId: me.id, reason: `قرار تحكيم: رد كامل المبلغ للمشتري`, set: { closed_at: t }, ip,
      effects: (g) => [
        ...closeDispute(g, deal.price_cents),
        ...rf.effects(g),
        g.insert('platform_ledger', { id: newId('pl'), deal_id: deal.id, kind: 'refund', amount_cents: -deal.price_cents, provider_ref: ref, created_at: t }),
        g.update(`UPDATE listings SET status = 'withdrawn', updated_at = ? WHERE id = ?`, t, deal.listing_id),
        g.update(`UPDATE transfer_secrets SET ciphertext = NULL, iv = NULL, destroyed_at = ? WHERE deal_id = ? AND ciphertext IS NOT NULL`, t, deal.id),
        ...(postRelease ? [
          // Reverse seller proceeds (still frozen in reclaim hold) and the commission.
          g.insert('ledger_entries', { id: newId('led'), user_id: deal.seller_id, deal_id: deal.id, withdrawal_id: null, kind: 'reclaim_reversal', amount_cents: -deal.seller_net_cents, available_at: t, frozen: 0, memo: 'عكس عائد صفقة بقرار تحكيم', created_at: t }),
          g.update(`UPDATE ledger_entries SET frozen = 0 WHERE deal_id = ? AND amount_cents > 0`, deal.id),
          g.insert('platform_ledger', { id: newId('pl'), deal_id: deal.id, kind: 'commission_reversal', amount_cents: -deal.commission_cents, provider_ref: null, created_at: t }),
        ] : []),
      ],
    });
  } else if (b.action === 'release') {
    await transition(c.env, deal, 'released', {
      actorId: me.id, reason: 'قرار تحكيم: تحرير المبلغ للبائع', set: { released_at: deal.released_at ?? t, closed_at: t }, ip,
      effects: (g) => [
        ...closeDispute(g, 0),
        ...(postRelease
          ? [g.update(`UPDATE ledger_entries SET frozen = 0 WHERE deal_id = ? AND amount_cents > 0`, deal.id)]
          : releaseEffects(g, deal, s.escrow.reclaim_hold_days)),
      ],
    });
  } else if (b.action === 'split') {
    if (postRelease) throw new HttpError(400, 'split_unavailable', 'التقسيم غير متاح لنزاعات ما بعد التحرير. اختر الرد أو التحرير.');
    if (!b.buyerRefundCents || b.buyerRefundCents >= deal.price_cents) throw new HttpError(400, 'bad_split', 'حدد مبلغًا للمشتري أقل من سعر الصفقة.');
    const sellerGross = deal.price_cents - b.buyerRefundCents;
    const commission = Math.round((sellerGross * deal.commission_bp) / 10000);
    const rf = await refundDeal(c.env, deal, b.buyerRefundCents, `dispute_split:${d.id}`);
    const ref = rf.ref;
    await transition(c.env, deal, 'split', {
      actorId: me.id, reason: `قرار تحكيم: تقسيم (${(b.buyerRefundCents / 100).toFixed(2)} للمشتري)`, set: { released_at: t, closed_at: t }, ip,
      effects: (g) => [
        ...closeDispute(g, b.buyerRefundCents!),
        ...rf.effects(g),
        g.insert('platform_ledger', { id: newId('pl'), deal_id: deal.id, kind: 'refund', amount_cents: -b.buyerRefundCents!, provider_ref: ref, created_at: t }),
        ...releaseEffects(g, deal, s.escrow.reclaim_hold_days, sellerGross, commission, 'dispute_split'),
      ],
    });
  } else {
    // Resume: dismiss the dispute and return the deal to the stage it was in.
    const back = dispRow!.opened_in_state as DealRow['escrow_state'];
    if (back === 'released') throw new HttpError(400, 'use_release', 'لنزاع ما بعد التحرير استخدم «تحرير للبائع».');
    await transition(c.env, deal, back, {
      actorId: me.id, reason: 'قرار تحكيم: رفض النزاع واستئناف الصفقة', ip,
      set: back === 'buyer_confirmation_window' ? { confirm_deadline: t + s.escrow.confirmation_window_hours * 3600_000 } : {},
      effects: (g) => closeDispute(g, null),
    });
  }
  await c.env.TRANSFER_QUEUE.send({ type: 'recompute_trust', userId: deal.buyer_id }).catch(() => {});
  await c.env.TRANSFER_QUEUE.send({ type: 'recompute_trust', userId: deal.seller_id }).catch(() => {});
  return c.json({ ok: true });
});

// ================= Withdrawals =================
r.get('/admin/withdrawals', async (c) => {
  requirePerm(c, 'withdrawals.manage');
  const status = c.req.query('status') || 'pending_review';
  const rows = await c.env.DB.prepare(
    `SELECT w.id, w.user_id, w.amount_cents, w.status, w.payout_hint, w.auto_approved, w.payout_ref, w.note, w.created_at, w.reviewed_at,
       u.display_name, u.email, u.trust_seller, r.display_name AS reviewer_name,
       (SELECT COUNT(*) FROM fraud_cases f WHERE f.subject_type = 'user' AND f.subject_id = w.user_id AND f.status = 'open') AS open_cases
     FROM withdrawals w JOIN users u ON u.id = w.user_id LEFT JOIN users r ON r.id = w.reviewed_by
     WHERE ${status === 'all' ? '1=1' : 'w.status = ?'} ORDER BY w.created_at ASC LIMIT 200`,
  ).bind(...(status === 'all' ? [] : [status])).all();
  return c.json({ items: rows.results });
});

r.post('/admin/withdrawals/:id/payout-details', async (c) => {
  const me = requirePerm(c, 'withdrawals.manage');
  const w = await c.env.DB.prepare('SELECT * FROM withdrawals WHERE id = ?').bind(c.req.param('id')).first<Record<string, any>>();
  if (!w) throw new HttpError(404, 'not_found', 'غير موجود.');
  if (w.status !== 'approved') throw new HttpError(409, 'not_approved', 'تُعرض بيانات التحويل للطلبات المعتمدة فقط.');
  if (w.user_id === me.id) throw new HttpError(403, 'conflict_of_interest', 'لا يمكنك معالجة سحبك.');
  const { dek } = requireKeys(c.env);
  const details = JSON.parse(await decryptText(dek, `payout:${w.id}`, w.payout_ciphertext, w.payout_iv));
  await audit(c.env, { actorId: me.id, action: 'withdrawal.payout_details_viewed', subjectType: 'withdrawal', subjectId: w.id });
  c.header('Cache-Control', 'no-store');
  return c.json(details);
});

r.post('/admin/withdrawals/:id/decision', async (c) => {
  const me = requirePerm(c, 'withdrawals.manage');
  const b = await body(c.req, z.object({ action: z.enum(['approve', 'reject', 'mark_paid']), note: cleanText(0, 1000).optional(), payoutRef: cleanText(3, 120).optional() }));
  const w = await c.env.DB.prepare('SELECT * FROM withdrawals WHERE id = ?').bind(c.req.param('id')).first<Record<string, any>>();
  if (!w) throw new HttpError(404, 'not_found', 'غير موجود.');
  if (w.user_id === me.id) throw new HttpError(403, 'conflict_of_interest', 'لا يمكنك معالجة سحبك.');
  const t = now();
  const from = b.action === 'mark_paid' ? 'approved' : 'pending_review';
  if (w.status !== from && !(b.action === 'reject' && w.status === 'approved')) throw new HttpError(409, 'bad_state', 'حالة الطلب لا تسمح بهذا الإجراء.');
  if (b.action === 'mark_paid' && !b.payoutRef) throw new HttpError(400, 'ref_required', 'أدخل مرجع التحويل البنكي.');
  if (b.action === 'reject' && !b.note) throw new HttpError(400, 'note_required', 'اذكر سبب الرفض.');
  const status = b.action === 'approve' ? 'approved' : b.action === 'reject' ? 'rejected' : 'paid';
  const stmts: D1PreparedStatement[] = [
    c.env.DB.prepare('UPDATE withdrawals SET status = ?, reviewed_by = ?, reviewed_at = ?, note = COALESCE(?, note), payout_ref = COALESCE(?, payout_ref) WHERE id = ? AND status = ?')
      .bind(status, me.id, t, b.note ?? null, b.payoutRef ?? null, w.id, w.status),
  ];
  if (status === 'rejected') {
    // Return reserved funds to the available balance.
    stmts.push(c.env.DB.prepare(`INSERT INTO ledger_entries (id, user_id, withdrawal_id, kind, amount_cents, available_at, memo, created_at) SELECT ?,?,?,?,?,?,?,? WHERE changes() = 1`)
      .bind(newId('led'), w.user_id, w.id, 'withdrawal_reversal', w.amount_cents, t, 'إعادة مبلغ سحب مرفوض', t));
  }
  stmts.push(
    notifyStmt(c.env, w.user_id, status === 'approved' ? 'تمت الموافقة على طلب السحب' : status === 'paid' ? 'تم تحويل مبلغ السحب' : 'رُفض طلب السحب', b.note || (b.payoutRef ? `مرجع التحويل: ${b.payoutRef}` : 'راجع محفظتك.'), '/wallet'),
    auditStmt(c.env, { actorId: me.id, action: `withdrawal.${b.action}`, subjectType: 'withdrawal', subjectId: w.id, details: { amount: w.amount_cents, ref: b.payoutRef } }),
  );
  const res = await c.env.DB.batch(stmts);
  if ((res[0].meta.changes ?? 0) !== 1) throw new HttpError(409, 'conflict', 'تغيّرت حالة الطلب. حدّث الصفحة.');
  return c.json({ ok: true, status });
});

// ================= Local payments: transfer verification & manual refunds =================
r.get('/admin/payments', async (c) => {
  const me = requirePerm(c, 'withdrawals.manage');
  const status = c.req.query('status') || 'pending';
  const rows = await c.env.DB.prepare(
    `SELECT p.id, p.deal_id, p.transfer_ref, p.status, p.review_note, p.created_at, p.reviewed_at, p.receipt_key,
       d.pay_amount, d.pay_currency, d.price_cents, d.fx_rate, d.escrow_state, d.payment_expires_at, l.title, l.handle,
       b.display_name AS buyer_name, r.display_name AS reviewer_name
     FROM payment_proofs p JOIN deals d ON d.id = p.deal_id JOIN listings l ON l.id = d.listing_id JOIN users b ON b.id = d.buyer_id
     LEFT JOIN users r ON r.id = p.reviewed_by WHERE ${status === 'all' ? '1=1' : 'p.status = ?'} ORDER BY p.created_at ASC LIMIT 200`,
  ).bind(...(status === 'all' ? [] : [status])).all<Record<string, any>>();
  const items = [];
  for (const x of rows.results) {
    const { receipt_key, ...rest } = x;
    items.push({ ...rest, reference: String(x.deal_id).slice(-8).toUpperCase(), receipt_url: await signFileUrl(c.env, { k: receipt_key, u: me.id, c: `proof:${x.id}` }) });
  }
  const st = await getSettings(c.env);
  return c.json({ items, platformRip: st.payments.platform_rip });
});

r.post('/admin/payments/:id/decision', async (c) => {
  const me = requirePerm(c, 'withdrawals.manage');
  const b = await body(c.req, z.object({ action: z.enum(['confirm', 'reject']), note: cleanText(3, 1000, 'اكتب ملاحظة (3 أحرف على الأقل)') }));
  const p = await c.env.DB.prepare('SELECT * FROM payment_proofs WHERE id = ?').bind(c.req.param('id')).first<Record<string, any>>();
  if (!p) throw new HttpError(404, 'not_found', 'غير موجود.');
  if (p.status !== 'pending') throw new HttpError(409, 'reviewed', 'تمت مراجعة هذا الإثبات مسبقًا.');
  const deal = await getDeal(c.env, p.deal_id);
  if (deal.buyer_id === me.id || deal.seller_id === me.id) throw new HttpError(403, 'conflict_of_interest', 'لا يمكنك مراجعة دفعة في صفقة أنت طرف فيها.');
  const t = now();
  if (b.action === 'confirm') {
    if (deal.escrow_state !== 'pending_payment') throw new HttpError(409, 'not_pending', 'الصفقة لم تعد بانتظار الدفع.');
    await markHeld(c.env, deal, `baridimob:${p.transfer_ref}`, me.id, (g) => [
      g.update(`UPDATE payment_proofs SET status = 'confirmed', reviewed_by = ?, reviewed_at = ?, review_note = ? WHERE id = ? AND status = 'pending'`, me.id, t, b.note, p.id),
      g.audit(me.id, 'payment.proof_confirmed', { proof: p.id, ref: p.transfer_ref }, clientIp(c.req.raw)),
    ]);
  } else {
    await c.env.DB.batch([
      c.env.DB.prepare(`UPDATE payment_proofs SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, review_note = ? WHERE id = ? AND status = 'pending'`).bind(me.id, t, b.note, p.id),
      notifyStmt(c.env, deal.buyer_id, 'لم يُقبل إثبات التحويل', b.note, `/deals/${deal.id}`),
      auditStmt(c.env, { actorId: me.id, action: 'payment.proof_rejected', subjectType: 'deal', subjectId: deal.id, details: { proof: p.id } }),
    ]);
  }
  return c.json({ ok: true });
});

r.get('/admin/refunds', async (c) => {
  requirePerm(c, 'withdrawals.manage');
  const status = c.req.query('status') || 'pending';
  const rows = await c.env.DB.prepare(
    `SELECT m.*, l.title, b.display_name AS buyer_name, b.email AS buyer_email, e.display_name AS executed_by_name,
       (SELECT p.id FROM payment_proofs p WHERE p.deal_id = m.deal_id AND p.status = 'confirmed' LIMIT 1) AS proof_id
     FROM manual_refunds m JOIN deals d ON d.id = m.deal_id JOIN listings l ON l.id = d.listing_id JOIN users b ON b.id = d.buyer_id
     LEFT JOIN users e ON e.id = m.executed_by WHERE ${status === 'all' ? '1=1' : 'm.status = ?'} ORDER BY m.created_at ASC LIMIT 200`,
  ).bind(...(status === 'all' ? [] : [status])).all();
  return c.json({ items: rows.results });
});

r.post('/admin/refunds/:id/destination', async (c) => {
  const me = requirePerm(c, 'withdrawals.manage');
  const m = await c.env.DB.prepare('SELECT deal_id FROM manual_refunds WHERE id = ?').bind(c.req.param('id')).first<{ deal_id: string }>();
  if (!m) throw new HttpError(404, 'not_found', 'غير موجود.');
  const p = await c.env.DB.prepare(`SELECT id, refund_ciphertext, refund_iv FROM payment_proofs WHERE deal_id = ? AND refund_ciphertext IS NOT NULL ORDER BY created_at DESC LIMIT 1`).bind(m.deal_id).first<Record<string, string>>();
  if (!p) return c.json({ rip: null, note: 'الدفع تم بالبطاقة عبر Chargily: نفّذ الاسترداد من لوحة Chargily ثم سجّل المرجع.' });
  const { dek } = requireKeys(c.env);
  const rip = await decryptText(dek, `refund-rip:${p.id}`, p.refund_ciphertext, p.refund_iv);
  await audit(c.env, { actorId: me.id, action: 'refund.destination_viewed', subjectType: 'deal', subjectId: m.deal_id });
  c.header('Cache-Control', 'no-store');
  return c.json({ rip });
});

r.post('/admin/refunds/:id/done', async (c) => {
  const me = requirePerm(c, 'withdrawals.manage');
  const b = await body(c.req, z.object({ reference: cleanText(3, 120, 'أدخل مرجع عملية الاسترداد') }));
  const m = await c.env.DB.prepare('SELECT * FROM manual_refunds WHERE id = ?').bind(c.req.param('id')).first<Record<string, any>>();
  if (!m) throw new HttpError(404, 'not_found', 'غير موجود.');
  const deal = await getDeal(c.env, m.deal_id);
  const t = now();
  const res = await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE manual_refunds SET status = 'done', executed_by = ?, executed_at = ?, reference = ? WHERE id = ? AND status = 'pending'`).bind(me.id, t, b.reference, m.id),
    c.env.DB.prepare(`UPDATE platform_ledger SET provider_ref = ? WHERE deal_id = ? AND provider_ref = ?`).bind(`manual-done:${b.reference}`, m.deal_id, `manual:${m.id}`),
    notifyStmt(c.env, deal.buyer_id, 'تم تنفيذ الاسترداد', `أُعيد لك مبلغ ${m.amount} ${m.currency === 'DZD' ? 'دج' : m.currency}. مرجع العملية: ${b.reference}`, `/deals/${deal.id}`),
    auditStmt(c.env, { actorId: me.id, action: 'refund.manual_executed', subjectType: 'deal', subjectId: deal.id, details: { refund: m.id, ref: b.reference } }),
  ]);
  if ((res[0].meta.changes ?? 0) !== 1) throw new HttpError(409, 'done', 'تم تنفيذ هذا الاسترداد مسبقًا.');
  return c.json({ ok: true });
});

// ================= Users & roles =================
r.get('/admin/users', async (c) => {
  requirePerm(c, 'users.manage');
  const q = (c.req.query('q') || '').trim().slice(0, 80);
  const role = c.req.query('role');
  const { limit, offset } = pageParams(c.req.query());
  const where: string[] = ['1=1'];
  const binds: unknown[] = [];
  if (q) { where.push(`(email LIKE ? ESCAPE '\\' OR display_name LIKE ? ESCAPE '\\' OR id = ?)`); const t = `%${q.replace(/[%_\\]/g, (m) => '\\' + m)}%`; binds.push(t, t, q); }
  if (role && (ROLES as readonly string[]).includes(role)) { where.push('role = ?'); binds.push(role); }
  const rows = await c.env.DB.prepare(`SELECT id, email, display_name, role, status, trust_seller, trust_buyer, chat_violations, created_at, last_seen_at FROM users WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .bind(...binds, limit, offset).all();
  return c.json({ items: rows.results });
});

r.get('/admin/users/:id', async (c) => {
  requirePerm(c, 'users.manage');
  const id = c.req.param('id');
  const u = await c.env.DB.prepare('SELECT id, email, display_name, role, status, trust_seller, trust_buyer, trust_breakdown, trust_updated_at, chat_violations, created_at, last_seen_at, failed_logins FROM users WHERE id = ?').bind(id).first<Record<string, any>>();
  if (!u) throw new HttpError(404, 'not_found', 'غير موجود.');
  const [listings, deals, cases, auditRows, blocked] = await Promise.all([
    c.env.DB.prepare('SELECT id, title, status, price_cents, created_at FROM listings WHERE seller_id = ? ORDER BY created_at DESC LIMIT 50').bind(id).all(),
    c.env.DB.prepare('SELECT d.id, d.escrow_state, d.price_cents, d.created_at, CASE WHEN d.buyer_id = ? THEN \'buyer\' ELSE \'seller\' END AS side, l.title FROM deals d JOIN listings l ON l.id = d.listing_id WHERE d.buyer_id = ? OR d.seller_id = ? ORDER BY d.created_at DESC LIMIT 50').bind(id, id, id).all(),
    c.env.DB.prepare(`SELECT * FROM fraud_cases WHERE (subject_type = 'user' AND subject_id = ?) OR (subject_type = 'listing' AND subject_id IN (SELECT id FROM listings WHERE seller_id = ?)) ORDER BY created_at DESC LIMIT 50`).bind(id, id).all(),
    c.env.DB.prepare('SELECT action, subject_type, subject_id, ip, created_at FROM audit_log WHERE actor_id = ? ORDER BY created_at DESC LIMIT 100').bind(id).all(),
    c.env.DB.prepare('SELECT m.body, m.block_reasons, m.created_at, m.conversation_id FROM messages m WHERE m.sender_id = ? AND m.blocked = 1 ORDER BY m.created_at DESC LIMIT 50').bind(id).all(),
  ]);
  return c.json({ user: { ...u, trust_breakdown: parseJson(u.trust_breakdown, null) }, listings: listings.results, deals: deals.results, fraudCases: cases.results, audit: auditRows.results, blockedMessages: blocked.results });
});

r.post('/admin/users/:id/role', async (c) => {
  const me = requirePerm(c, 'users.manage');
  const b = await body(c.req, z.object({ role: z.enum(ROLES) }));
  const id = c.req.param('id');
  if (id === me.id) throw new HttpError(403, 'self', 'لا يمكنك تغيير دورك.');
  const target = await c.env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(id).first<{ role: Role }>();
  if (!target) throw new HttpError(404, 'not_found', 'غير موجود.');
  const elevated = (r: Role) => r === 'admin' || r === 'superadmin';
  if ((elevated(b.role) || elevated(target.role)) && !can(me.role, 'roles.assign')) throw new HttpError(403, 'forbidden', 'تعيين أدوار الإدارة العليا يتطلب مديرًا عامًا.');
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET role = ? WHERE id = ?').bind(b.role, id),
    c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id), // force re-login with new permissions
    auditStmt(c.env, { actorId: me.id, action: 'user.role_change', subjectType: 'user', subjectId: id, details: { from: target.role, to: b.role }, ip: clientIp(c.req.raw) }),
  ]);
  return c.json({ ok: true });
});

r.post('/admin/users/:id/status', async (c) => {
  const me = requirePerm(c, 'users.manage');
  const b = await body(c.req, z.object({ status: z.enum(['active', 'suspended']), note: cleanText(5, 1000) }));
  const id = c.req.param('id');
  if (id === me.id) throw new HttpError(403, 'self', 'لا يمكنك إيقاف نفسك.');
  const target = await c.env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(id).first<{ role: Role }>();
  if (!target) throw new HttpError(404, 'not_found', 'غير موجود.');
  if (target.role !== 'user' && !can(me.role, 'roles.assign')) throw new HttpError(403, 'forbidden', 'إيقاف حسابات الإدارة يتطلب مديرًا عامًا.');
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET status = ? WHERE id = ?').bind(b.status, id),
    ...(b.status === 'suspended' ? [c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id)] : []),
    auditStmt(c.env, { actorId: me.id, action: `user.${b.status === 'suspended' ? 'suspend' : 'reactivate'}`, subjectType: 'user', subjectId: id, details: { note: b.note } }),
  ]);
  return c.json({ ok: true });
});

r.post('/admin/users/:id/recompute-trust', async (c) => {
  requirePerm(c, 'users.manage');
  const { recomputeTrust } = await import('../lib/trust');
  await recomputeTrust(c.env, c.req.param('id'));
  return c.json({ ok: true });
});

// ================= Reports =================
r.get('/admin/reports', async (c) => {
  requirePerm(c, 'reports.view');
  const days = Math.min(365, Math.max(1, Number(c.req.query('days')) || 30));
  const since = now() - days * 86400000;
  const [totals, daily, byPlatform, refunds, withdrawals] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) deals, COALESCE(SUM(price_cents),0) gmv, COALESCE(SUM(commission_cents),0) commission_snapshot FROM deals WHERE escrow_state IN ('released','split') AND released_at > ?`).bind(since).first(),
    c.env.DB.prepare(`SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch') AS day, SUM(CASE WHEN kind IN ('commission','commission_reversal') THEN amount_cents ELSE 0 END) AS commission,
       SUM(CASE WHEN kind = 'refund' THEN -amount_cents ELSE 0 END) AS refunds FROM platform_ledger WHERE created_at > ? GROUP BY day ORDER BY day`).bind(since).all(),
    c.env.DB.prepare(`SELECT l.platform, COUNT(*) n, COALESCE(SUM(d.price_cents),0) gmv FROM deals d JOIN listings l ON l.id = d.listing_id WHERE d.escrow_state IN ('released','split') AND d.released_at > ? GROUP BY l.platform ORDER BY gmv DESC`).bind(since).all(),
    c.env.DB.prepare(`SELECT COUNT(*) n, COALESCE(SUM(-amount_cents),0) amount FROM platform_ledger WHERE kind = 'refund' AND created_at > ?`).bind(since).first(),
    c.env.DB.prepare(`SELECT status, COUNT(*) n, COALESCE(SUM(amount_cents),0) amount FROM withdrawals WHERE created_at > ? GROUP BY status`).bind(since).all(),
  ]);
  const commission = await c.env.DB.prepare(`SELECT COALESCE(SUM(amount_cents),0) n FROM platform_ledger WHERE kind IN ('commission','commission_reversal') AND created_at > ?`).bind(since).first<{ n: number }>();
  return c.json({ days, totals: { ...totals, commission: n(commission?.n) }, daily: daily.results, byPlatform: byPlatform.results, refunds, withdrawals: withdrawals.results });
});

// ================= Audit =================
r.get('/admin/audit', async (c) => {
  requirePerm(c, 'audit.view');
  const q = c.req.query();
  const { limit, offset } = pageParams({ ...q, limit: q.limit || '50' });
  const where: string[] = ['1=1'];
  const binds: unknown[] = [];
  if (q.action) { where.push(`a.action LIKE ? ESCAPE '\\'`); binds.push(`${q.action.slice(0, 60).replace(/[%_\\]/g, (m) => '\\' + m)}%`); }
  if (q.subject) { where.push('a.subject_id = ?'); binds.push(q.subject.slice(0, 64)); }
  if (q.actor) { where.push('a.actor_id = ?'); binds.push(q.actor.slice(0, 64)); }
  const rows = await c.env.DB.prepare(`SELECT a.*, u.display_name AS actor_name, u.role AS actor_role FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id WHERE ${where.join(' AND ')} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`)
    .bind(...binds, limit, offset).all();
  return c.json({ items: rows.results.map((x: any) => ({ ...x, details: parseJson(x.details, null) })), limit, offset });
});

// ================= Settings =================
r.get('/admin/settings', async (c) => {
  requirePerm(c, 'settings.edit');
  const [s, history] = await Promise.all([
    getSettings(c.env),
    c.env.DB.prepare('SELECT h.id, h.created_at, u.display_name AS changed_by FROM settings_history h LEFT JOIN users u ON u.id = h.changed_by ORDER BY h.created_at DESC LIMIT 20').all(),
  ]);
  return c.json({ settings: s, history: history.results });
});

r.put('/admin/settings', async (c) => {
  const me = requirePerm(c, 'settings.edit');
  const next = (await body(c.req, settingsSchema)) as Settings;
  const tiers = [...next.commission.tiers].sort((a, b) => a.min_cents - b.min_cents);
  if (tiers[0].min_cents !== 0) throw new HttpError(400, 'validation', 'يجب أن تبدأ الشريحة الأولى من صفر.', { fields: { 'commission.tiers': 'الشريحة الأولى تبدأ من 0' } });
  next.commission.tiers = tiers;
  const prev = await getSettings(c.env);
  await saveSettings(c.env, next, me.id);
  await audit(c.env, { actorId: me.id, action: 'settings.update', subjectType: 'settings', subjectId: 'global', details: { before: prev, after: next }, ip: clientIp(c.req.raw) });
  return c.json({ ok: true, settings: next });
});

export default r;
