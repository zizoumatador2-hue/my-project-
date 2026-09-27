import type { Env } from '../env';
import { now } from './util';

export interface TrustInputs {
  completed: number;          // deals released (as seller or buyer respectively)
  disputesOpenedAgainst: number;
  disputesLost: number;
  cancellations: number;      // deals this party cancelled / abandoned
  verificationsApproved: number;
  verificationsRejected: number;
  avgResponseMinutes: number | null;
  chatViolations: number;
  accountAgeDays: number;
}

/**
 * Transparent 0–100 score. Starts at a neutral 50, earns trust with completed history, loses it with lost
 * disputes and cancellations. Weights are documented in docs/ARCHITECTURE.md so users can understand it.
 */
export function computeTrust(i: TrustInputs, side: 'seller' | 'buyer'): { score: number; parts: Record<string, number> } {
  const parts: Record<string, number> = {};
  parts.base = 50;
  parts.completed = Math.min(30, Math.round(12 * Math.log2(1 + i.completed)));
  parts.tenure = Math.min(5, Math.floor(i.accountAgeDays / 60));
  parts.disputes_lost = -Math.min(40, i.disputesLost * 15);
  parts.disputes_against = -Math.min(10, Math.max(0, i.disputesOpenedAgainst - i.disputesLost) * 2);
  parts.cancellations = -Math.min(20, i.cancellations * 6);
  parts.chat_violations = -Math.min(15, i.chatViolations * 3);
  if (side === 'seller') {
    const total = i.verificationsApproved + i.verificationsRejected;
    parts.verification = total === 0 ? 0 : Math.round(10 * (i.verificationsApproved / total)) - (i.verificationsRejected > 0 ? 3 : 0);
  }
  if (i.avgResponseMinutes !== null) {
    parts.responsiveness = i.avgResponseMinutes <= 60 ? 5 : i.avgResponseMinutes <= 360 ? 2 : i.avgResponseMinutes > 1440 ? -5 : 0;
  }
  const score = Math.max(0, Math.min(100, Object.values(parts).reduce((a, b) => a + b, 0)));
  return { score, parts };
}

export async function recomputeTrust(env: Env, userId: string): Promise<void> {
  const one = (sql: string, ...b: unknown[]) => env.DB.prepare(sql).bind(...b).first<{ n: number | null }>().then((r) => r?.n ?? 0);
  const user = await env.DB.prepare('SELECT created_at, chat_violations FROM users WHERE id = ?').bind(userId).first<{ created_at: number; chat_violations: number }>();
  if (!user) return;
  const [sCompleted, bCompleted, sAgainst, bAgainst, sLost, bLost, sCancel, bCancel, vOk, vRej, resp] = await Promise.all([
    one(`SELECT COUNT(*) n FROM deals WHERE seller_id = ? AND escrow_state IN ('released','split')`, userId),
    one(`SELECT COUNT(*) n FROM deals WHERE buyer_id = ? AND escrow_state IN ('released','split')`, userId),
    one(`SELECT COUNT(*) n FROM disputes d JOIN deals x ON x.id = d.deal_id WHERE x.seller_id = ? AND d.opened_by != ?`, userId, userId),
    one(`SELECT COUNT(*) n FROM disputes d JOIN deals x ON x.id = d.deal_id WHERE x.buyer_id = ? AND d.opened_by != ?`, userId, userId),
    one(`SELECT COUNT(*) n FROM disputes d JOIN deals x ON x.id = d.deal_id WHERE x.seller_id = ? AND d.resolution = 'refund'`, userId),
    one(`SELECT COUNT(*) n FROM disputes d JOIN deals x ON x.id = d.deal_id WHERE x.buyer_id = ? AND d.resolution = 'release' AND d.opened_by = ?`, userId, userId),
    one(`SELECT COUNT(*) n FROM deals WHERE seller_id = ? AND cancelled_by = ?`, userId, userId),
    one(`SELECT COUNT(*) n FROM deals WHERE buyer_id = ? AND (cancelled_by = ? OR cancel_reason = 'payment_timeout')`, userId, userId),
    one(`SELECT COUNT(*) n FROM listings WHERE seller_id = ? AND approved_at IS NOT NULL`, userId),
    one(`SELECT COUNT(*) n FROM listings WHERE seller_id = ? AND status = 'rejected'`, userId),
    // Average minutes between a counterpart's message and this user's next reply, over the last 200 replies.
    env.DB.prepare(
      `SELECT AVG(gap) n FROM (
         SELECT (m.created_at - (SELECT MAX(p.created_at) FROM messages p WHERE p.conversation_id = m.conversation_id
                  AND p.created_at < m.created_at AND p.sender_id IS NOT NULL AND p.sender_id != m.sender_id AND p.blocked = 0)) / 60000.0 AS gap
         FROM messages m WHERE m.sender_id = ? AND m.blocked = 0 ORDER BY m.created_at DESC LIMIT 200
       ) WHERE gap IS NOT NULL`,
    ).bind(userId).first<{ n: number | null }>().then((r) => r?.n ?? null),
  ]);
  const ageDays = (now() - user.created_at) / 86400000;
  const seller = computeTrust({ completed: sCompleted, disputesOpenedAgainst: sAgainst, disputesLost: sLost, cancellations: sCancel,
    verificationsApproved: vOk, verificationsRejected: vRej, avgResponseMinutes: resp, chatViolations: user.chat_violations, accountAgeDays: ageDays }, 'seller');
  const buyer = computeTrust({ completed: bCompleted, disputesOpenedAgainst: bAgainst, disputesLost: bLost, cancellations: bCancel,
    verificationsApproved: 0, verificationsRejected: 0, avgResponseMinutes: resp, chatViolations: user.chat_violations, accountAgeDays: ageDays }, 'buyer');
  const breakdown = {
    seller: { ...seller.parts, stats: { completed: sCompleted, disputes_against: sAgainst, disputes_lost: sLost, cancellations: sCancel, verifications_approved: vOk, verifications_rejected: vRej } },
    buyer: { ...buyer.parts, stats: { completed: bCompleted, disputes_against: bAgainst, disputes_lost: bLost, cancellations: bCancel } },
    avg_response_minutes: resp === null ? null : Math.round(resp),
  };
  await env.DB.prepare('UPDATE users SET trust_seller = ?, trust_buyer = ?, trust_breakdown = ?, trust_updated_at = ? WHERE id = ?')
    .bind(seller.score, buyer.score, JSON.stringify(breakdown), now(), userId).run();
}
