import type { APIRoute } from 'astro';
import { leadSchema, formToObject, zodErrors } from '../../lib/validation';
import { createLead } from '../../lib/leads';
import { clientIp, ipHash, rateLimit, verifyTurnstile } from '../../lib/security';
import { safeNext } from '../../lib/auth';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const env = locals.runtime.env;
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  const fd = await request.formData();
  const back = safeNext(String(fd.get('return_to') ?? '/'), '/');
  const fail = (error: string, status = 400) =>
    wantsJson
      ? Response.json({ ok: false, error }, { status })
      : redirect(`${back}?lead_err=${encodeURIComponent(error)}#lead-form`, 303);

  // Honeypot: bots fill hidden fields. Pretend success so they don't retry.
  if (String(fd.get('website') ?? '').trim()) return wantsJson ? Response.json({ ok: true }) : redirect(`${back}?lead=sent#lead-form`, 303);

  const ip = clientIp(request);
  if (!(await rateLimit(env.DB, `lead:${ip}`, 8, 600))) return fail('Too many requests. Please wait a few minutes and try again.', 429);
  if (!(await verifyTurnstile(env, fd.get('cf-turnstile-response') as string | null, ip))) return fail('Please complete the verification challenge.');

  const parsed = leadSchema.safeParse(formToObject(fd));
  if (!parsed.success) return fail(Object.values(zodErrors(parsed.error))[0] ?? 'Please check the form.');

  const result = await createLead(env, parsed.data, {
    userId: locals.user?.id ?? null,
    ipHash: await ipHash(request, env.SESSION_SECRET),
    path: back,
  });
  if (!result.ok) return fail(result.error, 422);
  return wantsJson ? Response.json({ ok: true, id: result.id }) : redirect(`${back}?lead=sent#lead-form`, 303);
};
