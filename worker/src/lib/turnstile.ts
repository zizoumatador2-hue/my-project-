import type { Env } from '../env';
import { HttpError } from './util';

/**
 * Verifies a Cloudflare Turnstile token server-side.
 * - Production: fails closed if the secret is missing.
 * - Development/test without a secret: allowed (explicit dev bypass; see docs/DEPLOY.md).
 */
export async function verifyTurnstile(env: Env, token: string | undefined | null, ip: string, action?: string): Promise<void> {
  if (!env.TURNSTILE_SECRET_KEY) {
    if (env.ENVIRONMENT === 'production') throw new HttpError(503, 'turnstile_unconfigured', 'التحقق من الحماية غير مهيأ على الخادم.');
    return;
  }
  if (!token) throw new HttpError(400, 'turnstile_required', 'يرجى إكمال التحقق من أنك لست روبوتًا.');
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET_KEY);
  form.append('response', token);
  form.append('remoteip', ip);
  let ok = false;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const data = (await r.json()) as { success: boolean; action?: string };
    ok = data.success && (!action || !data.action || data.action === action);
  } catch {
    ok = false;
  }
  if (!ok) throw new HttpError(400, 'turnstile_failed', 'فشل التحقق من الحماية. أعد المحاولة.');
}
