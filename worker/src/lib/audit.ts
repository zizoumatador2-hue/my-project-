import type { Env } from '../env';
import { newId, now } from './util';

/** Append-only audit trail. Never pass secrets, passwords or decrypted evidence in `details`. */
export function auditStmt(env: Env, a: { actorId: string | null; action: string; subjectType?: string; subjectId?: string; details?: unknown; ip?: string }) {
  return env.DB.prepare(
    'INSERT INTO audit_log (id, actor_id, action, subject_type, subject_id, details, ip, created_at) VALUES (?,?,?,?,?,?,?,?)',
  ).bind(newId('aud'), a.actorId, a.action, a.subjectType ?? null, a.subjectId ?? null, a.details === undefined ? null : JSON.stringify(a.details), a.ip ?? null, now());
}

export async function audit(env: Env, a: Parameters<typeof auditStmt>[1]) {
  await auditStmt(env, a).run();
}

export function notifyStmt(env: Env, userId: string, title: string, body: string, link?: string) {
  return env.DB.prepare('INSERT INTO notifications (id, user_id, title, body, link, created_at) VALUES (?,?,?,?,?,?)')
    .bind(newId('ntf'), userId, title, body, link ?? null, now());
}
