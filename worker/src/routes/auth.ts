import { Hono } from 'hono';
import { z } from 'zod';
import { ROLE_PERMISSIONS } from '../../../shared/domain';
import type { AppEnv } from '../env';
import { audit } from '../lib/audit';
import { createSession, destroySession, requireUser } from '../lib/auth';
import { hashPassword, verifyPassword } from '../lib/crypto';
import { rateLimit } from '../lib/ratelimit';
import { getSettings } from '../lib/settings';
import { verifyTurnstile } from '../lib/turnstile';
import { body, cleanText } from '../lib/validate';
import { clientIp, HttpError, newId, now } from '../lib/util';

const r = new Hono<AppEnv>();

const email = z.string().trim().toLowerCase().email('بريد إلكتروني غير صالح').max(254);
const password = z.string().min(10, 'كلمة المرور 10 أحرف على الأقل').max(200)
  .refine((p) => /[A-Za-z؀-ۿ]/.test(p) && /\d/.test(p), 'يجب أن تحتوي كلمة المرور على أحرف وأرقام');

r.get('/config', async (c) => {
  const s = await getSettings(c.env);
  return c.json({
    turnstileSiteKey: c.env.TURNSTILE_SITE_KEY || null,
    paymentProvider: c.env.PAYMENT_PROVIDER,
    environment: c.env.ENVIRONMENT,
    flags: s.flags,
    escrow: s.escrow,
    commission: s.commission,
    withdrawal: { min_cents: s.withdrawal.min_cents },
  });
});

r.post('/auth/signup', async (c) => {
  const ip = clientIp(c.req.raw);
  await rateLimit(c.env, 'signup', ip, 5, 3600_000);
  const b = await body(c.req, z.object({
    email, password,
    displayName: cleanText(2, 40, 'الاسم قصير جدًا'),
    acceptTerms: z.literal(true, { message: 'يجب الموافقة على السياسات' }),
    confirmAdult: z.literal(true, { message: 'يجب أن يكون عمرك 18 عامًا أو أكثر' }),
    turnstileToken: z.string().max(4096).optional(),
  }));
  await verifyTurnstile(c.env, b.turnstileToken, ip, 'signup');
  const s = await getSettings(c.env);
  if (!s.flags.signups_enabled) throw new HttpError(503, 'signups_disabled', 'التسجيل متوقف مؤقتًا.');
  const exists = await c.env.DB.prepare('SELECT 1 FROM users WHERE email = ?').bind(b.email).first();
  if (exists) throw new HttpError(409, 'email_taken', 'هذا البريد مسجّل مسبقًا.');
  const { hash, salt } = await hashPassword(b.password);
  const id = newId('usr');
  const role = c.env.BOOTSTRAP_ADMIN_EMAIL && b.email === c.env.BOOTSTRAP_ADMIN_EMAIL.toLowerCase() ? 'superadmin' : 'user';
  await c.env.DB.prepare('INSERT INTO users (id, email, password_hash, password_salt, display_name, role, created_at) VALUES (?,?,?,?,?,?,?)')
    .bind(id, b.email, hash, salt, b.displayName, role, now()).run();
  await audit(c.env, { actorId: id, action: role === 'superadmin' ? 'user.signup_bootstrap_admin' : 'user.signup', subjectType: 'user', subjectId: id, ip });
  const { csrf } = await createSession(c, id);
  return c.json({ user: { id, email: b.email, display_name: b.displayName, role }, csrf, permissions: ROLE_PERMISSIONS[role] }, 201);
});

r.post('/auth/login', async (c) => {
  const ip = clientIp(c.req.raw);
  await rateLimit(c.env, 'login-ip', ip, 20, 15 * 60_000);
  const b = await body(c.req, z.object({ email, password: z.string().min(1).max(200), turnstileToken: z.string().max(4096).optional() }));
  await rateLimit(c.env, 'login-acct', b.email, 10, 15 * 60_000);
  await verifyTurnstile(c.env, b.turnstileToken, ip, 'login');
  const u = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(b.email).first<{
    id: string; email: string; display_name: string; role: keyof typeof ROLE_PERMISSIONS; status: string;
    password_hash: string; password_salt: string; failed_logins: number; locked_until: number | null;
  }>();
  const invalid = new HttpError(401, 'invalid_credentials', 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
  if (!u) {
    await hashPassword(b.password); // equalize timing for unknown accounts
    throw invalid;
  }
  if (u.locked_until && u.locked_until > now()) throw new HttpError(423, 'locked', 'تم قفل الحساب مؤقتًا بسبب محاولات فاشلة متكررة. حاول بعد 15 دقيقة.');
  if (!(await verifyPassword(b.password, u.password_hash, u.password_salt))) {
    const fails = u.failed_logins + 1;
    await c.env.DB.prepare('UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?')
      .bind(fails >= 8 ? 0 : fails, fails >= 8 ? now() + 15 * 60_000 : null, u.id).run();
    await audit(c.env, { actorId: u.id, action: 'user.login_failed', subjectType: 'user', subjectId: u.id, ip });
    throw invalid;
  }
  if (u.status !== 'active') throw new HttpError(403, 'suspended', 'هذا الحساب موقوف. تواصل مع الدعم.');
  await c.env.DB.prepare('UPDATE users SET failed_logins = 0, locked_until = NULL, last_seen_at = ? WHERE id = ?').bind(now(), u.id).run();
  await audit(c.env, { actorId: u.id, action: 'user.login', subjectType: 'user', subjectId: u.id, ip });
  const { csrf } = await createSession(c, u.id);
  return c.json({ user: { id: u.id, email: u.email, display_name: u.display_name, role: u.role }, csrf, permissions: ROLE_PERMISSIONS[u.role] });
});

r.post('/auth/logout', async (c) => {
  await destroySession(c);
  return c.json({ ok: true });
});

r.get('/auth/me', async (c) => {
  const u = c.get('user');
  if (!u) return c.json({ user: null, csrf: null, permissions: [] });
  const unread = await c.env.DB.prepare('SELECT COUNT(*) n FROM notifications WHERE user_id = ? AND read_at IS NULL').bind(u.id).first<{ n: number }>();
  return c.json({ user: u, csrf: c.get('csrf'), permissions: ROLE_PERMISSIONS[u.role], unreadNotifications: unread?.n ?? 0 });
});

r.post('/auth/password', async (c) => {
  const u = requireUser(c);
  await rateLimit(c.env, 'pwchange', u.id, 5, 3600_000);
  const b = await body(c.req, z.object({ current: z.string().min(1).max(200), next: password }));
  const row = await c.env.DB.prepare('SELECT password_hash, password_salt FROM users WHERE id = ?').bind(u.id).first<{ password_hash: string; password_salt: string }>();
  if (!row || !(await verifyPassword(b.current, row.password_hash, row.password_salt))) throw new HttpError(400, 'wrong_password', 'كلمة المرور الحالية غير صحيحة.');
  const { hash, salt } = await hashPassword(b.next);
  // Rotate: kill every other session.
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?').bind(hash, salt, u.id),
    c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?').bind(u.id, c.get('sessionId')),
  ]);
  await audit(c.env, { actorId: u.id, action: 'user.password_changed', subjectType: 'user', subjectId: u.id, ip: clientIp(c.req.raw) });
  return c.json({ ok: true });
});

export default r;
