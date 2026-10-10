// Unsubscribes one address. Requires the full email typed back, and writes an audit entry.
import type { Env } from '../../_lib/http';
import { redirect, readBody, dbReady, clean, now } from '../../_lib/http';
import type { AdminData } from '../_middleware';
import { logAudit } from '../../_lib/audit';

export const onRequestPost: PagesFunction<Env, 'id', AdminData> = async ({ request, env, params, data }) => {
  const id = Number(Array.isArray(params.id) ? params.id[0] : params.id);
  if (!dbReady(env) || !Number.isInteger(id) || id < 1) return new Response('Not found', { status: 404 });

  const body = await readBody(request);
  const row = await env.DB.prepare('SELECT email, status FROM subscribers WHERE id = ?1').bind(id).first<{ email: string; status: string }>();
  if (!row) return new Response('Not found', { status: 404 });
  if (row.status === 'unsubscribed') return redirect(`/admin/subscribers?done=${id}`);

  // The admin must type the exact address. This stops a stray click from removing someone.
  if ((body?.confirm ?? '').trim().toLowerCase() !== row.email.toLowerCase()) {
    return redirect(`/admin/subscribers?error=confirm`);
  }

  await env.DB.prepare("UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = ?1 WHERE id = ?2").bind(now(), id).run();
  await logAudit(env, request, data.admin, 'subscriber.unsubscribe', {
    target: { type: 'subscriber', id },
    before: row.status,
    after: 'unsubscribed',
    reason: clean(body?.reason ?? '', 300) || undefined,
  });
  return redirect(`/admin/subscribers?done=${id}`);
};
