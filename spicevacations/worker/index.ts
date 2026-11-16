/**
 * SpiceVacations edge Worker. Static pages are served directly from Workers Static
 * Assets; only /api/* and /go/* reach this code (see wrangler.jsonc run_worker_first).
 */
import { plan, type IndexItem, type PlanInput } from '../src/lib/planner-core';
import { ContactSchema, NewsletterSchema, PlanSchema, formToObject } from '../src/lib/validation';
import { llmPlan } from './llm';

interface RateLimiter {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  ASSETS: Fetcher;
  DATA: KVNamespace;
  FORM_LIMITER?: RateLimiter;
  PLAN_LIMITER?: RateLimiter;
  SITE_URL: string;
  PLANNER_PROVIDER?: string;
  PLANNER_LLM_MODEL?: string;
  ANTHROPIC_API_KEY?: string;
  RESEND_API_KEY?: string;
  CONTACT_TO?: string;
  CONTACT_FROM?: string;
  TURNSTILE_SECRET_KEY?: string;
}

const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
};

function withHeaders(res: Response, extra: Record<string, string> = {}) {
  const r = new Response(res.body, res);
  for (const [k, v] of Object.entries({ ...SECURITY_HEADERS, ...extra })) r.headers.set(k, v);
  return r;
}

const json = (data: unknown, status = 200) =>
  withHeaders(new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }));

const wantsJson = (req: Request) => (req.headers.get('Accept') || '').includes('application/json');

function redirect(to: string, status = 303) {
  return withHeaders(new Response(null, { status, headers: { Location: to, 'Cache-Control': 'no-store' } }));
}

async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** CSRF defense: state-changing requests must come from our own origin. */
export function sameOrigin(req: Request, env: Env) {
  const url = new URL(req.url);
  const allowed = new Set([url.origin, new URL(env.SITE_URL).origin, new URL(env.SITE_URL).origin.replace('://', '://www.')]);
  const site = req.headers.get('Sec-Fetch-Site');
  if (site && !['same-origin', 'none'].includes(site)) return false;
  const origin = req.headers.get('Origin');
  if (origin) return allowed.has(origin);
  const ref = req.headers.get('Referer');
  if (ref) {
    try {
      return allowed.has(new URL(ref).origin);
    } catch {
      return false;
    }
  }
  return false;
}

async function limited(limiter: RateLimiter | undefined, req: Request, bucket: string) {
  if (!limiter) return false;
  const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
  const { success } = await limiter.limit({ key: `${bucket}:${await sha256(ip)}` });
  return !success;
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const type = req.headers.get('Content-Type') || '';
  if (type.includes('application/json')) return (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (type.includes('form')) return formToObject(await req.formData());
  return {};
}

async function verifyTurnstile(env: Env, token: unknown, ip: string | null) {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (typeof token !== 'string' || !token) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET_KEY);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const d = (await r.json().catch(() => ({}))) as { success?: boolean };
  return Boolean(d.success);
}

const firstIssue = (e: { issues: { message: string }[] }) => e.issues[0]?.message || 'Please check the form and try again.';

async function handleContact(req: Request, env: Env, ctx: ExecutionContext) {
  if (await limited(env.FORM_LIMITER, req, 'contact')) return fail(req, 'Too many messages. Please wait a minute and try again.', 429, '/contact/');
  const body = await readBody(req);
  if (typeof body.website === 'string' && body.website) return done(req, 'Thanks! Your message has been sent.', '/contact/thanks/'); // honeypot: pretend success
  const ts = Number(body.ts);
  if (ts && Date.now() - ts < 2500) return done(req, 'Thanks! Your message has been sent.', '/contact/thanks/'); // submitted faster than a human can type
  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) return fail(req, firstIssue(parsed.error), 400, '/contact/');
  if (!(await verifyTurnstile(env, body['cf-turnstile-response'], req.headers.get('CF-Connecting-IP'))))
    return fail(req, 'Please complete the security check.', 400, '/contact/');
  const { name, email, topic, message } = parsed.data;
  const id = `contact:${new Date().toISOString()}:${crypto.randomUUID().slice(0, 8)}`;
  await env.DATA.put(id, JSON.stringify({ name, email, topic, message, receivedAt: new Date().toISOString(), country: req.headers.get('CF-IPCountry') }), {
    expirationTtl: 60 * 60 * 24 * 180,
  });
  if (env.RESEND_API_KEY && env.CONTACT_TO) {
    ctx.waitUntil(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.CONTACT_FROM || 'SpiceVacations <onboarding@resend.dev>',
          to: [env.CONTACT_TO],
          reply_to: email,
          subject: `[SpiceVacations] ${topic}: message from ${name}`,
          text: `${message}\n\n— ${name} <${email}>`,
        }),
      }).catch(() => undefined),
    );
  }
  return done(req, "Thanks! Your message has been sent. We'll reply within two business days.", '/contact/thanks/');
}

async function handleNewsletter(req: Request, env: Env) {
  if (await limited(env.FORM_LIMITER, req, 'newsletter')) return fail(req, 'Too many attempts. Please try again in a minute.', 429, '/');
  const body = await readBody(req);
  if (typeof body.website === 'string' && body.website) return done(req, "You're on the list!", '/newsletter/thanks/');
  const parsed = NewsletterSchema.safeParse(body);
  if (!parsed.success) return fail(req, firstIssue(parsed.error), 400, '/');
  const email = parsed.data.email.toLowerCase();
  const key = `newsletter:${await sha256(email)}`;
  const existing = await env.DATA.get(key);
  if (!existing) await env.DATA.put(key, JSON.stringify({ email, source: parsed.data.source ?? 'site', subscribedAt: new Date().toISOString() }));
  return done(req, "You're on the list! Look out for our next edition.", '/newsletter/thanks/');
}

let indexCache: { at: number; items: IndexItem[] } | undefined;
async function loadIndex(req: Request, env: Env) {
  if (indexCache && Date.now() - indexCache.at < 5 * 60_000) return indexCache.items;
  const r = await env.ASSETS.fetch(new URL('/search-index.json', req.url));
  const d = (await r.json()) as { items: IndexItem[] };
  indexCache = { at: Date.now(), items: d.items };
  return d.items;
}

async function handlePlan(req: Request, env: Env) {
  if (await limited(env.PLAN_LIMITER, req, 'plan')) return json({ ok: false, error: 'Too many requests. Please wait a minute.' }, 429);
  const parsed = PlanSchema.safeParse(await readBody(req));
  if (!parsed.success) return json({ ok: false, error: firstIssue(parsed.error) }, 400);
  const input = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== '' && v !== undefined)) as PlanInput;
  if (!input.text && !input.destination && !input.vacationType && !input.budget && !input.interests?.length)
    return json({ ok: false, error: 'Tell us at least a budget, a trip style, a destination or a few words about your dream trip.' }, 400);
  const items = await loadIndex(req, env);
  const base = plan(items, input);
  if (env.PLANNER_PROVIDER === 'llm' && env.ANTHROPIC_API_KEY) {
    const enriched = await llmPlan(env, items, base).catch(() => null);
    if (enriched) return json({ ok: true, result: enriched });
  }
  return json({ ok: true, result: base });
}

type GoEntry = { url: string; partner: string; fallback: string };
let goCache: { at: number; map: Record<string, GoEntry> } | undefined;

async function handleGo(req: Request, env: Env, ctx: ExecutionContext, path: string) {
  const id = path.replace(/^\/go\//, '').replace(/\/$/, '');
  if (!goCache || Date.now() - goCache.at > 5 * 60_000) {
    const r = await env.ASSETS.fetch(new URL('/go-map.json', req.url));
    goCache = { at: Date.now(), map: (await r.json()) as Record<string, GoEntry> };
  }
  const hit = goCache.map[id];
  if (!hit) return redirect('/', 302);
  // Click tracking without personal data: a daily counter per link.
  const day = new Date().toISOString().slice(0, 10);
  ctx.waitUntil(
    (async () => {
      const k = `click:${day}:${id}`;
      const n = Number((await env.DATA.get(k)) || 0) + 1;
      await env.DATA.put(k, String(n), { expirationTtl: 60 * 60 * 24 * 400 });
    })().catch(() => undefined),
  );
  return withHeaders(new Response(null, { status: 302, headers: { Location: hit.url, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } }), {
    'Referrer-Policy': 'origin',
  });
}

function done(req: Request, message: string, next: string) {
  return wantsJson(req) ? json({ ok: true, message }) : redirect(next);
}
function fail(req: Request, error: string, status: number, back: string) {
  // Never echo personal data in URLs: only a generic error flag.
  return wantsJson(req) ? json({ ok: false, error }, status) : redirect(`${back}?error=1`);
}

async function errorPage(req: Request, env: Env) {
  try {
    const page = await env.ASSETS.fetch(new URL('/500', req.url));
    return withHeaders(new Response(page.body, { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
  } catch {
    return new Response('Something went wrong.', { status: 500 });
  }
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    try {
      if (path.startsWith('/go/')) return await handleGo(req, env, ctx, path);
      if (path === '/api/health') return json({ ok: true, service: 'spicevacations', time: new Date().toISOString() });
      if (path.startsWith('/api/')) {
        if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);
        if (!sameOrigin(req, env)) return json({ ok: false, error: 'Cross-site request blocked.' }, 403);
        if (path === '/api/contact') return await handleContact(req, env, ctx);
        if (path === '/api/newsletter') return await handleNewsletter(req, env);
        if (path === '/api/plan') return await handlePlan(req, env);
        return json({ ok: false, error: 'Not found' }, 404);
      }
      return env.ASSETS.fetch(req);
    } catch (err) {
      console.error('worker error', path, (err as Error).message);
      return path.startsWith('/api/') ? json({ ok: false, error: 'Something went wrong. Please try again.' }, 500) : errorPage(req, env);
    }
  },
} satisfies ExportedHandler<Env>;
