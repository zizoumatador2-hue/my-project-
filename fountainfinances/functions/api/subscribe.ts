import { type Env, json, redirect, wantsJson, originAllowed, readBody, normalizeEmail, isEmail, safePath, sha256, randomToken, now, rateLimit, housekeeping, verifyTurnstile, dbReady } from '../_lib/http';
import { emailConfigured, sendEmail, confirmationEmail } from '../_lib/email';

const CONSENT_TEXT = 'I agree to receive the Fountain Finances newsletter and accept the Privacy Policy.';
const GENERIC_OK = 'Almost done — check your inbox and click the link to confirm your subscription.';

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const asJson = wantsJson(request);
  const fail = (status: number, error: string) => (asJson ? json(status, { error }) : redirect(`/newsletter/error/`));
  if (!dbReady(env)) return fail(503, 'Newsletter sign-up is temporarily unavailable. Please try again later.');
  if (!originAllowed(request, env)) return fail(403, 'This request could not be verified. Please reload the page and try again.');

  const body = await readBody(request);
  if (!body) return fail(400, 'Please submit the form again.');
  if (body.company) return asJson ? json(200, { message: GENERIC_OK }) : redirect('/newsletter/check-email/'); // honeypot

  const email = normalizeEmail(body.email || '');
  if (!isEmail(email)) return fail(400, 'Please enter a valid email address.');
  if (body.consent !== 'yes' && body.consent !== 'on' && body.consent !== 'true') return fail(400, 'Please confirm you would like to receive the newsletter.');
  if (!(await verifyTurnstile(env, request, body['cf-turnstile-response']))) return fail(400, 'Please complete the verification challenge.');
  if (!(await rateLimit(env, request, 'subscribe', 5, 3600))) return fail(429, 'Too many attempts. Please try again later.');
  if (!emailConfigured(env)) return fail(503, 'Newsletter sign-up is temporarily unavailable. Please try again later.');

  const existing = await env.DB.prepare('SELECT status FROM subscribers WHERE email = ?1').bind(email).first<{ status: string }>();
  // Don't reveal whether an address is already subscribed.
  if (existing?.status === 'confirmed') return asJson ? json(200, { message: GENERIC_OK }) : redirect('/newsletter/check-email/');

  const confirmToken = randomToken();
  const unsubToken = randomToken();
  const t = now();
  const source = safePath(body.path);
  await env.DB.prepare(
    `INSERT INTO subscribers (email, status, confirm_hash, confirm_expires, unsub_hash, source_path, consent_text, created_at)
     VALUES (?1, 'pending', ?2, ?3, ?4, ?5, ?6, ?7)
     ON CONFLICT (email) DO UPDATE SET status = 'pending', confirm_hash = ?2, confirm_expires = ?3, unsub_hash = ?4,
       source_path = ?5, consent_text = ?6, created_at = ?7, unsubscribed_at = NULL`,
  )
    .bind(email, await sha256(confirmToken), t + 7 * 86_400, await sha256(unsubToken), source, CONSENT_TEXT, t)
    .run();

  const site = env.SITE_URL.replace(/\/$/, '');
  const confirmUrl = `${site}/api/confirm?token=${confirmToken}`;
  const unsubUrl = `${site}/api/unsubscribe?token=${unsubToken}`;
  const { text, html } = confirmationEmail(site, confirmUrl, unsubUrl);
  try {
    await sendEmail(env, {
      to: email,
      subject: 'Confirm your Fountain Finances subscription',
      text,
      html,
      headers: { 'List-Unsubscribe': `<${unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    });
  } catch {
    return fail(502, 'We couldn’t send the confirmation email right now. Please try again in a few minutes.');
  }
  waitUntil(housekeeping(env));
  return asJson ? json(200, { message: GENERIC_OK }) : redirect('/newsletter/check-email/');
};

