import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv, Env } from '../env';
import { audit, notifyStmt } from '../lib/audit';
import { requireUser } from '../lib/auth';
import { encryptText, verifyPassword } from '../lib/crypto';
import { requireKeys } from '../lib/files';
import { rateLimit } from '../lib/ratelimit';
import { getSettings } from '../lib/settings';
import { body, cleanText } from '../lib/validate';
import { clientIp, DAY, HttpError, newId, now } from '../lib/util';

const r = new Hono<AppEnv>();

const AVAILABLE_SQL = `SELECT COALESCE(SUM(amount_cents), 0) FROM ledger_entries WHERE user_id = ?1 AND frozen = 0 AND available_at <= ?2`;

export async function balances(env: Env, userId: string) {
  const t = now();
  const row = await env.DB.prepare(
    `SELECT
      (${AVAILABLE_SQL}) AS available,
      (SELECT COALESCE(SUM(amount_cents), 0) FROM ledger_entries WHERE user_id = ?1 AND frozen = 0 AND available_at > ?2) AS on_hold,
      (SELECT COALESCE(SUM(amount_cents), 0) FROM ledger_entries WHERE user_id = ?1 AND frozen = 1) AS frozen,
      (SELECT COALESCE(SUM(seller_net_cents), 0) FROM deals WHERE seller_id = ?1 AND escrow_state IN ('held','transfer_in_progress','buyer_confirmation_window','disputed')) AS in_escrow,
      (SELECT COALESCE(SUM(amount_cents), 0) FROM withdrawals WHERE user_id = ?1 AND status IN ('pending_review','approved')) AS withdrawals_pending,
      (SELECT MIN(available_at) FROM ledger_entries WHERE user_id = ?1 AND frozen = 0 AND available_at > ?2) AS next_release_at`,
  ).bind(userId, t).first<Record<string, number | null>>();
  return row!;
}

r.get('/wallet', async (c) => {
  const u = requireUser(c);
  const [b, ledger, withdrawals, s] = await Promise.all([
    balances(c.env, u.id),
    c.env.DB.prepare(`SELECT le.id, le.kind, le.amount_cents, le.available_at, le.frozen, le.memo, le.deal_id, le.created_at, l.title
       FROM ledger_entries le LEFT JOIN deals d ON d.id = le.deal_id LEFT JOIN listings l ON l.id = d.listing_id
       WHERE le.user_id = ? ORDER BY le.created_at DESC LIMIT 200`).bind(u.id).all(),
    c.env.DB.prepare('SELECT id, amount_cents, status, payout_hint, auto_approved, payout_ref, note, created_at, reviewed_at FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').bind(u.id).all(),
    getSettings(c.env),
  ]);
  return c.json({ balances: b, ledger: ledger.results, withdrawals: withdrawals.results, rules: { min_cents: s.withdrawal.min_cents, reclaim_hold_days: s.escrow.reclaim_hold_days }, currency: 'USD' });
});

function maskAccount(acc: string): string {
  const clean = acc.replace(/\s+/g, '');
  return `${clean.slice(0, 2)}•• •••• ${clean.slice(-4)}`;
}

r.post('/wallet/withdrawals', async (c) => {
  const u = requireUser(c);
  const ip = clientIp(c.req.raw);
  await rateLimit(c.env, 'withdraw', u.id, 5, 3600_000);
  const s = await getSettings(c.env);
  if (!s.flags.withdrawals_enabled) throw new HttpError(503, 'withdrawals_disabled', 'السحب متوقف مؤقتًا.');
  const b = await body(c.req, z.object({
    amountCents: z.number().int().positive(),
    accountHolder: cleanText(3, 100),
    iban: z.string().trim().toUpperCase().transform((v) => v.replace(/\s+/g, '')).pipe(z.string().regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/, 'رقم IBAN غير صالح')),
    bankName: cleanText(2, 100),
    password: z.string().min(1).max(200),
  }));
  // Step-up: re-enter password for money movement.
  const row = await c.env.DB.prepare('SELECT password_hash, password_salt, trust_seller FROM users WHERE id = ?').bind(u.id).first<{ password_hash: string; password_salt: string; trust_seller: number }>();
  if (!row || !(await verifyPassword(b.password, row.password_hash, row.password_salt))) throw new HttpError(400, 'wrong_password', 'كلمة المرور غير صحيحة.');
  if (b.amountCents < s.withdrawal.min_cents) throw new HttpError(400, 'below_min', `الحد الأدنى للسحب ${(s.withdrawal.min_cents / 100).toFixed(2)} دولار.`);

  const t = now();
  const openCases = await c.env.DB.prepare(`SELECT COUNT(*) n FROM fraud_cases WHERE subject_type = 'user' AND subject_id = ? AND status = 'open'`).bind(u.id).first<{ n: number }>();
  const autoToday = await c.env.DB.prepare(`SELECT COALESCE(SUM(amount_cents),0) n FROM withdrawals WHERE auto_approved = 1 AND created_at > ?`).bind(t - DAY).first<{ n: number }>();
  // Auto-approval rule is fully data-driven from admin settings.
  const auto = b.amountCents <= s.withdrawal.auto_approve_max_cents
    && (autoToday?.n ?? 0) + b.amountCents <= s.withdrawal.daily_auto_limit_cents
    && (openCases?.n ?? 0) === 0 && row.trust_seller >= 40;

  const { dek } = requireKeys(c.env);
  const id = newId('wdr');
  const enc = await encryptText(dek, `payout:${id}`, JSON.stringify({ holder: b.accountHolder, iban: b.iban, bank: b.bankName }));
  // Atomic: the withdrawal row is only created if the available balance covers it; the debit follows only if it was.
  const res = await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO withdrawals (id, user_id, amount_cents, status, payout_ciphertext, payout_iv, payout_hint, auto_approved, reviewed_at, created_at)
       SELECT ?3, ?1, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?2 WHERE (${AVAILABLE_SQL}) >= ?4`,
    ).bind(u.id, t, id, b.amountCents, auto ? 'approved' : 'pending_review', enc.ciphertext, enc.iv, `${b.bankName} — ${maskAccount(b.iban)}`, auto ? 1 : 0, auto ? t : null),
    c.env.DB.prepare(
      `INSERT INTO ledger_entries (id, user_id, withdrawal_id, kind, amount_cents, available_at, memo, created_at)
       SELECT ?, ?, ?, 'withdrawal', ?, ?, ?, ? WHERE changes() = 1`,
    ).bind(newId('led'), u.id, id, -b.amountCents, t, 'طلب سحب', t),
  ]);
  if ((res[0].meta.changes ?? 0) !== 1) throw new HttpError(409, 'insufficient_funds', 'الرصيد المتاح لا يكفي.');
  await audit(c.env, { actorId: u.id, action: auto ? 'withdrawal.auto_approved' : 'withdrawal.requested', subjectType: 'withdrawal', subjectId: id, details: { amount: b.amountCents }, ip });
  await notifyStmt(c.env, u.id, auto ? 'تمت الموافقة على السحب تلقائيًا' : 'طلب السحب قيد المراجعة', auto ? 'سيُحوَّل المبلغ إلى حسابك البنكي خلال أيام العمل.' : 'سيراجع الفريق المالي طلبك.', '/wallet').run();
  return c.json({ id, status: auto ? 'approved' : 'pending_review' }, 201);
});

export default r;
