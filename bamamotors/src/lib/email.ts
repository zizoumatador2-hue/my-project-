import { insert, nowIso, run } from './db';

/** Whether transactional email is actually delivered (otherwise it is only logged to email_outbox). */
export const emailEnabled = (env: Env): boolean => Boolean(env.RESEND_API_KEY);

/**
 * Sends a plain-text transactional email.
 * With RESEND_API_KEY set, delivers through Resend's HTTP API; otherwise the message is
 * recorded in email_outbox with status "logged" (visible to admins) so no message is lost.
 */
export async function sendEmail(env: Env, to: string, subject: string, body: string): Promise<boolean> {
  const id = await insert(env.DB, 'INSERT INTO email_outbox (to_email, subject, body) VALUES (?,?,?)', [to, subject, body]);
  if (!emailEnabled(env)) {
    await run(env.DB, "UPDATE email_outbox SET status = 'logged' WHERE id = ?", [id]);
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_FROM || 'BamaMotors <no-reply@bamamotors.com>', to: [to], subject, text: body }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
    await run(env.DB, "UPDATE email_outbox SET status = 'sent' WHERE id = ?", [id]);
    return true;
  } catch (e) {
    await run(env.DB, "UPDATE email_outbox SET status = 'failed', error = ? WHERE id = ?", [String(e).slice(0, 500), id]);
    return false;
  }
}

export async function markNotificationsRead(db: D1Database, userId: number): Promise<void> {
  await run(db, 'UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL', [nowIso(), userId]);
}

export async function notify(db: D1Database, userId: number, title: string, body: string, link: string): Promise<void> {
  await run(db, 'INSERT INTO notifications (user_id, title, body, link) VALUES (?,?,?,?)', [userId, title, body, link]);
}

export async function notifyAdmins(db: D1Database, title: string, body: string, link: string): Promise<void> {
  await run(
    db,
    `INSERT INTO notifications (user_id, title, body, link)
     SELECT id, ?, ?, ? FROM users WHERE role = 'admin' AND status = 'active' AND password_hash LIKE 'pbkdf2$%'`,
    [title, body, link],
  );
}
