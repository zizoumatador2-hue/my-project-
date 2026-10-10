import { sha256Hex } from './crypto';

export function clientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0';
}

export async function ipHash(request: Request, secret = ''): Promise<string> {
  return (await sha256Hex(`${secret}:${clientIp(request)}`)).slice(0, 32);
}

/**
 * Fixed-window rate limiter backed by D1. Returns true when the action is allowed.
 * Atomic via a single UPSERT … RETURNING.
 */
export async function rateLimit(db: D1Database, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % windowSeconds);
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (key, window_start, count) VALUES (?1, ?2, 1)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN rate_limits.window_start < ?2 THEN 1 ELSE rate_limits.count + 1 END,
         window_start = CASE WHEN rate_limits.window_start < ?2 THEN ?2 ELSE rate_limits.window_start END
       RETURNING count`,
    )
    .bind(key, windowStart)
    .first<{ count: number }>();
  return (row?.count ?? 0) <= limit;
}

/** Strips control characters and trims; keeps newlines for multi-line text. */
export function cleanText(input: unknown, max = 5000, multiline = false): string {
  if (typeof input !== 'string') return '';
  const re = multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g;
  return input.replace(re, '').trim().slice(0, max);
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export async function verifyTurnstile(env: Env, token: string | null, ip: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true; // Turnstile disabled
  if (!token) return false;
  const body = new FormData();
  body.set('secret', env.TURNSTILE_SECRET_KEY);
  body.set('response', token);
  body.set('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

const SIGNATURES: { type: string; ext: string; test: (b: Uint8Array) => boolean }[] = [
  { type: 'image/jpeg', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: 'image/png', ext: 'png', test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  {
    type: 'image/webp',
    ext: 'webp',
    test: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
];

/** Identifies an image by its magic bytes (never trusts the client-provided MIME type). */
export function sniffImage(bytes: Uint8Array): { type: string; ext: string } | null {
  if (bytes.length < 12) return null;
  const hit = SIGNATURES.find((s) => s.test(bytes));
  return hit ? { type: hit.type, ext: hit.ext } : null;
}

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
