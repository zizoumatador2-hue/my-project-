import type { AstroCookies } from 'astro';
import { first, run, nowIso, addDays } from './db';
import { randomToken, sha256Hex } from './crypto';

export const SESSION_COOKIE = 'bm_session';
const SESSION_DAYS = 30;

export type Role = 'consumer' | 'dealer' | 'admin';
export interface SessionUser {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  status: 'active' | 'suspended';
}

export async function createSession(db: D1Database, cookies: AstroCookies, userId: number, secure: boolean): Promise<void> {
  const token = randomToken(32);
  const expires = addDays(SESSION_DAYS);
  await run(db, 'INSERT INTO sessions (id, user_id, expires_at) VALUES (?,?,?)', [await sha256Hex(token), userId, expires]);
  await run(db, 'UPDATE users SET last_login_at = ? WHERE id = ?', [nowIso(), userId]);
  cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    expires: new Date(expires),
  });
}

export async function loadSessionUser(db: D1Database, token: string | undefined): Promise<SessionUser | null> {
  if (!token || token.length < 20 || token.length > 100) return null;
  const row = await first<SessionUser & { expires_at: string }>(
    db,
    `SELECT u.id, u.email, u.name, u.phone, u.role, u.status, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ?`,
    [await sha256Hex(token)],
  );
  if (!row || row.expires_at < nowIso() || row.status !== 'active') return null;
  const { expires_at: _e, ...user } = row;
  return user;
}

export async function destroySession(db: D1Database, cookies: AstroCookies): Promise<void> {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) await run(db, 'DELETE FROM sessions WHERE id = ?', [await sha256Hex(token)]);
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

export async function destroyAllSessions(db: D1Database, userId: number): Promise<void> {
  await run(db, 'DELETE FROM sessions WHERE user_id = ?', [userId]);
}

/** Only allow same-site relative redirects (prevents open redirects). */
export function safeNext(next: string | null | undefined, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}

export function homeFor(user: SessionUser): string {
  if (user.role === 'admin') return '/admin';
  if (user.role === 'dealer') return '/dashboard';
  return '/account';
}
