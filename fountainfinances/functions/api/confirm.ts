import { type Env, redirect, sha256, now, dbReady } from '../_lib/http';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!dbReady(env)) return redirect('/newsletter/error/');
  const token = new URL(request.url).searchParams.get('token') || '';
  if (!/^[a-f0-9]{64}$/.test(token)) return redirect('/newsletter/error/');
  const hash = await sha256(token);
  const t = now();
  const res = await env.DB.prepare(
    `UPDATE subscribers SET status = 'confirmed', confirmed_at = ?2, confirm_hash = NULL, confirm_expires = NULL
     WHERE confirm_hash = ?1 AND status = 'pending' AND confirm_expires >= ?2`,
  )
    .bind(hash, t)
    .run();
  return redirect(res.meta.changes > 0 ? '/newsletter/confirmed/' : '/newsletter/error/');
};
