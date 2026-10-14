// Every sensitive admin action writes one row here. Values are truncated and never include secrets.
import { type Env, now, sha256 } from './http';

export interface AuditChange {
  target: { type: string; id: string | number };
  before?: unknown;
  after?: unknown;
  reason?: string;
}

const clip = (v: unknown, max = 500): string | null => {
  if (v === undefined || v === null) return null;
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length > max ? `${s.slice(0, max)}…` : s;
};

export async function logAudit(env: Env, req: Request, actor: string, action: string, change: AuditChange): Promise<void> {
  const ip = req.headers.get('cf-connecting-ip') || 'unknown';
  const ipHash = (await sha256(`${env.IP_HASH_SALT}:${ip}`)).slice(0, 16);
  await env.DB.prepare(
    `INSERT INTO admin_audit_log (created_at, actor, action, target_type, target_id, old_value, new_value, reason, ip_hash, user_agent)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
  )
    .bind(
      now(),
      actor,
      action,
      change.target.type,
      String(change.target.id),
      clip(change.before),
      clip(change.after),
      clip(change.reason, 300),
      ipHash,
      clip(req.headers.get('user-agent'), 200),
    )
    .run();
}
