import { first, insert, run, nowIso, audit } from './db';
import { LEAD_STATUSES } from './constants';
import { sendEmail } from './email';

export interface LeadRow {
  id: number; type: string; vehicle_id: number | null; dealer_id: number | null; user_id: number | null; name: string; email: string;
  phone: string | null; message: string | null; preferred_date: string | null; vehicle_label: string | null; status: string;
  source_path: string | null; created_at: string; updated_at: string; vehicle_slug: string | null; dealer_name: string | null;
}

export const getLead = (db: D1Database, id: number) =>
  first<LeadRow>(db, `SELECT l.*, v.slug AS vehicle_slug, d.name AS dealer_name FROM leads l
    LEFT JOIN vehicles v ON v.id = l.vehicle_id LEFT JOIN dealers d ON d.id = l.dealer_id WHERE l.id = ?`, [id]);

/** Handles status changes, replies (emailed to the shopper) and internal notes for a lead. */
export async function handleLeadPost(env: Env, lead: LeadRow, fd: FormData, actor: { id: number; name: string }, replyFrom: string): Promise<string | null> {
  const action = String(fd.get('action') ?? '');
  if (action === 'status') {
    const status = String(fd.get('status'));
    if (!(LEAD_STATUSES as readonly string[]).includes(status)) return 'Invalid status';
    await run(env.DB, 'UPDATE leads SET status = ?, updated_at = ? WHERE id = ?', [status, nowIso(), lead.id]);
    await audit(env.DB, actor.id, 'lead.status', 'lead', lead.id, { status });
    return null;
  }
  if (action === 'reply' || action === 'note') {
    const body = String(fd.get('body') ?? '').trim().slice(0, 5000);
    if (body.length < 2) return 'Write a message first.';
    let emailed = 0;
    if (action === 'reply') {
      const subject = `Re: your inquiry${lead.vehicle_label ? ` about the ${lead.vehicle_label.split(', ')[0]}` : ''}`;
      emailed = (await sendEmail(env, lead.email, subject, `Hi ${lead.name},\n\n${body}\n\n— ${replyFrom}\n(sent via BamaMotors)`)) ? 1 : 0;
      if (lead.status === 'new') await run(env.DB, "UPDATE leads SET status = 'contacted', updated_at = ? WHERE id = ?", [nowIso(), lead.id]);
    }
    await insert(env.DB, 'INSERT INTO lead_messages (lead_id, author_id, kind, body, emailed) VALUES (?,?,?,?,?)', [lead.id, actor.id, action, body, emailed]);
    return null;
  }
  return 'Unknown action';
}
