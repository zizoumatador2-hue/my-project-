// Payment provider integration: Stripe (production) and a signed "sandbox" provider (local/dev only).
//
// Escrow model: the buyer's payment is CAPTURED immediately via Stripe Checkout and held in the platform's
// Stripe balance; TrustTransfer's own ledger tracks who the held money belongs to. We deliberately do not
// rely on uncaptured authorizations because card auths expire after ~7 days, while transfer + confirmation
// window + disputes can legitimately take longer. Refunds use the Refunds API against the PaymentIntent.

import type { Env } from '../env';
import { hmacHex, randomToken, timingSafeEqual } from './crypto';
import { HttpError, now } from './util';

const STRIPE_API = 'https://api.stripe.com/v1';
const SIGNATURE_TOLERANCE_S = 300;

export function assertPaymentsConfigured(env: Env) {
  if (env.PAYMENT_PROVIDER === 'sandbox') {
    if (env.ENVIRONMENT === 'production') throw new HttpError(503, 'sandbox_in_prod', 'مزوّد الدفع التجريبي غير مسموح في الإنتاج.');
    if (!env.STRIPE_WEBHOOK_SECRET) throw new HttpError(503, 'payments_unconfigured', 'الدفع غير مهيأ.');
    return;
  }
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    throw new HttpError(503, 'payments_unconfigured', 'بوابة الدفع غير مهيأة بعد. تواصل مع الدعم.');
  }
}

function form(obj: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) p.append(k, String(v));
  return p.toString();
}

async function stripe<T>(env: Env, path: string, body: Record<string, string | number | undefined>, idempotencyKey: string): Promise<T> {
  const r = await fetch(`${STRIPE_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': idempotencyKey,
      'Stripe-Version': '2024-06-20',
    },
    body: form(body),
  });
  const data = (await r.json()) as T & { error?: { message: string } };
  if (!r.ok) {
    console.error('stripe_error', path, r.status, data.error?.message);
    throw new HttpError(502, 'payment_provider_error', 'تعذّر الاتصال ببوابة الدفع. لم يتم خصم أي مبلغ.');
  }
  return data;
}

export async function createCheckout(env: Env, p: {
  dealId: string; amountCents: number; currency: string; title: string; buyerEmail: string; expiresAt: number;
}): Promise<{ sessionId: string; url: string }> {
  assertPaymentsConfigured(env);
  if (env.PAYMENT_PROVIDER === 'sandbox') {
    const sessionId = `cs_sandbox_${randomToken(12)}`;
    return { sessionId, url: `/checkout/sandbox/${p.dealId}?session=${sessionId}` };
  }
  const s = await stripe<{ id: string; url: string }>(env, '/checkout/sessions', {
    mode: 'payment',
    'line_items[0][quantity]': 1,
    'line_items[0][price_data][currency]': p.currency.toLowerCase(),
    'line_items[0][price_data][unit_amount]': p.amountCents,
    'line_items[0][price_data][product_data][name]': p.title.slice(0, 120),
    customer_email: p.buyerEmail,
    client_reference_id: p.dealId,
    'metadata[deal_id]': p.dealId,
    'payment_intent_data[metadata][deal_id]': p.dealId,
    // Stripe requires >= 30 minutes.
    expires_at: Math.floor(Math.max(p.expiresAt, now() + 31 * 60_000) / 1000),
    success_url: `${env.APP_URL}/deals/${p.dealId}?paid=1`,
    cancel_url: `${env.APP_URL}/deals/${p.dealId}?cancelled=1`,
  }, `checkout:${p.dealId}`);
  return { sessionId: s.id, url: s.url };
}

export async function refund(env: Env, p: { dealId: string; paymentIntentId: string | null; amountCents: number; reason: string }): Promise<string> {
  assertPaymentsConfigured(env);
  if (env.PAYMENT_PROVIDER === 'sandbox') return `re_sandbox_${randomToken(10)}`;
  if (!p.paymentIntentId) throw new HttpError(409, 'no_payment', 'لا يوجد دفع مرتبط بهذه الصفقة.');
  const r = await stripe<{ id: string }>(env, '/refunds', {
    payment_intent: p.paymentIntentId,
    amount: p.amountCents,
    'metadata[deal_id]': p.dealId,
    'metadata[reason]': p.reason.slice(0, 200),
  }, `refund:${p.dealId}:${p.amountCents}`);
  return r.id;
}

/** Verifies a Stripe-Signature header (v1 scheme, HMAC-SHA256, 5 minute tolerance). */
export async function verifyStripeSignature(secret: string, rawBody: string, header: string | null | undefined, nowS = Math.floor(Date.now() / 1000)): Promise<boolean> {
  if (!header) return false;
  let t = '';
  const sigs: string[] = [];
  for (const part of header.split(',')) {
    const [k, v] = part.split('=');
    if (k === 't') t = v;
    else if (k === 'v1' && v) sigs.push(v);
  }
  if (!t || !sigs.length || !/^\d+$/.test(t)) return false;
  if (Math.abs(nowS - Number(t)) > SIGNATURE_TOLERANCE_S) return false;
  const expected = await hmacHex(secret, `${t}.${rawBody}`);
  return sigs.some((s) => timingSafeEqual(s, expected));
}

export async function signStripePayload(secret: string, rawBody: string, t = Math.floor(Date.now() / 1000)): Promise<string> {
  return `t=${t},v1=${await hmacHex(secret, `${t}.${rawBody}`)}`;
}
