import { Hono } from 'hono';
import { z } from 'zod';
import { computeCommission, DISPUTE_REASONS, normalizeRip, PAYMENT_METHODS, TRANSFER_STEPS, usdCentsToDzd } from '../../../shared/domain';
import type { AppEnv, Env } from '../env';
import { audit, auditStmt, notifyStmt } from '../lib/audit';
import { can, requirePerm, requireUser } from '../lib/auth';
import { decryptText, encryptText, hmacHex } from '../lib/crypto';
import { createStepsEffects, getDeal, partyOf, refundDeal, releaseEffects, transition, type DealRow } from '../lib/escrow';
import { putEncrypted, readUpload, requireKeys } from '../lib/files';
import { assertChargilyConfigured, assertPaymentsConfigured, chargilyMode, chargilyWebhookSecret, createChargilyCheckout, createCheckout, refund, signStripePayload, verifyChargilySignature, verifyStripeSignature } from '../lib/payments';
import { rateLimit } from '../lib/ratelimit';
import { getSettings } from '../lib/settings';
import { verifyTurnstile } from '../lib/turnstile';
import { body, cleanText } from '../lib/validate';
import { clientIp, HOUR, HttpError, newId, now } from '../lib/util';

const r = new Hono<AppEnv>();

// ---------- Purchase ----------
r.post('/listings/:id/buy', async (c) => {
  const u = requireUser(c);
  const ip = clientIp(c.req.raw);
  await rateLimit(c.env, 'buy', u.id, 10, 3600_000);
  const b = await body(c.req, z.object({
    turnstileToken: z.string().max(4096).optional(),
    acceptDisclaimer: z.literal(true, { message: 'يجب الإقرار بإخلاء المسؤولية' }),
    method: z.enum(PAYMENT_METHODS).default('card'),
  }));
  await verifyTurnstile(c.env, b.turnstileToken, ip, 'buy');
  const s = await getSettings(c.env);
  if (!s.flags.purchases_enabled) throw new HttpError(503, 'purchases_disabled', 'الشراء متوقف مؤقتًا.');
  // Each rail must be both enabled by ops and configured on the server.
  if (b.method === 'card') {
    if (!s.payments.card_enabled) throw new HttpError(409, 'method_disabled', 'الدفع بالبطاقة الدولية غير متاح حاليًا.');
    assertPaymentsConfigured(c.env);
  } else if (b.method === 'edahabia' || b.method === 'cib') {
    if (!s.payments.chargily_enabled) throw new HttpError(409, 'method_disabled', 'الدفع بالبطاقة الذهبية / CIB غير متاح حاليًا.');
    assertChargilyConfigured(c.env);
  } else {
    if (!s.payments.baridimob_enabled || !normalizeRip(s.payments.platform_rip)) throw new HttpError(409, 'method_disabled', 'التحويل عبر BaridiMob / CCP غير متاح حاليًا.');
  }
  const l = await c.env.DB.prepare('SELECT * FROM listings WHERE id = ?').bind(c.req.param('id')).first<Record<string, any>>();
  if (!l || l.status !== 'approved') throw new HttpError(409, 'not_available', 'هذا الإعلان غير متاح للشراء حاليًا.');
  if (l.seller_id === u.id) throw new HttpError(403, 'own_listing', 'لا يمكنك شراء إعلانك.');

  const { bp, cents } = computeCommission(l.price_cents, s.commission);
  const id = newId('del');
  const t = now();
  const local = b.method !== 'card';
  const fx = local ? s.payments.usd_to_dzd : null;
  const payAmount = local ? usdCentsToDzd(l.price_cents, fx!) : l.price_cents;
  const provider = b.method === 'card' ? c.env.PAYMENT_PROVIDER : b.method === 'baridimob' ? 'manual' : 'chargily';
  const expiresAt = t + (b.method === 'baridimob' ? s.payments.manual_payment_hours * 3600_000 : s.escrow.payment_timeout_minutes * 60_000);
  // Reserve atomically: the listing flips to "reserved" only if still approved (prevents double purchase).
  const res = await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE listings SET status = 'reserved', updated_at = ? WHERE id = ? AND status = 'approved'`).bind(t, l.id),
    c.env.DB.prepare(
      `INSERT INTO deals (id, listing_id, buyer_id, seller_id, price_cents, commission_bp, commission_cents, seller_net_cents, currency, escrow_state,
        payment_provider, payment_expires_at, created_at, updated_at, payment_method, pay_currency, pay_amount, fx_rate)
       SELECT ?,?,?,?,?,?,?,?,?,'pending_payment',?,?,?,?,?,?,?,? WHERE changes() = 1`,
    ).bind(id, l.id, u.id, l.seller_id, l.price_cents, bp, cents, l.price_cents - cents, l.currency, provider, expiresAt, t, t,
      b.method, local ? 'DZD' : l.currency, payAmount, fx),
  ]);
  if ((res[0].meta.changes ?? 0) !== 1 || (res[1].meta.changes ?? 0) !== 1) throw new HttpError(409, 'not_available', 'سبقك مشترٍ آخر إلى هذا الإعلان.');

  let checkout: { sessionId: string; url: string };
  try {
    checkout = b.method === 'card'
      ? await createCheckout(c.env, { dealId: id, amountCents: l.price_cents, currency: l.currency, title: `${l.title} (@${l.handle})`, buyerEmail: u.email, expiresAt })
      : b.method === 'baridimob'
        ? { sessionId: `bm_${id}`, url: `/deals/${id}` }
        : await createChargilyCheckout(c.env, { dealId: id, amountDzd: payAmount, method: b.method, description: `TrustTransfer — @${l.handle}` });
  } catch (e) {
    // Roll back the reservation so the listing is not stuck.
    await c.env.DB.batch([
      c.env.DB.prepare(`UPDATE deals SET escrow_state = 'cancelled', cancel_reason = 'checkout_failed', closed_at = ?, updated_at = ? WHERE id = ?`).bind(now(), now(), id),
      c.env.DB.prepare(`UPDATE listings SET status = 'approved', updated_at = ? WHERE id = ? AND status = 'reserved'`).bind(now(), l.id),
    ]);
    throw e;
  }
  const conv = await c.env.DB.prepare('SELECT id FROM conversations WHERE listing_id = ? AND buyer_id = ?').bind(l.id, u.id).first<{ id: string }>();
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE deals SET payment_session_id = ? WHERE id = ?').bind(checkout.sessionId, id),
    c.env.DB.prepare('INSERT INTO escrow_events (id, deal_id, from_state, to_state, actor_id, reason, created_at) VALUES (?,?,?,?,?,?,?)')
      .bind(newId('esc'), id, null, 'pending_payment', u.id, 'بدأ المشتري عملية الشراء', t),
    conv
      ? c.env.DB.prepare('UPDATE conversations SET deal_id = ? WHERE id = ?').bind(id, conv.id)
      : c.env.DB.prepare('INSERT INTO conversations (id, listing_id, buyer_id, seller_id, deal_id, created_at) VALUES (?,?,?,?,?,?)').bind(newId('cnv'), l.id, u.id, l.seller_id, id, t),
    auditStmt(c.env, { actorId: u.id, action: 'deal.create', subjectType: 'deal', subjectId: id, details: { listing: l.id, price: l.price_cents, commission_bp: bp, method: b.method, pay_amount: payAmount, fx }, ip }),
  ]);
  return c.json({ dealId: id, checkoutUrl: checkout.url }, 201);
});

// ---------- Payment webhook (Stripe + signed sandbox share one handler) ----------
type StripeEvent = { id: string; type: string; data: { object: Record<string, any> } };

export async function handlePaymentWebhook(env: Env, raw: string, signature: string | null | undefined): Promise<{ status: number; body: unknown }> {
  if (!env.STRIPE_WEBHOOK_SECRET) return { status: 503, body: { error: 'webhook_unconfigured' } };
  if (!(await verifyStripeSignature(env.STRIPE_WEBHOOK_SECRET, raw, signature))) {
    await audit(env, { actorId: null, action: 'webhook.signature_rejected', subjectType: 'webhook' });
    return { status: 400, body: { error: 'invalid_signature' } };
  }
  let event: StripeEvent;
  try { event = JSON.parse(raw); } catch { return { status: 400, body: { error: 'bad_json' } }; }
  // Idempotency: each provider event is applied at most once.
  const ins = await env.DB.prepare('INSERT OR IGNORE INTO webhook_events (id, provider, type, received_at) VALUES (?,?,?,?)')
    .bind(event.id, env.PAYMENT_PROVIDER, event.type, now()).run();
  if ((ins.meta.changes ?? 0) === 0) return { status: 200, body: { duplicate: true } };

  const obj = event.data?.object ?? {};
  const dealId: string | undefined = obj.metadata?.deal_id || obj.client_reference_id;
  if (!dealId) return { status: 200, body: { ignored: true } };
  const deal = await env.DB.prepare('SELECT * FROM deals WHERE id = ?').bind(dealId).first<DealRow>();
  if (!deal) return { status: 200, body: { ignored: 'unknown_deal' } };

  if (event.type === 'checkout.session.completed' && obj.payment_status === 'paid') {
    if (obj.id !== deal.payment_session_id) return { status: 200, body: { ignored: 'session_mismatch' } };
    if (Number(obj.amount_total) !== deal.price_cents || String(obj.currency).toUpperCase() !== deal.currency) {
      await audit(env, { actorId: null, action: 'webhook.amount_mismatch', subjectType: 'deal', subjectId: deal.id, details: { amount: obj.amount_total } });
      return { status: 200, body: { ignored: 'amount_mismatch' } };
    }
    if (deal.escrow_state === 'pending_payment') {
      await markHeld(env, deal, obj.payment_intent ?? null, null);
    } else if (deal.escrow_state === 'cancelled') {
      // Paid after local timeout: refund immediately rather than silently keeping money.
      const ref = await refund(env, { dealId: deal.id, paymentIntentId: obj.payment_intent ?? null, amountCents: deal.price_cents, reason: 'paid_after_cancel' });
      await env.DB.prepare('INSERT INTO platform_ledger (id, deal_id, kind, amount_cents, provider_ref, created_at) VALUES (?,?,?,?,?,?)')
        .bind(newId('pl'), deal.id, 'refund', -deal.price_cents, ref, now()).run();
      await audit(env, { actorId: null, action: 'deal.late_payment_refunded', subjectType: 'deal', subjectId: deal.id });
    }
  } else if (event.type === 'checkout.session.expired' && deal.escrow_state === 'pending_payment') {
    await cancelUnpaid(env, deal, 'payment_expired');
  } else if (event.type === 'charge.dispute.created') {
    // Card chargeback: freeze everything and put it in front of an arbiter.
    await env.DB.prepare(`INSERT INTO fraud_cases (id, subject_type, subject_id, reason, severity, details, created_at) VALUES (?,?,?,?,?,?,?)`)
      .bind(newId('frd'), 'deal', deal.id, 'اعتراض بنكي (Chargeback) على دفعة الصفقة', 'high', JSON.stringify({ event: event.id }), now()).run();
    if (['held', 'transfer_in_progress', 'buyer_confirmation_window', 'released'].includes(deal.escrow_state)) {
      await openDisputeInternal(env, deal, deal.buyer_id, 'payment_issue', 'اعتراض بنكي تلقائي من مزوّد الدفع', null);
    }
  }
  return { status: 200, body: { ok: true } };
}

/** Payment confirmed (card webhook, Chargily webhook, or finance-verified transfer) → funds held in escrow. */
export async function markHeld(env: Env, deal: DealRow, paymentRef: string | null, actorId: string | null, extra: (g: import('../lib/escrow').Guard) => D1PreparedStatement[] = () => []) {
  return transition(env, deal, 'held', {
    actorId, reason: actorId ? 'أكّد الفريق المالي استلام التحويل وحجزه لدى الضمان' : 'تم استلام الدفع وحجزه لدى الضمان',
    set: { payment_intent_id: paymentRef, held_at: now() },
    effects: (g) => [
      ...createStepsEffects(g, deal.id),
      g.notify(deal.seller_id, 'تم الدفع — ابدأ نقل الملكية', 'المبلغ محتجز لدى الضمان. ابدأ الخطوة الأولى من خطوات النقل.'),
      g.notify(deal.buyer_id, 'تم استلام دفعتك', 'المبلغ محتجز بأمان ولن يُحرَّر للبائع قبل اكتمال النقل وتأكيدك.'),
      ...extra(g),
    ],
  });
}

// ---------- Chargily Pay webhook (EDAHABIA / CIB) ----------
export async function handleChargilyWebhook(env: Env, raw: string, signature: string | null | undefined): Promise<{ status: number; body: unknown }> {
  const secret = chargilyWebhookSecret(env);
  if (!secret) return { status: 503, body: { error: 'webhook_unconfigured' } };
  if (!(await verifyChargilySignature(secret, raw, signature))) {
    await audit(env, { actorId: null, action: 'webhook.signature_rejected', subjectType: 'webhook', details: { provider: 'chargily' } });
    return { status: 400, body: { error: 'invalid_signature' } };
  }
  let event: { id: string; type: string; data: Record<string, any> };
  try { event = JSON.parse(raw); } catch { return { status: 400, body: { error: 'bad_json' } }; }
  if (!event?.id || !event.type) return { status: 400, body: { error: 'bad_event' } };
  const ins = await env.DB.prepare('INSERT OR IGNORE INTO webhook_events (id, provider, type, received_at) VALUES (?,?,?,?)')
    .bind(`chargily:${event.id}`, 'chargily', event.type, now()).run();
  if ((ins.meta.changes ?? 0) === 0) return { status: 200, body: { duplicate: true } };
  const co = event.data ?? {};
  const dealId: string | undefined = co.metadata?.deal_id;
  if (!dealId) return { status: 200, body: { ignored: true } };
  const deal = await env.DB.prepare('SELECT * FROM deals WHERE id = ?').bind(dealId).first<DealRow>();
  if (!deal || deal.payment_provider !== 'chargily') return { status: 200, body: { ignored: 'unknown_deal' } };
  if (co.id !== deal.payment_session_id) return { status: 200, body: { ignored: 'session_mismatch' } };

  if (event.type === 'checkout.paid' && co.status === 'paid') {
    if (Number(co.amount) !== deal.pay_amount || String(co.currency).toLowerCase() !== 'dzd') {
      await audit(env, { actorId: null, action: 'webhook.amount_mismatch', subjectType: 'deal', subjectId: deal.id, details: { amount: co.amount, currency: co.currency } });
      return { status: 200, body: { ignored: 'amount_mismatch' } };
    }
    if (deal.escrow_state === 'pending_payment') await markHeld(env, deal, `chargily:${co.id}`, null);
    else if (deal.escrow_state === 'cancelled') {
      // Paid after local timeout: queue a manual refund (Chargily has no refund API) instead of keeping money.
      const mid = newId('mrf');
      await env.DB.batch([
        env.DB.prepare('INSERT INTO manual_refunds (id, deal_id, method, currency, amount, reason, created_at) VALUES (?,?,?,?,?,?,?)')
          .bind(mid, deal.id, deal.payment_method, 'DZD', deal.pay_amount, 'paid_after_cancel', now()),
        env.DB.prepare('INSERT INTO platform_ledger (id, deal_id, kind, amount_cents, provider_ref, created_at) VALUES (?,?,?,?,?,?)')
          .bind(newId('pl'), deal.id, 'refund', -deal.price_cents, `manual:${mid}`, now()),
      ]);
    }
  } else if ((event.type === 'checkout.failed' || event.type === 'checkout.canceled' || event.type === 'checkout.expired') && deal.escrow_state === 'pending_payment') {
    await cancelUnpaid(env, deal, 'payment_expired');
  }
  return { status: 200, body: { ok: true } };
}

export async function cancelUnpaid(env: Env, deal: DealRow, reason: string, actorId: string | null = null) {
  await transition(env, deal, 'cancelled', {
    actorId, reason: reason === 'payment_expired' ? 'انتهت مهلة الدفع' : 'ألغى المشتري قبل الدفع',
    set: { cancel_reason: reason, cancelled_by: actorId, closed_at: now() },
    effects: (g) => [g.update(`UPDATE listings SET status = 'approved', updated_at = ? WHERE id = ? AND status = 'reserved'`, now(), deal.listing_id)],
  });
}

r.post('/webhooks/stripe', async (c) => {
  const raw = await c.req.text();
  const out = await handlePaymentWebhook(c.env, raw, c.req.header('stripe-signature'));
  return c.json(out.body as object, out.status as 200);
});

r.post('/webhooks/chargily', async (c) => {
  const raw = await c.req.text();
  const out = await handleChargilyWebhook(c.env, raw, c.req.header('signature'));
  return c.json(out.body as object, out.status as 200);
});

// Sandbox checkout — local/dev only. Builds a Stripe-shaped event, signs it with the webhook secret and pushes it
// through the exact same verification + handling path as real Stripe webhooks.
r.post('/payments/sandbox/:dealId', async (c) => {
  if (c.env.PAYMENT_PROVIDER !== 'sandbox' || c.env.ENVIRONMENT === 'production') throw new HttpError(404, 'not_found', 'غير متاح.');
  const u = requireUser(c);
  const b = await body(c.req, z.object({ sessionId: z.string().max(100), outcome: z.enum(['success', 'decline', 'expire']) }));
  const deal = await getDeal(c.env, c.req.param('dealId'));
  if (deal.buyer_id !== u.id) throw new HttpError(403, 'forbidden', 'غير مصرح.');
  if (b.outcome === 'decline') {
    await audit(c.env, { actorId: u.id, action: 'payment.declined', subjectType: 'deal', subjectId: deal.id });
    throw new HttpError(402, 'card_declined', 'رُفضت البطاقة من البنك المُصدِر. لم يتم خصم أي مبلغ.');
  }
  if (deal.payment_provider === 'chargily') {
    const ev = { id: `ev_sandbox_${newId()}`, entity: 'event', livemode: false,
      type: b.outcome === 'success' ? 'checkout.paid' : 'checkout.expired',
      data: { id: b.sessionId, entity: 'checkout', amount: deal.pay_amount, currency: 'dzd', status: b.outcome === 'success' ? 'paid' : 'expired',
        payment_method: deal.payment_method, metadata: { deal_id: deal.id } } };
    const raw = JSON.stringify(ev);
    const out = await handleChargilyWebhook(c.env, raw, await hmacHex(c.env.STRIPE_WEBHOOK_SECRET!, raw));
    return c.json(out.body as object, out.status as 200);
  }
  const event = {
    id: `evt_sandbox_${newId()}`,
    type: b.outcome === 'success' ? 'checkout.session.completed' : 'checkout.session.expired',
    data: { object: { id: b.sessionId, payment_status: b.outcome === 'success' ? 'paid' : 'unpaid', amount_total: deal.price_cents,
      currency: deal.currency.toLowerCase(), payment_intent: `pi_sandbox_${newId()}`, client_reference_id: deal.id, metadata: { deal_id: deal.id } } },
  };
  const raw = JSON.stringify(event);
  const sig = await signStripePayload(c.env.STRIPE_WEBHOOK_SECRET!, raw);
  const out = await handlePaymentWebhook(c.env, raw, sig);
  return c.json(out.body as object, out.status as 200);
});

// ---------- BaridiMob / CCP manual transfer ----------
r.post('/deals/:id/payment-proof', async (c) => {
  const u = requireUser(c);
  await rateLimit(c.env, 'payment-proof', u.id, 10, 3600_000);
  const { deal, party } = await partyDeal(c, c.req.param('id'), u.id);
  if (party !== 'buyer' || deal.payment_method !== 'baridimob') throw new HttpError(403, 'forbidden', 'غير مصرح.');
  if (deal.escrow_state !== 'pending_payment') throw new HttpError(409, 'not_pending', 'هذه الصفقة لم تعد بانتظار الدفع.');
  const pending = await c.env.DB.prepare(`SELECT 1 FROM payment_proofs WHERE deal_id = ? AND status = 'pending'`).bind(deal.id).first();
  if (pending) throw new HttpError(409, 'proof_pending', 'إثبات التحويل قيد المراجعة بالفعل.');
  const form = await c.req.formData().catch(() => { throw new HttpError(400, 'bad_form', 'نموذج غير صالح.'); });
  const transferRef = String(form.get('transferRef') ?? '').trim().slice(0, 80);
  if (transferRef.length < 4) throw new HttpError(400, 'validation', 'أدخل رقم/مرجع عملية التحويل.', { fields: { transferRef: 'مطلوب' } });
  const refundRip = normalizeRip(String(form.get('refundRip') ?? ''));
  if (!refundRip) throw new HttpError(400, 'validation', 'أدخل رقم RIP الخاص بك (20 رقمًا) لاستعماله عند أي استرداد.', { fields: { refundRip: 'RIP غير صالح' } });
  const f = await readUpload(form.get('file') as File | null, true);
  const id = newId('prf');
  const key = `proofs/${deal.id}/${id}`;
  await putEncrypted(c.env, key, f.bytes, f.mime);
  const { dek } = requireKeys(c.env);
  const enc = await encryptText(dek, `refund-rip:${id}`, refundRip);
  const s2 = await getSettings(c.env);
  const t = now();
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO payment_proofs (id, deal_id, submitted_by, transfer_ref, receipt_key, receipt_mime, refund_ciphertext, refund_iv, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(id, deal.id, u.id, transferRef, key, f.mime, enc.ciphertext, enc.iv, t),
    // Keep the reservation alive while finance verifies the transfer.
    c.env.DB.prepare('UPDATE deals SET payment_expires_at = MAX(COALESCE(payment_expires_at, 0), ?), updated_at = ? WHERE id = ?').bind(t + s2.payments.manual_payment_hours * 3600_000, t, deal.id),
    c.env.DB.prepare('INSERT INTO escrow_events (id, deal_id, from_state, to_state, actor_id, reason, created_at) VALUES (?,?,?,?,?,?,?)')
      .bind(newId('esc'), deal.id, 'pending_payment', 'pending_payment', u.id, 'أرسل المشتري إثبات تحويل BaridiMob / CCP للمراجعة', t),
    auditStmt(c.env, { actorId: u.id, action: 'payment.proof_submitted', subjectType: 'deal', subjectId: deal.id, details: { proof: id, size: f.size } }),
  ]);
  return c.json({ id }, 201);
});

// ---------- Deal room ----------
r.get('/deals', async (c) => {
  const u = requireUser(c);
  const rows = await c.env.DB.prepare(
    `SELECT d.id, d.escrow_state, d.price_cents, d.currency, d.created_at, d.updated_at, d.confirm_deadline, d.buyer_id, d.seller_id,
      l.title, l.platform, l.handle, b.display_name AS buyer_name, s.display_name AS seller_name
     FROM deals d JOIN listings l ON l.id = d.listing_id JOIN users b ON b.id = d.buyer_id JOIN users s ON s.id = d.seller_id
     WHERE d.buyer_id = ? OR d.seller_id = ? ORDER BY d.updated_at DESC LIMIT 200`,
  ).bind(u.id, u.id).all();
  return c.json({ items: rows.results });
});

export async function loadDealView(env: Env, deal: DealRow, viewerId: string) {
  const [listing, steps, events, stepLog, secrets, dispute, conv, buyer, seller] = await Promise.all([
    env.DB.prepare('SELECT id, title, platform, handle, followers, engagement_rate, category, country, language, account_created_year FROM listings WHERE id = ?').bind(deal.listing_id).first(),
    env.DB.prepare('SELECT step_no, step_key, performer, confirmer, status, performed_by, performed_at, confirmed_by, confirmed_at, note FROM transfer_steps WHERE deal_id = ? ORDER BY step_no').bind(deal.id).all(),
    env.DB.prepare('SELECT from_state, to_state, actor_id, reason, created_at FROM escrow_events WHERE deal_id = ? ORDER BY created_at').bind(deal.id).all(),
    env.DB.prepare('SELECT step_no, actor_id, action, note, created_at FROM transfer_step_log WHERE deal_id = ? ORDER BY created_at').bind(deal.id).all(),
    // Metadata only — ciphertext never leaves the server except through /reveal.
    env.DB.prepare('SELECT id, step_key, created_by, recipient_id, expires_at, revealed_at, destroyed_at, created_at FROM transfer_secrets WHERE deal_id = ? ORDER BY created_at').bind(deal.id).all(),
    env.DB.prepare(`SELECT id, status, reason_code, opened_by, created_at, resolution, resolution_note FROM disputes WHERE deal_id = ? ORDER BY created_at DESC LIMIT 1`).bind(deal.id).first(),
    env.DB.prepare('SELECT id FROM conversations WHERE deal_id = ?').bind(deal.id).first<{ id: string }>(),
    env.DB.prepare('SELECT id, display_name, trust_buyer FROM users WHERE id = ?').bind(deal.buyer_id).first(),
    env.DB.prepare('SELECT id, display_name, trust_seller FROM users WHERE id = ?').bind(deal.seller_id).first(),
  ]);
  const reclaimOpenUntil = deal.escrow_state === 'released'
    ? (await env.DB.prepare('SELECT MAX(available_at) n FROM ledger_entries WHERE deal_id = ? AND amount_cents > 0').bind(deal.id).first<{ n: number | null }>())?.n ?? null
    : null;
  let manualPayment: unknown = null;
  if (deal.payment_method === 'baridimob') {
    const st = await getSettings(env);
    const proofs = await env.DB.prepare('SELECT id, transfer_ref, status, review_note, created_at, reviewed_at FROM payment_proofs WHERE deal_id = ? ORDER BY created_at DESC').bind(deal.id).all();
    manualPayment = { rip: st.payments.platform_rip, holder: st.payments.platform_account_holder, reference: deal.id.slice(-8).toUpperCase(), proofs: proofs.results };
  }
  const { payment_session_id: _p, payment_intent_id: _pi, state_version: _v, ...safeDeal } = deal;
  return {
    deal: safeDeal, listing, steps: steps.results, events: events.results, stepLog: stepLog.results,
    secrets: secrets.results, dispute, conversationId: conv?.id ?? null, buyer, seller,
    role: deal.buyer_id === viewerId ? 'buyer' : deal.seller_id === viewerId ? 'seller' : 'admin',
    reclaimOpenUntil, manualPayment,
  };
}

async function partyDeal(c: { env: Env }, id: string, userId: string) {
  const deal = await getDeal(c.env, id);
  const party = partyOf(deal, userId);
  if (!party) throw new HttpError(404, 'not_found', 'الصفقة غير موجودة.');
  return { deal, party };
}

r.get('/deals/:id', async (c) => {
  const u = requireUser(c);
  const deal = await getDeal(c.env, c.req.param('id'));
  if (!partyOf(deal, u.id) && !can(u.role, 'deals.view')) throw new HttpError(404, 'not_found', 'الصفقة غير موجودة.');
  return c.json(await loadDealView(c.env, deal, u.id));
});

r.post('/deals/:id/checkout', async (c) => {
  // Re-open checkout for a still-pending deal (e.g. the buyer closed the payment tab).
  const u = requireUser(c);
  const { deal, party } = await partyDeal(c, c.req.param('id'), u.id);
  if (party !== 'buyer' || deal.escrow_state !== 'pending_payment') throw new HttpError(409, 'not_pending', 'لا يوجد دفع معلّق.');
  if (deal.payment_method === 'baridimob') return c.json({ checkoutUrl: `/deals/${deal.id}` });
  if (deal.payment_provider === 'chargily') {
    if (chargilyMode(c.env) === 'sandbox') return c.json({ checkoutUrl: `/checkout/sandbox/${deal.id}?session=${deal.payment_session_id}&provider=chargily` });
    const lc = await c.env.DB.prepare('SELECT handle FROM listings WHERE id = ?').bind(deal.listing_id).first<{ handle: string }>();
    const co = await createChargilyCheckout(c.env, { dealId: deal.id, amountDzd: deal.pay_amount!, method: deal.payment_method as 'edahabia' | 'cib', description: `TrustTransfer — @${lc!.handle}` });
    await c.env.DB.prepare('UPDATE deals SET payment_session_id = ? WHERE id = ?').bind(co.sessionId, deal.id).run();
    return c.json({ checkoutUrl: co.url });
  }
  if (c.env.PAYMENT_PROVIDER === 'sandbox') return c.json({ checkoutUrl: `/checkout/sandbox/${deal.id}?session=${deal.payment_session_id}` });
  const l = await c.env.DB.prepare('SELECT title, handle FROM listings WHERE id = ?').bind(deal.listing_id).first<{ title: string; handle: string }>();
  const s = await createCheckout(c.env, { dealId: deal.id, amountCents: deal.price_cents, currency: deal.currency, title: `${l!.title} (@${l!.handle})`, buyerEmail: u.email, expiresAt: deal.payment_expires_at ?? now() + HOUR });
  await c.env.DB.prepare('UPDATE deals SET payment_session_id = ? WHERE id = ?').bind(s.sessionId, deal.id).run();
  return c.json({ checkoutUrl: s.url });
});

r.post('/deals/:id/cancel', async (c) => {
  const u = requireUser(c);
  const { deal, party } = await partyDeal(c, c.req.param('id'), u.id);
  const b = await body(c.req, z.object({ reason: cleanText(3, 500) }));
  if (deal.escrow_state === 'pending_payment' && party === 'buyer') {
    await cancelUnpaid(c.env, deal, 'buyer_cancelled', u.id);
    return c.json({ ok: true });
  }
  if (party === 'seller' && ['held', 'transfer_in_progress'].includes(deal.escrow_state)) {
    // Seller backs out after payment → full refund to buyer, counts against seller trust.
    const rf = await refundDeal(c.env, deal, deal.price_cents, 'seller_cancelled');
    const ref = rf.ref;
    await transition(c.env, deal, 'refunded', {
      actorId: u.id, reason: `انسحب البائع: ${b.reason}`, set: { cancel_reason: 'seller_cancelled', cancelled_by: u.id, closed_at: now() }, ip: clientIp(c.req.raw),
      effects: (g) => [
        g.insert('platform_ledger', { id: newId('pl'), deal_id: deal.id, kind: 'refund', amount_cents: -deal.price_cents, provider_ref: ref, created_at: now() }),
        ...rf.effects(g),
        g.update(`UPDATE listings SET status = 'withdrawn', updated_at = ? WHERE id = ?`, now(), deal.listing_id),
        g.update(`UPDATE transfer_secrets SET ciphertext = NULL, iv = NULL, destroyed_at = ? WHERE deal_id = ? AND ciphertext IS NOT NULL`, now(), deal.id),
        g.notify(deal.buyer_id, 'تم رد المبلغ', 'انسحب البائع من الصفقة وتم رد كامل المبلغ إلى وسيلة الدفع.'),
      ],
    });
    return c.json({ ok: true });
  }
  throw new HttpError(409, 'not_cancellable', party === 'buyer' ? 'بعد الدفع لا يمكن الإلغاء إلا عبر فتح نزاع.' : 'لا يمكن الإلغاء في هذه المرحلة.');
});

// ---------- Transfer steps ----------
function stepDef(no: number) {
  const d = TRANSFER_STEPS.find((s) => s.no === no);
  if (!d) throw new HttpError(404, 'not_found', 'خطوة غير موجودة.');
  return d;
}

async function loadStep(env: Env, dealId: string, no: number) {
  const s = await env.DB.prepare('SELECT * FROM transfer_steps WHERE deal_id = ? AND step_no = ?').bind(dealId, no).first<{ status: string; step_no: number }>();
  if (!s) throw new HttpError(404, 'not_found', 'خطوة غير موجودة.');
  return s;
}

function assertTransferOpen(deal: DealRow) {
  if (!['held', 'transfer_in_progress'].includes(deal.escrow_state)) {
    throw new HttpError(409, 'transfer_closed', deal.escrow_state === 'disputed' ? 'الصفقة مجمّدة بسبب نزاع مفتوح.' : 'خطوات النقل غير متاحة في هذه المرحلة.');
  }
}

async function advanceAfter(env: Env, deal: DealRow, no: number, actorId: string) {
  const t = now();
  if (no < TRANSFER_STEPS.length) {
    await env.DB.prepare(`UPDATE transfer_steps SET status = 'active' WHERE deal_id = ? AND step_no = ? AND status = 'locked'`).bind(deal.id, no + 1).run();
    const next = stepDef(no + 1);
    const who = next.performer === 'seller' ? deal.seller_id : next.performer === 'buyer' ? deal.buyer_id : null;
    if (who) await notifyStmt(env, who, `دورك: ${next.title}`, 'الخطوة التالية من نقل الملكية بانتظارك.', `/deals/${deal.id}`).run();
  }
  await env.TRANSFER_QUEUE.send({ type: 'deal_event', dealId: deal.id, event: `step.${no}.done`, actorId }).catch(() => {});
  void t;
}

r.post('/deals/:id/steps/:no/perform', async (c) => {
  const u = requireUser(c);
  await rateLimit(c.env, 'step', u.id, 60, 3600_000);
  const no = Number(c.req.param('no'));
  const def = stepDef(no);
  let deal = await getDeal(c.env, c.req.param('id'));
  const party = partyOf(deal, u.id);
  const b = await body(c.req, z.object({ note: cleanText(0, 1000).optional(), secret: z.string().min(1).max(500).optional() }));
  if (def.performer === 'admin') {
    requirePerm(c, 'deals.transfer_verify');
    if (party) throw new HttpError(403, 'conflict_of_interest', 'لا يمكن لطرف في الصفقة اعتمادها.');
  } else if (party !== def.performer) {
    throw new HttpError(403, 'not_your_step', 'هذه الخطوة ليست من مسؤوليتك.');
  }
  assertTransferOpen(deal);
  const step = await loadStep(c.env, deal.id, no);
  if (step.status !== 'active') throw new HttpError(409, 'step_not_active', 'هذه الخطوة غير متاحة الآن.');

  // Buyer-provided secrets (recovery email/phone) must have been revealed by the seller before they can act on them.
  if (def.secret?.from === 'buyer') {
    const sec = await c.env.DB.prepare('SELECT revealed_at FROM transfer_secrets WHERE deal_id = ? AND step_key = ? ORDER BY created_at DESC LIMIT 1').bind(deal.id, def.key).first<{ revealed_at: number | null }>();
    if (!sec?.revealed_at) throw new HttpError(409, 'secret_pending', 'بانتظار أن يزوّدك المشتري بالبيانات عبر القناة الآمنة، ثم اكشفها.');
  }
  const t = now();
  if (def.secret?.from === 'seller' && !b.secret) throw new HttpError(400, 'secret_required', `أدخل ${def.secret.label}.`);
  const nextStatus = def.confirmer ? 'awaiting_confirmation' : 'done';
  // The guarded UPDATE runs first in the transaction; if it changes nothing (step already moved), abort.
  const stmts: D1PreparedStatement[] = [
    c.env.DB.prepare(`UPDATE transfer_steps SET status = ?, performed_by = ?, performed_at = ?, note = ? WHERE deal_id = ? AND step_no = ? AND status = 'active'`)
      .bind(nextStatus, u.id, t, b.note ?? null, deal.id, no),
  ];
  const res0 = await c.env.DB.batch(stmts);
  if ((res0[0].meta.changes ?? 0) !== 1) throw new HttpError(409, 'conflict', 'تغيّرت حالة الخطوة. حدّث الصفحة.');
  const after: D1PreparedStatement[] = [];
  if (def.secret?.from === 'seller') after.push(...(await secretStmts(c.env, deal, def.key, u.id, deal.buyer_id, b.secret!)));
  after.push(
    c.env.DB.prepare('INSERT INTO transfer_step_log (id, deal_id, step_no, actor_id, action, note, created_at) VALUES (?,?,?,?,?,?,?)')
      .bind(newId('slg'), deal.id, no, u.id, 'perform', b.note ?? null, t),
    auditStmt(c.env, { actorId: u.id, action: 'transfer.step_perform', subjectType: 'deal', subjectId: deal.id, details: { step: no }, ip: clientIp(c.req.raw) }),
  );
  if (def.confirmer) {
    const confirmerId = def.confirmer === 'buyer' ? deal.buyer_id : deal.seller_id;
    after.push(notifyStmt(c.env, confirmerId, `مطلوب تأكيدك: ${def.title}`, 'نفّذ الطرف الآخر الخطوة. راجعها وأكّد أو ارفض.', `/deals/${deal.id}`));
  }
  await c.env.DB.batch(after);

  if (deal.escrow_state === 'held') {
    deal = await transition(c.env, deal, 'transfer_in_progress', { actorId: u.id, reason: 'بدأ نقل الملكية' });
  }
  if (!def.confirmer) {
    if (def.performer === 'admin') {
      const s = await getSettings(c.env);
      const deadline = now() + s.escrow.confirmation_window_hours * HOUR;
      await transition(c.env, deal, 'buyer_confirmation_window', {
        actorId: u.id, reason: 'اعتمد فريق العمليات اكتمال النقل', set: { confirm_deadline: deadline }, ip: clientIp(c.req.raw),
        effects: (g) => [
          g.notify(deal.buyer_id, 'أكّد استلامك للحساب', `لديك ${s.escrow.confirmation_window_hours} ساعة لتأكيد الاستلام أو فتح نزاع، وبعدها يُحرَّر المبلغ تلقائيًا.`),
          g.notify(deal.seller_id, 'اكتمل النقل', 'بدأت مهلة تأكيد المشتري.'),
        ],
      });
    } else {
      await advanceAfter(c.env, deal, no, u.id);
    }
  }
  return c.json({ ok: true });
});

r.post('/deals/:id/steps/:no/confirm', async (c) => {
  const u = requireUser(c);
  const no = Number(c.req.param('no'));
  const def = stepDef(no);
  const { deal, party } = await partyDeal(c, c.req.param('id'), u.id);
  if (!def.confirmer || party !== def.confirmer) throw new HttpError(403, 'not_your_step', 'لست الطرف المطلوب لتأكيد هذه الخطوة.');
  assertTransferOpen(deal);
  if (def.secret?.from === 'seller') {
    const sec = await c.env.DB.prepare('SELECT revealed_at FROM transfer_secrets WHERE deal_id = ? AND step_key = ? ORDER BY created_at DESC LIMIT 1').bind(deal.id, def.key).first<{ revealed_at: number | null }>();
    if (!sec?.revealed_at) throw new HttpError(409, 'reveal_first', 'اكشف البيانات المرسلة أولًا وتحقق منها قبل التأكيد.');
  }
  const t = now();
  const res = await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE transfer_steps SET status = 'done', confirmed_by = ?, confirmed_at = ? WHERE deal_id = ? AND step_no = ? AND status = 'awaiting_confirmation'`).bind(u.id, t, deal.id, no),
    c.env.DB.prepare('INSERT INTO transfer_step_log (id, deal_id, step_no, actor_id, action, note, created_at) VALUES (?,?,?,?,?,?,?)').bind(newId('slg'), deal.id, no, u.id, 'confirm', null, t),
    auditStmt(c.env, { actorId: u.id, action: 'transfer.step_confirm', subjectType: 'deal', subjectId: deal.id, details: { step: no } }),
  ]);
  if ((res[0].meta.changes ?? 0) !== 1) throw new HttpError(409, 'not_awaiting', 'الخطوة ليست بانتظار التأكيد.');
  await advanceAfter(c.env, deal, no, u.id);
  return c.json({ ok: true });
});

r.post('/deals/:id/steps/:no/reject', async (c) => {
  const u = requireUser(c);
  const no = Number(c.req.param('no'));
  const def = stepDef(no);
  const { deal, party } = await partyDeal(c, c.req.param('id'), u.id);
  if (!def.confirmer || party !== def.confirmer) throw new HttpError(403, 'not_your_step', 'غير مصرح.');
  assertTransferOpen(deal);
  const b = await body(c.req, z.object({ note: cleanText(5, 1000, 'اشرح سبب الرفض') }));
  const t = now();
  const performerId = def.performer === 'seller' ? deal.seller_id : deal.buyer_id;
  const res = await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE transfer_steps SET status = 'active', note = ? WHERE deal_id = ? AND step_no = ? AND status = 'awaiting_confirmation'`).bind(b.note, deal.id, no),
    c.env.DB.prepare('INSERT INTO transfer_step_log (id, deal_id, step_no, actor_id, action, note, created_at) VALUES (?,?,?,?,?,?,?)').bind(newId('slg'), deal.id, no, u.id, 'reject', b.note, t),
    notifyStmt(c.env, performerId, `رُفض تأكيد: ${def.title}`, b.note, `/deals/${deal.id}`),
    auditStmt(c.env, { actorId: u.id, action: 'transfer.step_reject', subjectType: 'deal', subjectId: deal.id, details: { step: no } }),
  ]);
  if ((res[0].meta.changes ?? 0) !== 1) throw new HttpError(409, 'not_awaiting', 'الخطوة ليست بانتظار التأكيد.');
  return c.json({ ok: true });
});

// ---------- One-time secrets ----------
async function secretStmts(env: Env, deal: DealRow, stepKey: string, fromId: string, toId: string, value: string) {
  const { dek } = requireKeys(env);
  const s = await getSettings(env);
  const id = newId('sec');
  const { ciphertext, iv } = await encryptText(dek, `secret:${id}:${deal.id}`, value);
  const t = now();
  return [
    // Any older unrevealed secret for this step is destroyed — only one live secret per step.
    env.DB.prepare(`UPDATE transfer_secrets SET ciphertext = NULL, iv = NULL, destroyed_at = ? WHERE deal_id = ? AND step_key = ? AND ciphertext IS NOT NULL`).bind(t, deal.id, stepKey),
    env.DB.prepare('INSERT INTO transfer_secrets (id, deal_id, step_key, created_by, recipient_id, ciphertext, iv, expires_at, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(id, deal.id, stepKey, fromId, toId, ciphertext, iv, t + s.transfer.secret_ttl_hours * HOUR, t),
    env.DB.prepare('INSERT INTO transfer_step_log (id, deal_id, step_no, actor_id, action, note, created_at) VALUES (?,?,?,?,?,?,?)')
      .bind(newId('slg'), deal.id, TRANSFER_STEPS.find((x) => x.key === stepKey)!.no, fromId, 'provide_secret', null, t),
    notifyStmt(env, toId, 'بيانات آمنة بانتظارك', 'أرسل الطرف الآخر بيانات لمرة واحدة. اكشفها من صفحة الصفقة قبل انتهاء صلاحيتها.', `/deals/${deal.id}`),
  ];
}

r.post('/deals/:id/steps/:no/secret', async (c) => {
  const u = requireUser(c);
  await rateLimit(c.env, 'secret', u.id, 30, 3600_000);
  const no = Number(c.req.param('no'));
  const def = stepDef(no);
  const { deal, party } = await partyDeal(c, c.req.param('id'), u.id);
  if (!def.secret || def.secret.from !== party || def.secret.from !== 'buyer') throw new HttpError(403, 'forbidden', 'غير مصرح.');
  assertTransferOpen(deal);
  const step = await loadStep(c.env, deal.id, no);
  if (step.status !== 'active') throw new HttpError(409, 'step_not_active', 'هذه الخطوة غير متاحة الآن.');
  const b = await body(c.req, z.object({
    value: no === 2 ? z.string().trim().email('بريد إلكتروني غير صالح').max(254) : z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/, 'رقم هاتف غير صالح'),
  }));
  await c.env.DB.batch(await secretStmts(c.env, deal, def.key, u.id, deal.seller_id, b.value));
  await audit(c.env, { actorId: u.id, action: 'transfer.secret_provided', subjectType: 'deal', subjectId: deal.id, details: { step: no } });
  return c.json({ ok: true });
});

r.post('/deals/:id/secrets/:sid/reveal', async (c) => {
  const u = requireUser(c);
  await rateLimit(c.env, 'reveal', u.id, 20, 3600_000);
  const { deal } = await partyDeal(c, c.req.param('id'), u.id);
  const sec = await c.env.DB.prepare('SELECT * FROM transfer_secrets WHERE id = ? AND deal_id = ?').bind(c.req.param('sid'), deal.id)
    .first<{ id: string; recipient_id: string; ciphertext: string | null; iv: string | null; expires_at: number; revealed_at: number | null; step_key: string }>();
  if (!sec || sec.recipient_id !== u.id) throw new HttpError(404, 'not_found', 'غير موجود.');
  if (sec.revealed_at) throw new HttpError(410, 'already_revealed', 'تم كشف هذه البيانات مسبقًا ولا يمكن عرضها مرة أخرى. اطلب من الطرف الآخر إرسالها من جديد.');
  if (!sec.ciphertext || !sec.iv || sec.expires_at < now()) throw new HttpError(410, 'expired', 'انتهت صلاحية هذه البيانات. اطلب إرسالها من جديد.');
  const { dek } = requireKeys(c.env);
  // Wipe first (conditional on not yet revealed) — guarantees one reveal even under concurrent requests.
  const t = now();
  const wipe = await c.env.DB.prepare(`UPDATE transfer_secrets SET ciphertext = NULL, iv = NULL, revealed_at = ? WHERE id = ? AND revealed_at IS NULL AND ciphertext IS NOT NULL`).bind(t, sec.id).run();
  if ((wipe.meta.changes ?? 0) !== 1) throw new HttpError(410, 'already_revealed', 'تم كشف هذه البيانات مسبقًا.');
  const value = await decryptText(dek, `secret:${sec.id}:${deal.id}`, sec.ciphertext, sec.iv);
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO transfer_step_log (id, deal_id, step_no, actor_id, action, note, created_at) VALUES (?,?,?,?,?,?,?)')
      .bind(newId('slg'), deal.id, TRANSFER_STEPS.find((x) => x.key === sec.step_key)!.no, u.id, 'reveal_secret', null, t),
    auditStmt(c.env, { actorId: u.id, action: 'transfer.secret_revealed', subjectType: 'deal', subjectId: deal.id, details: { secret: sec.id } }),
  ]);
  c.header('Cache-Control', 'no-store');
  return c.json({ value });
});

// ---------- Buyer confirmation & release ----------
r.post('/deals/:id/confirm-release', async (c) => {
  const u = requireUser(c);
  const { deal, party } = await partyDeal(c, c.req.param('id'), u.id);
  if (party !== 'buyer') throw new HttpError(403, 'forbidden', 'التأكيد من صلاحية المشتري فقط.');
  if (deal.escrow_state !== 'buyer_confirmation_window') throw new HttpError(409, 'not_ready', 'لا يمكن التأكيد قبل اكتمال خطوات النقل.');
  await body(c.req, z.object({ satisfied: z.literal(true) }));
  const s = await getSettings(c.env);
  await transition(c.env, deal, 'released', {
    actorId: u.id, reason: 'أكّد المشتري الاستلام والرضا', set: { released_at: now(), closed_at: now() }, ip: clientIp(c.req.raw),
    effects: (g) => releaseEffects(g, deal, s.escrow.reclaim_hold_days),
  });
  return c.json({ ok: true });
});

// ---------- Disputes (opening) ----------
export async function openDisputeInternal(env: Env, deal: DealRow, openerId: string, reason: string, description: string, ip: string | null) {
  const existing = await env.DB.prepare(`SELECT id FROM disputes WHERE deal_id = ? AND status != 'resolved'`).bind(deal.id).first();
  if (existing) throw new HttpError(409, 'dispute_exists', 'يوجد نزاع مفتوح على هذه الصفقة بالفعل.');
  const id = newId('dsp');
  const t = now();
  const other = openerId === deal.buyer_id ? deal.seller_id : deal.buyer_id;
  await transition(env, deal, 'disputed', {
    actorId: openerId, reason: `فُتح نزاع: ${DISPUTE_REASONS[reason] ?? reason}`, ip: ip ?? undefined,
    effects: (g) => [
      g.insert('disputes', { id, deal_id: deal.id, opened_by: openerId, reason_code: reason, description, status: 'open', opened_in_state: deal.escrow_state, created_at: t }),
      g.insert('dispute_events', { id: newId('dev'), dispute_id: id, actor_id: openerId, kind: 'statement', body: description, created_at: t }),
      // Post-release reclaim dispute: freeze the seller's still-held proceeds.
      g.update(`UPDATE ledger_entries SET frozen = 1 WHERE deal_id = ? AND amount_cents > 0`, deal.id),
      g.notify(other, 'فُتح نزاع على صفقتك', 'تم تجميد الضمان حتى يفصل فريق التحكيم. أضف أقوالك وأدلتك.', `/disputes/${id}`),
    ],
  });
  return id;
}

r.post('/deals/:id/disputes', async (c) => {
  const u = requireUser(c);
  const ip = clientIp(c.req.raw);
  await rateLimit(c.env, 'dispute', u.id, 5, 3600_000);
  const b = await body(c.req, z.object({
    reason: z.string().refine((v) => v in DISPUTE_REASONS, 'سبب غير صالح'),
    description: cleanText(20, 4000, 'اشرح المشكلة بتفصيل (20 حرفًا على الأقل)'),
    turnstileToken: z.string().max(4096).optional(),
  }));
  await verifyTurnstile(c.env, b.turnstileToken, ip, 'dispute');
  const { deal, party } = await partyDeal(c, c.req.param('id'), u.id);
  if (deal.escrow_state === 'released') {
    const hold = await c.env.DB.prepare('SELECT MAX(available_at) n FROM ledger_entries WHERE deal_id = ? AND amount_cents > 0').bind(deal.id).first<{ n: number | null }>();
    if (party !== 'buyer' || !hold?.n || hold.n < now()) throw new HttpError(409, 'reclaim_window_closed', 'انتهت فترة حماية الاسترداد لهذه الصفقة.');
  } else if (!['held', 'transfer_in_progress', 'buyer_confirmation_window'].includes(deal.escrow_state)) {
    throw new HttpError(409, 'not_disputable', 'لا يمكن فتح نزاع في هذه المرحلة.');
  }
  const id = await openDisputeInternal(c.env, deal, u.id, b.reason, b.description, ip);
  return c.json({ disputeId: id }, 201);
});

export default r;
