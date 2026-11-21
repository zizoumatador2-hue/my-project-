import type { APIRoute } from 'astro';
import { verifyStripeSignature } from '../../../lib/stripe';
import { handleStripeEvent } from '../../../lib/billing';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  if (!env.STRIPE_WEBHOOK_SECRET) return new Response('Billing not configured', { status: 404 });
  const payload = await request.text();
  const ok = await verifyStripeSignature(payload, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return new Response('Invalid signature', { status: 400 });
  try {
    await handleStripeEvent(env, JSON.parse(payload));
  } catch (e) {
    console.error('stripe webhook failed', e);
    return new Response('Webhook handler error', { status: 500 }); // Stripe retries
  }
  return Response.json({ received: true });
};
