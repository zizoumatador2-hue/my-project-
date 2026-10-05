import { type Env, json, redirect, wantsJson, originAllowed, readBody, normalizeEmail, isEmail, clean, safePath, now, rateLimit, housekeeping, verifyTurnstile, dbReady } from '../_lib/http';
import { emailConfigured, sendEmail, escapeHtml } from '../_lib/email';

const TOPICS = new Set(['General question', 'Report an error or correction', 'Feedback on a calculator', 'Partnership or advertising', 'Privacy request']);

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const asJson = wantsJson(request);
  const fail = (status: number, error: string) => (asJson ? json(status, { error }) : redirect('/contact/?error=1'));
  if (!dbReady(env)) return fail(503, 'Our contact form is temporarily unavailable. Please email us at info.christopherkunz@gmail.com.');
  if (!originAllowed(request, env)) return fail(403, 'This request could not be verified. Please reload the page and try again.');
  const body = await readBody(request);
  if (!body) return fail(400, 'Please submit the form again.');
  if (body.company) return asJson ? json(200, { message: 'Thank you — your message has been sent.' }) : redirect('/contact/thanks/');

  const name = clean(body.name || '', 120);
  const email = normalizeEmail(body.email || '');
  const topic = TOPICS.has(body.topic) ? body.topic : 'General question';
  const message = clean(body.message || '', 5000);
  if (name.length < 2) return fail(400, 'Please enter your name.');
  if (!isEmail(email)) return fail(400, 'Please enter a valid email address.');
  if (message.length < 10) return fail(400, 'Please write a message of at least 10 characters.');
  if (body.consent !== 'yes' && body.consent !== 'on') return fail(400, 'Please tick the consent box so we can reply.');
  if (!(await verifyTurnstile(env, request, body['cf-turnstile-response']))) return fail(400, 'Please complete the verification challenge.');
  if (!(await rateLimit(env, request, 'contact', 5, 3600))) return fail(429, 'Too many messages. Please try again later or email us directly.');

  await env.DB.prepare('INSERT INTO contact_messages (name, email, topic, message, source_path, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
    .bind(name, email, topic, message, safePath(body.path), now())
    .run();

  if (emailConfigured(env) && env.CONTACT_TO_EMAIL) {
    waitUntil(
      sendEmail(env, {
        to: env.CONTACT_TO_EMAIL,
        replyTo: email,
        subject: `[Contact] ${topic} — ${name}`,
        text: `From: ${name} <${email}>\nTopic: ${topic}\n\n${message}`,
        html: `<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;<br><strong>Topic:</strong> ${escapeHtml(topic)}</p><pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(message)}</pre>`,
      }).catch(() => undefined),
    );
  }
  waitUntil(housekeeping(env));
  return asJson ? json(200, { message: 'Thank you — your message has been sent. We’ll reply by email.' }) : redirect('/contact/thanks/');
};

