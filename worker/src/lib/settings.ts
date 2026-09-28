import { z } from 'zod';
import { DEFAULT_SETTINGS, type Settings } from '../../../shared/domain';
import type { Env } from '../env';
import { newId, now } from './util';

const KEY = 'settings:v1';
const cents = z.number().int().min(0).max(1_000_000_00);

export const settingsSchema = z.object({
  commission: z.object({
    tiers: z.array(z.object({ min_cents: cents, bp: z.number().int().min(0).max(5000) })).min(1).max(10),
    min_fee_cents: cents,
  }),
  withdrawal: z.object({ min_cents: cents, auto_approve_max_cents: cents, daily_auto_limit_cents: cents }),
  escrow: z.object({
    confirmation_window_hours: z.number().int().min(1).max(24 * 30),
    reclaim_hold_days: z.number().int().min(0).max(90),
    payment_timeout_minutes: z.number().int().min(30).max(24 * 60),
  }),
  chat: z.object({ violation_flag_threshold: z.number().int().min(1).max(50), allow_contact_after_complete: z.boolean() }),
  fraud: z.object({
    min_account_age_months: z.number().int().min(0).max(240),
    max_engagement_rate: z.number().min(1).max(100),
    min_price_per_1k_followers_cents: cents,
    new_seller_hours: z.number().int().min(0).max(24 * 90),
    new_seller_high_price_cents: cents,
  }),
  transfer: z.object({ secret_ttl_hours: z.number().int().min(1).max(168) }),
  payments: z.object({
    card_enabled: z.boolean(), chargily_enabled: z.boolean(), baridimob_enabled: z.boolean(),
    usd_to_dzd: z.number().min(1).max(100000),
    platform_rip: z.string().trim().max(40).refine((v) => v === '' || /^\d{20}$/.test(v.replace(/[\s-]/g, '')), 'RIP يجب أن يتكون من 20 رقمًا'),
    platform_account_holder: z.string().trim().max(100),
    manual_payment_hours: z.number().int().min(1).max(24 * 7),
  }),
  flags: z.object({
    signups_enabled: z.boolean(), new_listings_enabled: z.boolean(), purchases_enabled: z.boolean(),
    withdrawals_enabled: z.boolean(), chat_enabled: z.boolean(),
  }),
});

function merge<T>(base: T, over: unknown): T {
  if (typeof base !== 'object' || base === null || Array.isArray(base)) return (over ?? base) as T;
  if (typeof over !== 'object' || over === null) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const k of Object.keys(base as object)) {
    if (k in (over as object)) out[k] = merge((base as Record<string, unknown>)[k], (over as Record<string, unknown>)[k]);
  }
  return out as T;
}

/** Read at transaction time — never cached in module scope so admin edits apply immediately. */
export async function getSettings(env: Env): Promise<Settings> {
  const raw = await env.CONFIG.get(KEY, 'json');
  const merged = merge(DEFAULT_SETTINGS, raw);
  const parsed = settingsSchema.safeParse(merged);
  return parsed.success ? (parsed.data as Settings) : DEFAULT_SETTINGS;
}

export async function saveSettings(env: Env, s: Settings, actorId: string): Promise<void> {
  await env.CONFIG.put(KEY, JSON.stringify(s));
  // Durable, versioned copy in D1 so every change is reconstructable even if KV is purged.
  await env.DB.prepare('INSERT INTO settings_history (id, settings_json, changed_by, created_at) VALUES (?,?,?,?)')
    .bind(newId('set'), JSON.stringify(s), actorId, now()).run();
}
