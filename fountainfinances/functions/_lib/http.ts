export interface Env {
  /** Can be missing at runtime when the Pages project has no D1 binding; check with `dbReady`. */
  DB: D1Database;
  SITE_URL: string;
  /** Extra comma-separated origins allowed to POST (e.g. a preview domain). */
  ALLOWED_ORIGINS?: string;
  IP_HASH_SALT: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  CONTACT_TO_EMAIL?: string;
  TURNSTILE_SECRET_KEY?: string;
}

const SECURITY_HEADERS = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

export const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...SECURITY_HEADERS } });

export const redirect = (url: string) => new Response(null, { status: 303, headers: { location: url, ...SECURITY_HEADERS } });

/** Browsers submitting without JavaScript get redirects; fetch() callers get JSON. */
export const wantsJson = (req: Request) => (req.headers.get('accept') || '').includes('application/json');

/**
 * CSRF defense for cookie-less endpoints: only accept same-site POSTs.
 * Browsers always send Origin on cross-origin POSTs, so a missing or foreign Origin is rejected.
 */
export function originAllowed(req: Request, env: Env): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  const allowed = new Set([new URL(env.SITE_URL).origin, new URL(req.url).origin]);
  for (const o of (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)) allowed.add(o);
  return allowed.has(origin);
}

export async function readBody(req: Request): Promise<Record<string, string> | null> {
  const type = (req.headers.get('content-type') || '').split(';')[0].trim();
  const len = Number(req.headers.get('content-length') || 0);
  if (len > 20_000) return null;
  try {
    if (type === 'application/json') {
      const data = (await req.json()) as Record<string, unknown>;
      if (!data || typeof data !== 'object') return null;
      return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, typeof v === 'string' ? v : String(v ?? '')]));
    }
    if (type === 'application/x-www-form-urlencoded' || type === 'multipart/form-data') {
      const form = await req.formData();
      const out: Record<string, string> = {};
      form.forEach((v, k) => (out[k] = typeof v === 'string' ? v : ''));
      return out;
    }
  } catch {
    return null;
  }
  return null;
}

const EMAIL_RE = /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[A-Za-z]{2,}$/;
export const normalizeEmail = (s: string) => s.trim().toLowerCase();
export const isEmail = (s: string) => s.length <= 254 && EMAIL_RE.test(s);
export const clean = (s: string, max: number) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
export const safePath = (s: string | undefined) => (s && /^\/[\w\-/.]{0,200}$/.test(s) ? s : null);

export async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomToken(bytes = 32): string {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const now = () => Math.floor(Date.now() / 1000);

/** Fixed-window rate limit stored in D1. Returns true when the request is allowed. */
export async function rateLimit(env: Env, req: Request, scope: string, limit: number, windowSec: number): Promise<boolean> {
  // Behind the edge Worker (custom domain) the visitor's IP arrives in x-ff-client-ip;
  // cf-worker is set by Cloudflare on Worker subrequests and cannot come from a browser.
  const viaEdge = req.headers.get('cf-worker') === 'fountainfinances.com';
  const ip = (viaEdge && req.headers.get('x-ff-client-ip')) || req.headers.get('cf-connecting-ip') || 'unknown';
  const bucket = `${scope}:${await sha256(`${env.IP_HASH_SALT}:${ip}`)}`;
  const windowStart = Math.floor(now() / windowSec) * windowSec;
  const row = await env.DB.prepare(
    `INSERT INTO rate_limits (bucket, window_start, count) VALUES (?1, ?2, 1)
     ON CONFLICT (bucket, window_start) DO UPDATE SET count = count + 1
     RETURNING count`,
  )
    .bind(bucket, windowStart)
    .first<{ count: number }>();
  return (row?.count ?? 1) <= limit;
}

/** Opportunistic housekeeping so retention promises in the privacy policy hold without a cron. */
export async function housekeeping(env: Env) {
  if (Math.random() > 0.1) return;
  const t = now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM rate_limits WHERE window_start < ?1').bind(t - 86_400),
    env.DB.prepare("DELETE FROM subscribers WHERE status = 'pending' AND created_at < ?1").bind(t - 30 * 86_400),
    env.DB.prepare('DELETE FROM contact_messages WHERE created_at < ?1').bind(t - 730 * 86_400),
  ]);
}

export async function verifyTurnstile(env: Env, req: Request, token: string | undefined): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true; // optional hardening; enabled when the secret is configured
  if (!token) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET_KEY);
  body.append('response', token);
  const ip = req.headers.get('cf-connecting-ip');
  if (ip) body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const data = (await res.json().catch(() => ({}))) as { success?: boolean };
  return data.success === true;
}

/** True when the D1 binding exists, so form handlers can fail with a clear 503 instead of crashing. */
export const dbReady = (env: Env): boolean => Boolean((env as { DB?: D1Database }).DB);
