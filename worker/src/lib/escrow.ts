import { ESCROW_TRANSITIONS, TRANSFER_STEPS, type EscrowState } from '../../../shared/domain';
import type { Env } from '../env';
import { DAY, HttpError, newId, now } from './util';

export interface DealRow {
  id: string; listing_id: string; buyer_id: string; seller_id: string; price_cents: number; commission_bp: number;
  commission_cents: number; seller_net_cents: number; currency: string; escrow_state: EscrowState; prev_state: string | null;
  state_version: number; payment_provider: string; payment_session_id: string | null; payment_intent_id: string | null;
  payment_expires_at: number | null; confirm_deadline: number | null; held_at: number | null; released_at: number | null;
  closed_at: number | null; cancel_reason: string | null; cancelled_by: string | null; created_at: number; updated_at: number;
}

export async function getDeal(env: Env, id: string): Promise<DealRow> {
  const d = await env.DB.prepare('SELECT * FROM deals WHERE id = ?').bind(id).first<DealRow>();
  if (!d) throw new HttpError(404, 'not_found', 'الصفقة غير موجودة.');
  return d;
}

export function canTransition(from: EscrowState, to: EscrowState): boolean {
  return ESCROW_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * A guard makes a side-effect statement conditional on the deal having reached exactly the new state version.
 * All statements run in one D1 batch (a single transaction); if the compare-and-set lost a race, every
 * guarded side effect becomes a no-op, so ledger rows can never be written without the matching state change.
 */
export class Guard {
  constructor(private env: Env, public dealId: string, public version: number, public state: EscrowState) {}
  private cond = 'EXISTS (SELECT 1 FROM deals WHERE id = ? AND state_version = ? AND escrow_state = ?)';
  insert(table: string, row: Record<string, unknown>): D1PreparedStatement {
    const cols = Object.keys(row);
    return this.env.DB.prepare(`INSERT INTO ${table} (${cols.join(',')}) SELECT ${cols.map(() => '?').join(',')} WHERE ${this.cond}`)
      .bind(...Object.values(row), this.dealId, this.version, this.state);
  }
  update(sql: string, ...binds: unknown[]): D1PreparedStatement {
    return this.env.DB.prepare(`${sql} AND ${this.cond}`).bind(...binds, this.dealId, this.version, this.state);
  }
  audit(actorId: string | null, action: string, details?: unknown, ip?: string) {
    return this.insert('audit_log', { id: newId('aud'), actor_id: actorId, action, subject_type: 'deal', subject_id: this.dealId,
      details: details === undefined ? null : JSON.stringify(details), ip: ip ?? null, created_at: now() });
  }
  notify(userId: string, title: string, body: string, link?: string) {
    return this.insert('notifications', { id: newId('ntf'), user_id: userId, title, body, link: link ?? `/deals/${this.dealId}`, created_at: now() });
  }
}

export async function transition(
  env: Env,
  deal: DealRow,
  to: EscrowState,
  opts: { actorId: string | null; reason: string; set?: Record<string, unknown>; effects?: (g: Guard) => D1PreparedStatement[]; ip?: string },
): Promise<DealRow> {
  if (!canTransition(deal.escrow_state, to)) {
    throw new HttpError(409, 'invalid_transition', `لا يمكن الانتقال من «${deal.escrow_state}» إلى «${to}».`);
  }
  const t = now();
  const set = { ...(opts.set ?? {}) };
  const setSql = Object.keys(set).map((k) => `, ${k} = ?`).join('');
  const newVersion = deal.state_version + 1;
  const g = new Guard(env, deal.id, newVersion, to);
  const stmts: D1PreparedStatement[] = [
    env.DB.prepare(`UPDATE deals SET escrow_state = ?, prev_state = ?, state_version = ?, updated_at = ?${setSql} WHERE id = ? AND state_version = ? AND escrow_state = ?`)
      .bind(to, deal.escrow_state, newVersion, t, ...Object.values(set), deal.id, deal.state_version, deal.escrow_state),
    g.insert('escrow_events', { id: newId('esc'), deal_id: deal.id, from_state: deal.escrow_state, to_state: to, actor_id: opts.actorId, reason: opts.reason, created_at: t }),
    g.audit(opts.actorId, `escrow.${to}`, { from: deal.escrow_state, reason: opts.reason }, opts.ip),
    ...(opts.effects ? opts.effects(g) : []),
  ];
  const res = await env.DB.batch(stmts);
  if ((res[0].meta.changes ?? 0) !== 1) {
    throw new HttpError(409, 'conflict', 'تغيّرت حالة الصفقة للتو. حدّث الصفحة.');
  }
  await env.TRANSFER_QUEUE.send({ type: 'deal_event', dealId: deal.id, event: `escrow.${to}`, actorId: opts.actorId }).catch(() => {});
  return getDeal(env, deal.id);
}

/** Side effects for moving money to the seller: credit wallet (under reclaim-protection hold) + record commission. */
export function releaseEffects(g: Guard, deal: DealRow, reclaimHoldDays: number, sellerGross = deal.price_cents, commission = deal.commission_cents, kind: 'sale_proceeds' | 'dispute_split' = 'sale_proceeds'): D1PreparedStatement[] {
  const t = now();
  const net = sellerGross - commission;
  const out: D1PreparedStatement[] = [];
  if (net > 0) {
    out.push(g.insert('ledger_entries', { id: newId('led'), user_id: deal.seller_id, deal_id: deal.id, withdrawal_id: null, kind, amount_cents: net,
      available_at: t + reclaimHoldDays * DAY, frozen: 0, memo: `عائد صفقة ${deal.id}`, created_at: t }));
  }
  if (commission > 0) {
    out.push(g.insert('platform_ledger', { id: newId('pl'), deal_id: deal.id, kind: 'commission', amount_cents: commission, provider_ref: null, created_at: t }));
  }
  out.push(g.update(`UPDATE listings SET status = 'sold', updated_at = ? WHERE id = ?`, t, deal.listing_id));
  out.push(g.notify(deal.seller_id, 'تم تحرير المبلغ', `أُضيف ${(net / 100).toFixed(2)} ${deal.currency} إلى محفظتك (رصيد معلّق لفترة حماية الاسترداد ${reclaimHoldDays} أيام).`, '/wallet'));
  out.push(g.notify(deal.buyer_id, 'اكتملت الصفقة', 'تم إغلاق الصفقة وتحرير المبلغ للبائع. يمكنك فتح نزاع استرداد خلال فترة الحماية إن استعاد البائع الحساب.'));
  return out;
}

export function createStepsEffects(g: Guard, dealId: string): D1PreparedStatement[] {
  return TRANSFER_STEPS.map((s) => g.insert('transfer_steps', {
    id: newId('stp'), deal_id: dealId, step_no: s.no, step_key: s.key, performer: s.performer, confirmer: s.confirmer,
    status: s.no === 1 ? 'active' : 'locked', performed_by: null, performed_at: null, confirmed_by: null, confirmed_at: null, note: null,
  }));
}

export function partyOf(deal: DealRow, userId: string): 'buyer' | 'seller' | null {
  if (deal.buyer_id === userId) return 'buyer';
  if (deal.seller_id === userId) return 'seller';
  return null;
}
