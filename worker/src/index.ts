import { Hono } from 'hono';
import { ESCROW_LABELS, type EscrowState } from '../../shared/domain';
import type { AppEnv, Env, TransferMessage, VerifyMessage } from './env';
import { auditStmt, notifyStmt } from './lib/audit';
import { csrfGuard, loadSession } from './lib/auth';
import { getDeal, releaseEffects, transition } from './lib/escrow';
import { runListingChecks } from './lib/fraud';
import { getSettings } from './lib/settings';
import { recomputeTrust } from './lib/trust';
import { HttpError, newId, now, DAY } from './lib/util';
import admin from './routes/admin';
import auth from './routes/auth';
import chat from './routes/chat';
import deals, { cancelUnpaid } from './routes/deals';
import disputes from './routes/disputes';
import listings from './routes/listings';
import users from './routes/users';
import wallet from './routes/wallet';

const app = new Hono<AppEnv>().basePath('/api');

app.use('*', async (c, next) => {
  const len = Number(c.req.header('content-length') || 0);
  const ct = c.req.header('content-type') || '';
  if (ct.includes('application/json') && len > 256 * 1024) throw new HttpError(413, 'too_large', 'الطلب كبير جدًا.');
  if (len > 9 * 1024 * 1024) throw new HttpError(413, 'too_large', 'الطلب كبير جدًا.');
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (!c.res.headers.get('Cache-Control')) c.header('Cache-Control', 'no-store');
});

// Webhooks are authenticated by signature, not by session/CSRF — mount before those middlewares apply.
app.use('*', async (c, next) => {
  if (c.req.path.startsWith('/api/webhooks/')) return next(); // signature-authenticated, not session/CSRF
  await loadSession(c, async () => {
    await csrfGuard(c, next);
  });
});

app.get('/health', (c) => c.json({ ok: true, env: c.env.ENVIRONMENT, time: now() }));
app.route('/', auth);
app.route('/', listings);
app.route('/', deals);
app.route('/', chat);
app.route('/', disputes);
app.route('/', wallet);
app.route('/', users);
app.route('/', admin);

app.notFound((c) => c.json({ error: 'not_found', message: 'المسار غير موجود.' }, 404));

app.onError((err, c) => {
  if (err instanceof HttpError) {
    if (err.status === 429 && (err.details as { retryAfter?: number })?.retryAfter) c.header('Retry-After', String((err.details as { retryAfter: number }).retryAfter));
    return c.json({ error: err.code, message: err.message, details: err.details ?? null }, err.status as 400);
  }
  console.error('unhandled', c.req.method, c.req.path, err instanceof Error ? err.message : 'unknown');
  return c.json({ error: 'internal', message: 'حدث خطأ غير متوقع. لم يتم تنفيذ العملية، حاول مجددًا.' }, 500);
});

// ---------- Queue consumers ----------
async function handleVerify(env: Env, msg: VerifyMessage) {
  if (msg.type === 'listing_submitted') await runListingChecks(env, msg.listingId, await getSettings(env));
  else if (msg.type === 'recompute_trust') await recomputeTrust(env, msg.userId);
}

async function handleTransfer(env: Env, msg: TransferMessage) {
  if (msg.type === 'recompute_trust') return recomputeTrust(env, msg.userId);
  if (msg.type !== 'deal_event') return;
  const deal = await env.DB.prepare('SELECT * FROM deals WHERE id = ?').bind(msg.dealId).first<{ id: string; buyer_id: string; seller_id: string; escrow_state: EscrowState }>();
  if (!deal) return;
  if (msg.event.startsWith('escrow.')) {
    // Mirror escrow state changes into the deal chat so the transcript tells the full story.
    const conv = await env.DB.prepare('SELECT id FROM conversations WHERE deal_id = ?').bind(deal.id).first<{ id: string }>();
    const state = msg.event.slice(7) as EscrowState;
    if (conv && ESCROW_LABELS[state]) {
      await env.DB.prepare('INSERT INTO messages (id, conversation_id, sender_id, body, blocked, created_at) VALUES (?,?,?,?,0,?)')
        .bind(newId('msg'), conv.id, null, `تحديث الضمان: ${ESCROW_LABELS[state]}`, now()).run();
    }
    if (['released', 'refunded', 'split', 'cancelled'].includes(state)) {
      await recomputeTrust(env, deal.buyer_id);
      await recomputeTrust(env, deal.seller_id);
    }
  }
}

// ---------- Scheduled maintenance (every 10 minutes) ----------
async function scheduled(env: Env) {
  const t = now();
  const s = await getSettings(env);

  // 1. Confirmation windows that expired without a dispute → release to seller.
  const due = await env.DB.prepare(`SELECT id FROM deals WHERE escrow_state = 'buyer_confirmation_window' AND confirm_deadline < ? LIMIT 50`).bind(t).all<{ id: string }>();
  for (const { id } of due.results) {
    try {
      const deal = await getDeal(env, id);
      await transition(env, deal, 'released', {
        actorId: null, reason: 'انتهت مهلة تأكيد المشتري دون نزاع — تحرير تلقائي', set: { released_at: t, closed_at: t },
        effects: (g) => releaseEffects(g, deal, s.escrow.reclaim_hold_days),
      });
    } catch (e) { console.error('auto_release_failed', id, e instanceof Error ? e.message : ''); }
  }

  // 2. Unpaid deals past their payment timeout (+5 min grace for in-flight webhooks) → cancel and relist.
  const unpaid = await env.DB.prepare(`SELECT id FROM deals d WHERE escrow_state = 'pending_payment' AND payment_expires_at < ? AND NOT EXISTS (SELECT 1 FROM payment_proofs p WHERE p.deal_id = d.id AND p.status = 'pending') LIMIT 50`).bind(t - 5 * 60_000).all<{ id: string }>();
  for (const { id } of unpaid.results) {
    try { await cancelUnpaid(env, await getDeal(env, id), 'payment_timeout'); } catch (e) { console.error('cancel_failed', id); }
  }

  // 3. Stalled transfers → surface to ops once.
  const stalled = await env.DB.prepare(`SELECT id FROM deals WHERE escrow_state IN ('held','transfer_in_progress') AND updated_at < ? LIMIT 50`).bind(t - 5 * DAY).all<{ id: string }>();
  for (const { id } of stalled.results) {
    await env.DB.prepare(`INSERT INTO fraud_cases (id, subject_type, subject_id, reason, severity, created_at)
      SELECT ?, 'deal', ?, 'نقل ملكية متوقف منذ أكثر من 5 أيام', 'low', ? WHERE NOT EXISTS (SELECT 1 FROM fraud_cases WHERE subject_type = 'deal' AND subject_id = ? AND status = 'open')`)
      .bind(newId('frd'), id, t, id).run();
  }

  // 4. Hygiene: destroy expired one-time secrets, expired sessions and stale rate-limit windows.
  await env.DB.batch([
    env.DB.prepare('UPDATE transfer_secrets SET ciphertext = NULL, iv = NULL, destroyed_at = ? WHERE ciphertext IS NOT NULL AND expires_at < ?').bind(t, t),
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(t),
    env.DB.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(t - DAY),
    auditStmt(env, { actorId: null, action: 'system.maintenance', details: { released: due.results.length, cancelled: unpaid.results.length, stalled: stalled.results.length } }),
  ]);
  void notifyStmt;
}

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<VerifyMessage | TransferMessage>, env: Env) {
    for (const m of batch.messages) {
      try {
        if (batch.queue.startsWith('tt-verification')) await handleVerify(env, m.body as VerifyMessage);
        else await handleTransfer(env, m.body as TransferMessage);
        m.ack();
      } catch (e) {
        console.error('queue_error', batch.queue, e instanceof Error ? e.message : '');
        m.retry();
      }
    }
  },
  async scheduled(_c: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(scheduled(env));
  },
} satisfies ExportedHandler<Env, VerifyMessage | TransferMessage>;

export { scheduled as runMaintenance };
