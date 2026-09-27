import { Hono } from 'hono';
import { z } from 'zod';
import { CATEGORIES, CODE_METHODS, COUNTRIES, LANGUAGES, PLATFORMS, type Platform } from '../../../shared/domain';
import type { AppEnv } from '../env';
import { audit, auditStmt } from '../lib/audit';
import { can, requireUser } from '../lib/auth';
import { putEncrypted, readUpload } from '../lib/files';
import { rateLimit } from '../lib/ratelimit';
import { getSettings } from '../lib/settings';
import { verifyTurnstile } from '../lib/turnstile';
import { body, cleanText, pageParams } from '../lib/validate';
import { clientIp, HttpError, newId, now } from '../lib/util';

const r = new Hono<AppEnv>();

const PUBLIC_COLS = `l.id, l.platform, l.handle, l.title, l.description, l.followers, l.engagement_rate, l.category, l.country, l.language,
  l.account_created_year, l.account_created_month, l.price_cents, l.currency, l.status, l.approved_at, l.created_at,
  u.id AS seller_id, u.display_name AS seller_name, u.trust_seller AS seller_trust, u.created_at AS seller_since,
  (SELECT COUNT(*) FROM deals d WHERE d.seller_id = u.id AND d.escrow_state IN ('released','split')) AS seller_completed`;

export function normalizeHandle(h: string): string {
  return h.trim().toLowerCase().replace(/^https?:\/\/[^/]+\//, '').replace(/^@/, '').replace(/[/?#].*$/, '');
}

function genCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const b = crypto.getRandomValues(new Uint8Array(8));
  const s = [...b].map((x) => alphabet[x % alphabet.length]).join('');
  return `TT-${s.slice(0, 4)}-${s.slice(4)}`;
}

const listingInput = z.object({
  platform: z.enum(PLATFORMS),
  handle: z.string().trim().min(2).max(80).transform(normalizeHandle).pipe(z.string().regex(/^[a-z0-9._-]{2,60}$/, 'معرّف الحساب غير صالح')),
  title: cleanText(8, 90, 'العنوان قصير جدًا'),
  description: cleanText(30, 3000, 'الوصف قصير جدًا (30 حرفًا على الأقل)'),
  followers: z.number().int().min(100, 'الحد الأدنى 100 متابع').max(1_000_000_000),
  engagementRate: z.number().min(0).max(100),
  category: z.enum(CATEGORIES),
  country: z.string().refine((v) => v in COUNTRIES, 'دولة غير مدعومة'),
  language: z.string().refine((v) => v in LANGUAGES, 'لغة غير مدعومة'),
  accountCreatedYear: z.number().int().min(2004).refine((y) => y <= new Date().getUTCFullYear(), 'سنة غير صالحة'), // evaluated per request (module-scope Date is frozen in Workers)
  accountCreatedMonth: z.number().int().min(1).max(12),
  priceCents: z.number().int().min(1000, 'أقل سعر 10 دولارات').max(10_000_000_00),
  codeMethod: z.enum(['bio', 'display_name', 'story']),
}).refine((v) => CODE_METHODS[v.platform as Platform].includes(v.codeMethod), { message: 'طريقة وضع الرمز غير متاحة لهذه المنصة', path: ['codeMethod'] });

// ---------- Public discovery ----------
r.get('/listings', async (c) => {
  const q = c.req.query();
  const { limit, offset } = pageParams(q);
  const where: string[] = [`l.status = 'approved'`];
  const binds: unknown[] = [];
  const add = (sql: string, v: unknown) => { where.push(sql); binds.push(v); };
  if (q.platform && (PLATFORMS as readonly string[]).includes(q.platform)) add('l.platform = ?', q.platform);
  if (q.category && (CATEGORIES as readonly string[]).includes(q.category)) add('l.category = ?', q.category);
  if (q.country && q.country in COUNTRIES) add('l.country = ?', q.country);
  if (q.language && q.language in LANGUAGES) add('l.language = ?', q.language);
  const num = (k: string) => (q[k] !== undefined && q[k] !== '' && Number.isFinite(Number(q[k])) ? Number(q[k]) : null);
  if (num('minFollowers') !== null) add('l.followers >= ?', num('minFollowers'));
  if (num('maxFollowers') !== null) add('l.followers <= ?', num('maxFollowers'));
  if (num('minPrice') !== null) add('l.price_cents >= ?', Math.round(num('minPrice')! * 100));
  if (num('maxPrice') !== null) add('l.price_cents <= ?', Math.round(num('maxPrice')! * 100));
  if (num('minEngagement') !== null) add('l.engagement_rate >= ?', num('minEngagement'));
  if (num('maxEngagement') !== null) add('l.engagement_rate <= ?', num('maxEngagement'));
  if (num('minAgeYears') !== null) add('l.account_created_year <= ?', new Date().getUTCFullYear() - num('minAgeYears')!);
  if (q.q && q.q.trim()) {
    const term = `%${q.q.trim().slice(0, 60).replace(/[%_\\]/g, (m) => '\\' + m)}%`;
    where.push(`(l.title LIKE ? ESCAPE '\\' OR l.handle LIKE ? ESCAPE '\\' OR l.description LIKE ? ESCAPE '\\')`);
    binds.push(term, term, term);
  }
  const sorts: Record<string, string> = {
    newest: 'l.approved_at DESC', price_asc: 'l.price_cents ASC', price_desc: 'l.price_cents DESC',
    followers_desc: 'l.followers DESC', engagement_desc: 'l.engagement_rate DESC', age_desc: 'l.account_created_year ASC',
    trust_desc: 'u.trust_seller DESC',
  };
  const order = sorts[q.sort ?? 'newest'] ?? sorts.newest;
  const w = where.join(' AND ');
  const [rows, total] = await Promise.all([
    c.env.DB.prepare(`SELECT ${PUBLIC_COLS} FROM listings l JOIN users u ON u.id = l.seller_id WHERE ${w} ORDER BY ${order}, l.id LIMIT ? OFFSET ?`)
      .bind(...binds, limit, offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) n FROM listings l JOIN users u ON u.id = l.seller_id WHERE ${w}`).bind(...binds).first<{ n: number }>(),
  ]);
  return c.json({ items: rows.results, total: total?.n ?? 0, limit, offset });
});

r.get('/listings/:id', async (c) => {
  const id = c.req.param('id');
  const l = await c.env.DB.prepare(`SELECT ${PUBLIC_COLS}, l.seller_id AS owner FROM listings l JOIN users u ON u.id = l.seller_id WHERE l.id = ?`)
    .bind(id).first<Record<string, unknown> & { status: string; owner: string }>();
  const user = c.get('user');
  const isPublic = l && ['approved', 'reserved', 'sold'].includes(l.status);
  if (!l || (!isPublic && user?.id !== l.owner && !(user && can(user.role, 'listings.review')))) {
    throw new HttpError(404, 'not_found', 'الإعلان غير موجود.');
  }
  let myConversation: string | null = null;
  if (user) {
    const conv = await c.env.DB.prepare('SELECT id FROM conversations WHERE listing_id = ? AND buyer_id = ?').bind(id, user.id).first<{ id: string }>();
    myConversation = conv?.id ?? null;
  }
  const { owner: _o, ...rest } = l;
  return c.json({ listing: rest, isOwner: user?.id === l.owner, myConversation });
});

// ---------- Seller: manage own listings ----------
r.get('/me/listings', async (c) => {
  const u = requireUser(c);
  const rows = await c.env.DB.prepare(
    `SELECT l.id, l.platform, l.handle, l.title, l.price_cents, l.status, l.followers, l.created_at, l.submitted_at, l.review_note,
      (SELECT COUNT(*) FROM listing_evidence e WHERE e.listing_id = l.id) AS evidence_count,
      (SELECT COUNT(*) FROM conversations cv WHERE cv.listing_id = l.id) AS conversations
     FROM listings l WHERE l.seller_id = ? ORDER BY l.updated_at DESC LIMIT 200`,
  ).bind(u.id).all();
  return c.json({ items: rows.results });
});

async function ownListing(c: { env: AppEnv['Bindings'] }, id: string, userId: string) {
  const l = await c.env.DB.prepare('SELECT * FROM listings WHERE id = ?').bind(id).first<Record<string, any>>();
  if (!l || l.seller_id !== userId) throw new HttpError(404, 'not_found', 'الإعلان غير موجود.');
  return l;
}

r.get('/me/listings/:id', async (c) => {
  const u = requireUser(c);
  const l = await ownListing(c, c.req.param('id'), u.id);
  const [evidence, history] = await Promise.all([
    c.env.DB.prepare('SELECT id, kind, mime, size, created_at FROM listing_evidence WHERE listing_id = ? ORDER BY created_at').bind(l.id).all(),
    c.env.DB.prepare(`SELECT action, note, created_at FROM listing_reviews WHERE listing_id = ? AND action IN ('submit','approve','reject','request_evidence') ORDER BY created_at`).bind(l.id).all(),
  ]);
  // Seller sees their listing but never internal fraud signals or reviewer identity.
  const { fraud_score: _f, fraud_flags: _ff, reviewer_id: _r, reviewer_claimed_at: _rc, reviewer_observed_followers: _ro, ...safe } = l;
  return c.json({ listing: safe, evidence: evidence.results, history: history.results });
});

r.post('/listings', async (c) => {
  const u = requireUser(c);
  await rateLimit(c.env, 'listing-create', u.id, 20, 3600_000);
  const s = await getSettings(c.env);
  if (!s.flags.new_listings_enabled) throw new HttpError(503, 'listings_disabled', 'إضافة الإعلانات متوقفة مؤقتًا.');
  const b = await body(c.req, listingInput);
  const id = newId('lst');
  const t = now();
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO listings (id, seller_id, platform, handle, handle_normalized, title, description, followers, engagement_rate, category, country,
        language, account_created_year, account_created_month, price_cents, verification_code, code_method, status, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'draft',?,?)`,
    ).bind(id, u.id, b.platform, b.handle, b.handle, b.title, b.description, b.followers, b.engagementRate, b.category, b.country, b.language,
      b.accountCreatedYear, b.accountCreatedMonth, b.priceCents, genCode(), b.codeMethod, t, t),
    auditStmt(c.env, { actorId: u.id, action: 'listing.create', subjectType: 'listing', subjectId: id, ip: clientIp(c.req.raw) }),
  ]);
  return c.json({ id }, 201);
});

r.put('/listings/:id', async (c) => {
  const u = requireUser(c);
  const l = await ownListing(c, c.req.param('id'), u.id);
  if (!['draft', 'needs_evidence'].includes(l.status)) throw new HttpError(409, 'not_editable', 'لا يمكن تعديل الإعلان في حالته الحالية.');
  const b = await body(c.req, listingInput);
  // Changing the account itself invalidates prior verification → new code.
  const code = b.platform !== l.platform || b.handle !== l.handle_normalized ? genCode() : l.verification_code;
  await c.env.DB.prepare(
    `UPDATE listings SET platform=?, handle=?, handle_normalized=?, title=?, description=?, followers=?, engagement_rate=?, category=?, country=?, language=?,
      account_created_year=?, account_created_month=?, price_cents=?, code_method=?, verification_code=?, updated_at=? WHERE id=?`,
  ).bind(b.platform, b.handle, b.handle, b.title, b.description, b.followers, b.engagementRate, b.category, b.country, b.language,
    b.accountCreatedYear, b.accountCreatedMonth, b.priceCents, b.codeMethod, code, now(), l.id).run();
  await audit(c.env, { actorId: u.id, action: 'listing.update', subjectType: 'listing', subjectId: l.id, ip: clientIp(c.req.raw) });
  return c.json({ ok: true });
});

r.post('/listings/:id/evidence', async (c) => {
  const u = requireUser(c);
  await rateLimit(c.env, 'evidence-upload', u.id, 40, 3600_000);
  const l = await ownListing(c, c.req.param('id'), u.id);
  if (!['draft', 'needs_evidence'].includes(l.status)) throw new HttpError(409, 'not_editable', 'لا يمكن إضافة ملفات في هذه الحالة.');
  const form = await c.req.formData().catch(() => { throw new HttpError(400, 'bad_form', 'نموذج غير صالح.'); });
  const kind = z.enum(['settings', 'analytics', 'code_proof', 'other']).safeParse(form.get('kind'));
  if (!kind.success) throw new HttpError(400, 'validation', 'نوع الملف غير صالح.');
  const count = await c.env.DB.prepare('SELECT COUNT(*) n FROM listing_evidence WHERE listing_id = ?').bind(l.id).first<{ n: number }>();
  if ((count?.n ?? 0) >= 12) throw new HttpError(409, 'too_many', 'الحد الأقصى 12 ملفًا لكل إعلان.');
  const f = await readUpload(form.get('file') as File | null, false);
  const id = newId('evd');
  const key = `listings/${l.id}/${id}`;
  await putEncrypted(c.env, key, f.bytes, f.mime);
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO listing_evidence (id, listing_id, kind, r2_key, sha256, mime, size, uploaded_by, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(id, l.id, kind.data, key, f.sha256, f.mime, f.size, u.id, now()),
    auditStmt(c.env, { actorId: u.id, action: 'listing.evidence_upload', subjectType: 'listing', subjectId: l.id, details: { evidenceId: id, kind: kind.data, size: f.size } }),
  ]);
  return c.json({ id, kind: kind.data, mime: f.mime, size: f.size }, 201);
});

r.delete('/listings/:id/evidence/:eid', async (c) => {
  const u = requireUser(c);
  const l = await ownListing(c, c.req.param('id'), u.id);
  if (l.status !== 'draft') throw new HttpError(409, 'not_editable', 'لا يمكن حذف الأدلة بعد الإرسال للمراجعة.');
  const e = await c.env.DB.prepare('SELECT r2_key FROM listing_evidence WHERE id = ? AND listing_id = ?').bind(c.req.param('eid'), l.id).first<{ r2_key: string }>();
  if (!e) throw new HttpError(404, 'not_found', 'الملف غير موجود.');
  await c.env.EVIDENCE.delete(e.r2_key);
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM listing_evidence WHERE id = ?').bind(c.req.param('eid')),
    auditStmt(c.env, { actorId: u.id, action: 'listing.evidence_delete', subjectType: 'listing', subjectId: l.id, details: { evidenceId: c.req.param('eid') } }),
  ]);
  return c.json({ ok: true });
});

r.post('/listings/:id/submit', async (c) => {
  const u = requireUser(c);
  const ip = clientIp(c.req.raw);
  await rateLimit(c.env, 'listing-submit', u.id, 10, 3600_000);
  const b = await body(c.req, z.object({ turnstileToken: z.string().max(4096).optional(), attest: z.literal(true, { message: 'يجب الإقرار بملكية الحساب' }) }));
  await verifyTurnstile(c.env, b.turnstileToken, ip, 'listing_submit');
  const l = await ownListing(c, c.req.param('id'), u.id);
  if (!['draft', 'needs_evidence'].includes(l.status)) throw new HttpError(409, 'not_submittable', 'الإعلان مُرسل مسبقًا.');
  const kinds = await c.env.DB.prepare('SELECT DISTINCT kind FROM listing_evidence WHERE listing_id = ?').bind(l.id).all<{ kind: string }>();
  const have = kinds.results.map((k) => k.kind);
  const missing = ['settings', 'analytics'].filter((k) => !have.includes(k));
  if (missing.length) throw new HttpError(400, 'evidence_missing', 'يجب رفع لقطة شاشة للإعدادات ولقطة للإحصاءات قبل الإرسال.', { missing });
  const t = now();
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE listings SET status = 'pending_review', submitted_at = ?, updated_at = ?, code_check_status = 'pending' WHERE id = ?`).bind(t, t, l.id),
    c.env.DB.prepare('INSERT INTO listing_reviews (id, listing_id, actor_id, action, note, created_at) VALUES (?,?,?,?,?,?)')
      .bind(newId('lrv'), l.id, u.id, 'submit', l.status === 'needs_evidence' ? 'أعاد البائع الإرسال بعد إضافة أدلة' : 'أرسل البائع الإعلان للمراجعة', t),
    auditStmt(c.env, { actorId: u.id, action: 'listing.submit', subjectType: 'listing', subjectId: l.id, ip }),
  ]);
  await c.env.VERIFY_QUEUE.send({ type: 'listing_submitted', listingId: l.id });
  return c.json({ ok: true, status: 'pending_review' });
});

r.post('/listings/:id/withdraw', async (c) => {
  const u = requireUser(c);
  const l = await ownListing(c, c.req.param('id'), u.id);
  if (!['draft', 'pending_review', 'needs_evidence', 'approved'].includes(l.status)) throw new HttpError(409, 'not_withdrawable', 'لا يمكن سحب إعلان مرتبط بصفقة.');
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE listings SET status = 'withdrawn', updated_at = ? WHERE id = ?`).bind(now(), l.id),
    auditStmt(c.env, { actorId: u.id, action: 'listing.withdraw', subjectType: 'listing', subjectId: l.id }),
  ]);
  return c.json({ ok: true });
});

export default r;
