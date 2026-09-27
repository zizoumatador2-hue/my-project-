import type { Settings } from '../../../shared/domain';
import type { Env } from '../env';
import { auditStmt } from './audit';
import { newId, now, HOUR } from './util';

export interface FraudFlag { code: string; severity: 'low' | 'medium' | 'high'; detail: string }

const WEIGHT = { low: 10, medium: 25, high: 50 } as const;

interface ListingRow {
  id: string; seller_id: string; platform: string; handle: string; handle_normalized: string; followers: number;
  engagement_rate: number; price_cents: number; account_created_year: number; account_created_month: number;
  verification_code: string; code_method: string;
}

/**
 * Heuristic pre-publish checks. Output only ever *adds* scrutiny: a clean result still requires manual approval.
 * Pure data checks live in `evaluateListing` so they can be unit-tested.
 */
export function evaluateListing(
  l: ListingRow,
  ctx: {
    settings: Settings;
    nowMs: number;
    sellerCreatedAt: number;
    duplicateClaims: number;       // other sellers' active listings of same platform+handle
    previouslySold: number;        // same handle sold before on the platform
    reusedEvidence: number;        // evidence hashes found on other listings
    sellerRejected: number;        // seller's rejected listings
    sellerLostDisputes: number;
    evidenceKinds: string[];
  },
): FraudFlag[] {
  const f: FraudFlag[] = [];
  const s = ctx.settings.fraud;
  if (ctx.duplicateClaims > 0) f.push({ code: 'duplicate_claim', severity: 'high', detail: `الحساب نفسه مُدرج من ${ctx.duplicateClaims} بائع آخر` });
  if (ctx.reusedEvidence > 0) f.push({ code: 'reused_evidence', severity: 'high', detail: `${ctx.reusedEvidence} ملف إثبات مطابق لملفات في إعلانات أخرى` });
  if (ctx.previouslySold > 0) f.push({ code: 'previously_sold', severity: 'medium', detail: 'سبق بيع هذا الحساب عبر المنصة — تحقق من سلسلة الملكية' });

  const created = new Date(Date.UTC(l.account_created_year, Math.max(0, l.account_created_month - 1), 1)).getTime();
  const ageMonths = (ctx.nowMs - created) / (30.44 * 24 * HOUR);
  if (ageMonths < 0) f.push({ code: 'future_creation', severity: 'high', detail: 'تاريخ إنشاء الحساب في المستقبل' });
  else if (ageMonths < s.min_account_age_months) f.push({ code: 'new_account', severity: 'medium', detail: `عمر الحساب ${Math.floor(ageMonths)} شهر فقط` });

  if (l.engagement_rate > s.max_engagement_rate) f.push({ code: 'engagement_too_high', severity: 'medium', detail: `معدل تفاعل ${l.engagement_rate}% غير واقعي` });
  if (l.followers >= 10000 && l.engagement_rate < 0.1) f.push({ code: 'engagement_too_low', severity: 'medium', detail: 'تفاعل شبه معدوم مع متابعين كُثر (احتمال متابعين وهميين)' });

  const per1k = l.price_cents / Math.max(1, l.followers / 1000);
  if (l.followers >= 5000 && per1k < s.min_price_per_1k_followers_cents) f.push({ code: 'price_too_low', severity: 'medium', detail: 'سعر منخفض بشكل مريب مقارنة بحجم الحساب (نمط شائع في الحسابات المسروقة)' });

  const sellerAgeH = (ctx.nowMs - ctx.sellerCreatedAt) / HOUR;
  if (sellerAgeH < s.new_seller_hours && l.price_cents >= s.new_seller_high_price_cents) f.push({ code: 'new_seller_high_value', severity: 'low', detail: 'بائع جديد بإعلان مرتفع القيمة' });
  if (ctx.sellerRejected >= 2) f.push({ code: 'seller_rejections', severity: 'medium', detail: `للبائع ${ctx.sellerRejected} إعلانات مرفوضة سابقًا` });
  if (ctx.sellerLostDisputes > 0) f.push({ code: 'seller_lost_disputes', severity: 'medium', detail: `خسر البائع ${ctx.sellerLostDisputes} نزاعًا` });
  for (const k of ['settings', 'analytics']) if (!ctx.evidenceKinds.includes(k)) f.push({ code: `missing_${k}`, severity: 'high', detail: `لا توجد لقطة ${k === 'settings' ? 'الإعدادات' : 'الإحصاءات'}` });
  return f;
}

export function scoreFlags(flags: FraudFlag[]): number {
  return Math.min(100, flags.reduce((a, f) => a + WEIGHT[f.severity], 0));
}

/** Best-effort automated check that the one-time code is visible on the public profile. */
export async function checkCodeOnProfile(platform: string, handle: string, code: string): Promise<'found' | 'not_found' | 'unavailable'> {
  const h = encodeURIComponent(handle.replace(/^@/, ''));
  const urls: Record<string, string> = {
    instagram: `https://www.instagram.com/${h}/`,
    tiktok: `https://www.tiktok.com/@${h}`,
    x: `https://x.com/${h}`,
    youtube: `https://www.youtube.com/@${h}/about`,
    facebook: `https://www.facebook.com/${h}`,
    snapchat: `https://www.snapchat.com/add/${h}`,
  };
  const url = urls[platform];
  if (!url) return 'unavailable';
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 TrustTransferVerifier/1.0' }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return 'unavailable';
    const text = (await r.text()).slice(0, 2_000_000);
    // Many platforms require login / render client-side: absence is "not_found", never proof of fraud.
    return text.includes(code) ? 'found' : 'not_found';
  } catch {
    return 'unavailable';
  }
}

export async function runListingChecks(env: Env, listingId: string, settings: Settings): Promise<void> {
  const l = await env.DB.prepare('SELECT * FROM listings WHERE id = ?').bind(listingId).first<ListingRow & { status: string }>();
  if (!l || l.status !== 'pending_review') return;
  const q = (sql: string, ...b: unknown[]) => env.DB.prepare(sql).bind(...b).first<{ n: number }>().then((r) => r?.n ?? 0);
  const [seller, duplicateClaims, previouslySold, reusedEvidence, sellerRejected, sellerLostDisputes, kinds] = await Promise.all([
    env.DB.prepare('SELECT created_at FROM users WHERE id = ?').bind(l.seller_id).first<{ created_at: number }>(),
    q(`SELECT COUNT(*) n FROM listings WHERE platform = ? AND handle_normalized = ? AND seller_id != ? AND status IN ('pending_review','needs_evidence','approved','reserved')`, l.platform, l.handle_normalized, l.seller_id),
    q(`SELECT COUNT(*) n FROM listings WHERE platform = ? AND handle_normalized = ? AND status = 'sold' AND id != ?`, l.platform, l.handle_normalized, l.id),
    q(`SELECT COUNT(*) n FROM listing_evidence e WHERE e.listing_id = ? AND EXISTS (SELECT 1 FROM listing_evidence o WHERE o.sha256 = e.sha256 AND o.listing_id != e.listing_id)`, l.id),
    q(`SELECT COUNT(*) n FROM listings WHERE seller_id = ? AND status = 'rejected'`, l.seller_id),
    q(`SELECT COUNT(*) n FROM disputes d JOIN deals x ON x.id = d.deal_id WHERE x.seller_id = ? AND d.resolution = 'refund'`, l.seller_id),
    env.DB.prepare('SELECT DISTINCT kind FROM listing_evidence WHERE listing_id = ?').bind(l.id).all<{ kind: string }>(),
  ]);
  const t = now();
  const flags = evaluateListing(l, {
    settings, nowMs: t, sellerCreatedAt: seller?.created_at ?? t, duplicateClaims, previouslySold, reusedEvidence,
    sellerRejected, sellerLostDisputes, evidenceKinds: kinds.results.map((r) => r.kind),
  });
  const codeStatus = await checkCodeOnProfile(l.platform, l.handle, l.verification_code);
  const score = scoreFlags(flags);

  const stmts = [
    env.DB.prepare('UPDATE listings SET fraud_score = ?, fraud_flags = ?, code_check_status = ?, code_checked_at = ?, updated_at = ? WHERE id = ?')
      .bind(score, JSON.stringify(flags), codeStatus, t, t, l.id),
    env.DB.prepare('INSERT INTO listing_reviews (id, listing_id, actor_id, action, note, created_at) VALUES (?,?,?,?,?,?)')
      .bind(newId('lrv'), l.id, null, 'auto_check', `نتيجة الفحص الآلي: ${flags.length} مؤشر، الدرجة ${score}. فحص الرمز: ${codeStatus}`, t),
    auditStmt(env, { actorId: null, action: 'listing.auto_check', subjectType: 'listing', subjectId: l.id, details: { score, flags: flags.map((x) => x.code), codeStatus } }),
  ];
  // Any medium/high flag opens a fraud case that must be resolved before approval.
  const serious = flags.filter((x) => x.severity !== 'low');
  if (serious.length) {
    const sev = serious.some((x) => x.severity === 'high') ? 'high' : 'medium';
    stmts.push(env.DB.prepare(
      `INSERT INTO fraud_cases (id, subject_type, subject_id, reason, severity, details, status, created_at)
       SELECT ?, 'listing', ?, ?, ?, ?, 'open', ? WHERE NOT EXISTS (SELECT 1 FROM fraud_cases WHERE subject_type='listing' AND subject_id=? AND status='open')`,
    ).bind(newId('frd'), l.id, serious.map((x) => x.detail).join(' • '), sev, JSON.stringify(serious), t, l.id));
  }
  await env.DB.batch(stmts);
}
