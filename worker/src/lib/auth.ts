import type { Context, MiddlewareHandler } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { ROLE_PERMISSIONS, type Permission, type Role } from '../../../shared/domain';
import type { AppEnv, Env, SessionUser } from '../env';
import { randomToken, sha256Hex, timingSafeEqual } from './crypto';
import { clientIp, DAY, HttpError, now } from './util';

const SESSION_TTL = 7 * DAY;

export function cookieName(env: Env) {
  return env.ENVIRONMENT === 'production' ? '__Host-tt_session' : 'tt_session';
}

export function can(role: Role, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(perm) ?? false;
}

export async function createSession(c: Context<AppEnv>, userId: string): Promise<{ csrf: string }> {
  const token = randomToken(32);
  const csrf = randomToken(24);
  const id = await sha256Hex(token);
  const t = now();
  await c.env.DB.prepare('INSERT INTO sessions (id, user_id, csrf_token, ip, user_agent, created_at, expires_at) VALUES (?,?,?,?,?,?,?)')
    .bind(id, userId, csrf, clientIp(c.req.raw), (c.req.header('user-agent') || '').slice(0, 200), t, t + SESSION_TTL).run();
  setCookie(c, cookieName(c.env), token, {
    httpOnly: true,
    secure: c.env.ENVIRONMENT === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_TTL / 1000,
  });
  return { csrf };
}

export async function destroySession(c: Context<AppEnv>) {
  const sid = c.get('sessionId');
  if (sid) await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sid).run();
  deleteCookie(c, cookieName(c.env), { path: '/', secure: c.env.ENVIRONMENT === 'production' });
}

/** Loads the session (if any) into context. Never throws for anonymous requests. */
export const loadSession: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set('user', null);
  c.set('sessionId', null);
  c.set('csrf', null);
  const token = getCookie(c, cookieName(c.env));
  if (token && token.length < 128) {
    const id = await sha256Hex(token);
    const row = await c.env.DB.prepare(
      `SELECT s.id AS sid, s.csrf_token, s.expires_at, u.id, u.email, u.display_name, u.role, u.status
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`,
    ).bind(id).first<{ sid: string; csrf_token: string; expires_at: number } & SessionUser>();
    if (row && row.expires_at > now() && row.status === 'active') {
      c.set('user', { id: row.id, email: row.email, display_name: row.display_name, role: row.role, status: row.status });
      c.set('sessionId', row.sid);
      c.set('csrf', row.csrf_token);
    } else if (row) {
      await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(id).run();
    }
  }
  await next();
};

/**
 * CSRF defence for state-changing requests:
 *  1. Origin (or Referer) must match the app origin — blocks cross-site form/fetch posts.
 *  2. Authenticated requests must echo the per-session CSRF token in `X-CSRF-Token` (synchronizer token).
 *  SameSite=Lax cookies provide a third layer.
 */
export const csrfGuard: MiddlewareHandler<AppEnv> = async (c, next) => {
  const m = c.req.method;
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return next();
  const reqOrigin = new URL(c.req.url).origin;
  const origin = c.req.header('origin') || (c.req.header('referer') ? new URL(c.req.header('referer')!).origin : null);
  if (!origin || (origin !== reqOrigin && origin !== new URL(c.env.APP_URL).origin)) {
    throw new HttpError(403, 'bad_origin', 'طلب مرفوض (مصدر غير موثوق).');
  }
  const expected = c.get('csrf');
  if (expected) {
    const got = c.req.header('x-csrf-token') || '';
    if (!timingSafeEqual(got, expected)) throw new HttpError(403, 'csrf', 'انتهت صلاحية الجلسة الأمنية. حدّث الصفحة وأعد المحاولة.');
  }
  await next();
};

export function requireUser(c: Context<AppEnv>): SessionUser {
  const u = c.get('user');
  if (!u) throw new HttpError(401, 'unauthenticated', 'يجب تسجيل الدخول.');
  return u;
}

export function requirePerm(c: Context<AppEnv>, perm: Permission): SessionUser {
  const u = requireUser(c);
  if (!can(u.role, perm)) throw new HttpError(403, 'forbidden', 'ليست لديك صلاحية لهذا الإجراء.');
  return u;
}
