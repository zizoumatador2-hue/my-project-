import { type Env, json, redirect, wantsJson, originAllowed, readBody, normalizeEmail, isEmail, sha256, now, rateLimit } from '../_lib/http';

const DONE = 'Done. If that address was subscribed, it will not receive any more newsletters.';

async function byToken(env: Env, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return false;
  const res = await env.DB.prepare(
    `UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = ?2, confirm_hash = NULL WHERE unsub_hash = ?1 AND status != 'unsubscribed'`,
  )
    .bind(await sha256(token), now())
    .run();
  return res.meta.changes > 0 || (await env.DB.prepare('SELECT 1 FROM subscribers WHERE unsub_hash = ?1').bind(await sha256(token)).first()) !== null;
}

/** Link in emails: GET /api/unsubscribe?token=… */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const token = new URL(request.url).searchParams.get('token') || '';
  return redirect((await byToken(env, token)) ? '/newsletter/unsubscribed/' : '/newsletter/error/');
};

/** RFC 8058 one-click (token in query) or the on-site form (email in body). */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const token = new URL(request.url).searchParams.get('token');
  if (token) {
    await byToken(env, token);
    return new Response(null, { status: 200 });
  }
  const asJson = wantsJson(request);
  if (!originAllowed(request, env)) return asJson ? json(403, { error: 'This request could not be verified. Please reload the page.' }) : redirect('/newsletter/error/');
  const body = await readBody(request);
  if (!body) return json(400, { error: 'Please submit the form again.' });
  if (body.company) return asJson ? json(200, { message: DONE }) : redirect('/newsletter/unsubscribed/');
  const email = normalizeEmail(body.email || '');
  if (!isEmail(email)) return asJson ? json(400, { error: 'Please enter a valid email address.' }) : redirect('/newsletter/error/');
  if (!(await rateLimit(env, request, 'unsubscribe', 10, 3600))) return json(429, { error: 'Too many attempts. Please try again later.' });
  await env.DB.prepare(
    `UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = ?2, confirm_hash = NULL WHERE email = ?1 AND status != 'unsubscribed'`,
  )
    .bind(email, now())
    .run();
  return asJson ? json(200, { message: DONE }) : redirect('/newsletter/unsubscribed/');
};
