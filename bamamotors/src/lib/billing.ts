import { first, run, insert, addDays, nowIso, audit } from './db';
import { planOf, PLANS, type PlanId } from './plans';
import { stripeEnabled, stripeRequest } from './stripe';
import { notify, notifyAdmins } from './email';
import { activeFeaturedCount } from './dealers';

/** Shown to dealers when a Stripe call fails; the provider's own error text stays in the server log. */
export const CHECKOUT_ERROR = "We couldn't open secure checkout. Please try again, or contact us if it keeps happening.";

/** Applies a plan to a dealer and records the subscription (single source of truth for plan changes). */
export async function applyPlan(
  db: D1Database,
  dealerId: number,
  plan: PlanId,
  opts: { provider?: 'manual' | 'stripe'; customerId?: string | null; subscriptionId?: string | null; periodEnd?: string | null; actorId?: number | null } = {},
): Promise<void> {
  const provider = opts.provider ?? 'manual';
  await run(db, "UPDATE subscriptions SET status = 'canceled', updated_at = ? WHERE dealer_id = ? AND status IN ('active','past_due','requested','incomplete')", [nowIso(), dealerId]);
  if (plan !== 'free') {
    await run(
      db,
      `INSERT INTO subscriptions (dealer_id, plan, status, provider, provider_customer_id, provider_subscription_id, current_period_end)
       VALUES (?,?, 'active', ?,?,?,?)
       ON CONFLICT(provider_subscription_id) DO UPDATE SET plan = excluded.plan, status = 'active', current_period_end = excluded.current_period_end, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
      [dealerId, plan, provider, opts.customerId ?? null, opts.subscriptionId ?? null, opts.periodEnd ?? (provider === 'manual' ? addDays(30) : null)],
    );
  }
  await run(db, 'UPDATE dealers SET plan = ?, updated_at = ? WHERE id = ?', [plan, nowIso(), dealerId]);
  await audit(db, opts.actorId ?? null, 'plan.change', 'dealer', dealerId, { plan, provider });
  const owner = await first<{ owner_user_id: number }>(db, 'SELECT owner_user_id FROM dealers WHERE id = ?', [dealerId]);
  if (owner) await notify(db, owner.owner_user_id, `Your plan is now ${PLANS[plan].name}`, 'Your inventory limits have been updated.', '/dashboard/billing');
}

/** Without Stripe configured, dealers can request an upgrade; admins activate it manually after invoicing. */
export async function requestPlan(db: D1Database, dealerId: number, plan: PlanId): Promise<void> {
  await run(db, "UPDATE subscriptions SET status = 'canceled' WHERE dealer_id = ? AND status = 'requested'", [dealerId]);
  await insert(db, "INSERT INTO subscriptions (dealer_id, plan, status, provider) VALUES (?, ?, 'requested', 'manual')", [dealerId, plan]);
  await notifyAdmins(db, 'Dealer plan upgrade requested', `Dealer #${dealerId} requested the ${PLANS[plan].name} plan`, '/admin/subscriptions');
}

export async function createSubscriptionCheckout(env: Env, dealer: { id: number; email: string }, plan: PlanId): Promise<string> {
  const price = plan === 'pro' ? env.STRIPE_PRICE_PRO : env.STRIPE_PRICE_BASIC;
  if (!stripeEnabled(env) || !price) throw new Error('Online billing is not configured.');
  const site = env.SITE_URL.replace(/\/$/, '');
  const session = await stripeRequest<{ url: string }>(env, 'checkout/sessions', {
    mode: 'subscription',
    'line_items[0][price]': price,
    'line_items[0][quantity]': 1,
    customer_email: dealer.email,
    client_reference_id: String(dealer.id),
    'metadata[dealer_id]': String(dealer.id),
    'metadata[plan]': plan,
    'subscription_data[metadata][dealer_id]': String(dealer.id),
    'subscription_data[metadata][plan]': plan,
    success_url: `${site}/dashboard/billing?ok=billing`,
    cancel_url: `${site}/dashboard/billing?err=canceled`,
  });
  return session.url;
}

export async function createFeaturedCheckout(env: Env, dealer: { id: number; email: string }, vehicleId: number, priceCents: number, days: number): Promise<string> {
  if (!stripeEnabled(env)) throw new Error('Online billing is not configured.');
  const site = env.SITE_URL.replace(/\/$/, '');
  const payId = await insert(env.DB, "INSERT INTO payments (dealer_id, kind, amount_cents, status, provider, description) VALUES (?, 'featured', ?, 'pending', 'stripe', ?)", [
    dealer.id, priceCents, `Featured listing #${vehicleId} (${days} days)`,
  ]);
  const lineItem: Record<string, unknown> = env.STRIPE_PRICE_FEATURED
    ? { 'line_items[0][price]': env.STRIPE_PRICE_FEATURED }
    : {
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][unit_amount]': priceCents,
        'line_items[0][price_data][product_data][name]': `Featured vehicle listing (${days} days)`,
      };
  const session = await stripeRequest<{ url: string; id: string }>(env, 'checkout/sessions', {
    mode: 'payment',
    ...lineItem,
    'line_items[0][quantity]': 1,
    customer_email: dealer.email,
    client_reference_id: String(dealer.id),
    'metadata[kind]': 'featured',
    'metadata[dealer_id]': String(dealer.id),
    'metadata[vehicle_id]': String(vehicleId),
    'metadata[payment_id]': String(payId),
    'metadata[days]': String(days),
    success_url: `${site}/dashboard/vehicles?ok=featured`,
    cancel_url: `${site}/dashboard/vehicles?err=canceled`,
  });
  await run(env.DB, 'UPDATE payments SET provider_ref = ? WHERE id = ?', [session.id, payId]);
  return session.url;
}

export async function createPortalSession(env: Env, customerId: string): Promise<string> {
  const site = env.SITE_URL.replace(/\/$/, '');
  const s = await stripeRequest<{ url: string }>(env, 'billing_portal/sessions', { customer: customerId, return_url: `${site}/dashboard/billing` });
  return s.url;
}

/** Marks a vehicle as featured for `days`. Source: plan slot, paid purchase, or admin. */
export async function featureVehicle(
  db: D1Database,
  vehicleId: number,
  dealerId: number,
  days: number,
  source: 'plan' | 'purchase' | 'admin',
  paymentId: number | null = null,
): Promise<void> {
  const start = new Date();
  const current = await first<{ featured_until: string | null }>(db, 'SELECT featured_until FROM vehicles WHERE id = ?', [vehicleId]);
  const base = current?.featured_until && current.featured_until > start.toISOString() ? new Date(current.featured_until) : start;
  const ends = addDays(days, base);
  await db.batch([
    db.prepare('INSERT INTO featured_listings (vehicle_id, dealer_id, starts_at, ends_at, status, source, payment_id) VALUES (?,?,?,?,?,?,?)')
      .bind(vehicleId, dealerId, start.toISOString(), ends, 'active', source, paymentId),
    db.prepare('UPDATE vehicles SET featured_until = ? WHERE id = ?').bind(ends, vehicleId),
  ]);
}

export async function unfeatureVehicle(db: D1Database, vehicleId: number): Promise<void> {
  await db.batch([
    db.prepare("UPDATE featured_listings SET status = 'canceled' WHERE vehicle_id = ? AND status = 'active'").bind(vehicleId),
    db.prepare('UPDATE vehicles SET featured_until = NULL WHERE id = ?').bind(vehicleId),
  ]);
}

export async function planFeaturedAvailable(db: D1Database, dealer: { id: number; plan: string }): Promise<number> {
  return Math.max(0, planOf(dealer.plan).featuredSlots - (await activeFeaturedCount(db, dealer.id, 'plan')));
}

interface StripeEvent { id: string; type: string; data: { object: Record<string, unknown> & { metadata?: Record<string, string> } }; }

/** Idempotent Stripe webhook processing. */
export async function handleStripeEvent(env: Env, event: StripeEvent): Promise<void> {
  const db = env.DB;
  const o = event.data.object;
  const md = o.metadata ?? {};
  switch (event.type) {
    case 'checkout.session.completed': {
      const dealerId = Number(md.dealer_id);
      if (!dealerId) return;
      if (o.mode === 'subscription') {
        const plan = (md.plan === 'pro' ? 'pro' : 'basic') as PlanId;
        await applyPlan(db, dealerId, plan, { provider: 'stripe', customerId: String(o.customer ?? ''), subscriptionId: String(o.subscription ?? ''), periodEnd: null });
        await insert(db, "INSERT OR IGNORE INTO payments (dealer_id, kind, amount_cents, status, provider, provider_ref, description) VALUES (?, 'subscription', ?, 'succeeded', 'stripe', ?, ?)", [
          dealerId, Number(o.amount_total ?? PLANS[plan].priceCents), String(o.id), `${PLANS[plan].name} plan`,
        ]);
      } else if (md.kind === 'featured') {
        const payId = Number(md.payment_id);
        const pay = await first<{ status: string }>(db, 'SELECT status FROM payments WHERE id = ?', [payId]);
        if (!pay || pay.status === 'succeeded') return; // idempotency
        await run(db, "UPDATE payments SET status = 'succeeded', amount_cents = COALESCE(?, amount_cents) WHERE id = ?", [Number(o.amount_total) || null, payId]);
        await featureVehicle(db, Number(md.vehicle_id), dealerId, Number(md.days) || 30, 'purchase', payId);
      }
      return;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subId = String(o.id);
      const sub = await first<{ dealer_id: number; plan: PlanId }>(db, 'SELECT dealer_id, plan FROM subscriptions WHERE provider_subscription_id = ?', [subId]);
      if (!sub) return;
      const status = String(o.status);
      const periodEnd = o.current_period_end ? new Date(Number(o.current_period_end) * 1000).toISOString() : null;
      if (event.type === 'customer.subscription.deleted' || status === 'canceled' || status === 'unpaid') {
        await run(db, "UPDATE subscriptions SET status = 'canceled', updated_at = ? WHERE provider_subscription_id = ?", [nowIso(), subId]);
        await run(db, "UPDATE dealers SET plan = 'free', updated_at = ? WHERE id = ?", [nowIso(), sub.dealer_id]);
      } else {
        const mapped = status === 'active' || status === 'trialing' ? 'active' : status === 'past_due' ? 'past_due' : 'incomplete';
        await run(db, 'UPDATE subscriptions SET status = ?, current_period_end = ?, cancel_at_period_end = ?, updated_at = ? WHERE provider_subscription_id = ?', [
          mapped, periodEnd, o.cancel_at_period_end ? 1 : 0, nowIso(), subId,
        ]);
      }
      return;
    }
    case 'invoice.payment_failed': {
      const subId = String(o.subscription ?? '');
      const sub = await first<{ dealer_id: number }>(db, 'SELECT dealer_id FROM subscriptions WHERE provider_subscription_id = ?', [subId]);
      if (!sub) return;
      await run(db, "UPDATE subscriptions SET status = 'past_due' WHERE provider_subscription_id = ?", [subId]);
      const owner = await first<{ owner_user_id: number }>(db, 'SELECT owner_user_id FROM dealers WHERE id = ?', [sub.dealer_id]);
      if (owner) await notify(db, owner.owner_user_id, 'Payment failed', 'Please update your payment method to keep your plan.', '/dashboard/billing');
      return;
    }
  }
}
