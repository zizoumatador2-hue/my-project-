// Domain constants shared by the Worker API and the web client.

export const PLATFORMS = ['instagram', 'tiktok', 'snapchat', 'x', 'facebook', 'youtube'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'إنستغرام',
  tiktok: 'تيك توك',
  snapchat: 'سناب شات',
  x: 'إكس (تويتر)',
  facebook: 'فيسبوك',
  youtube: 'يوتيوب',
};

/** Which place on each platform the one-time ownership code may be placed. */
export const CODE_METHODS: Record<Platform, Array<'bio' | 'display_name' | 'story'>> = {
  instagram: ['bio', 'display_name', 'story'],
  tiktok: ['bio', 'display_name'],
  snapchat: ['display_name', 'story'],
  x: ['bio', 'display_name'],
  facebook: ['bio', 'display_name'],
  youtube: ['bio', 'display_name'],
};

export const CODE_METHOD_LABELS = {
  bio: 'النبذة التعريفية (Bio)',
  display_name: 'الاسم الظاهر',
  story: 'قصة (Story) عامة',
} as const;

export const CATEGORIES = [
  'lifestyle', 'fashion', 'beauty', 'fitness', 'food', 'travel', 'tech', 'gaming',
  'education', 'business', 'entertainment', 'sports', 'automotive', 'parenting', 'art', 'news', 'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  lifestyle: 'نمط الحياة', fashion: 'أزياء', beauty: 'تجميل', fitness: 'لياقة', food: 'طعام وطبخ',
  travel: 'سفر', tech: 'تقنية', gaming: 'ألعاب', education: 'تعليم', business: 'أعمال',
  entertainment: 'ترفيه', sports: 'رياضة', automotive: 'سيارات', parenting: 'أمومة وأسرة',
  art: 'فن وتصميم', news: 'أخبار', other: 'أخرى',
};

export const COUNTRIES: Record<string, string> = {
  SA: 'السعودية', AE: 'الإمارات', EG: 'مصر', KW: 'الكويت', QA: 'قطر', BH: 'البحرين', OM: 'عُمان',
  JO: 'الأردن', MA: 'المغرب', DZ: 'الجزائر', TN: 'تونس', IQ: 'العراق', LB: 'لبنان', US: 'الولايات المتحدة',
  GB: 'المملكة المتحدة', TR: 'تركيا', FR: 'فرنسا', DE: 'ألمانيا', IN: 'الهند', GLOBAL: 'عالمي/متعدد',
};

export const LANGUAGES: Record<string, string> = {
  ar: 'العربية', en: 'الإنجليزية', fr: 'الفرنسية', tr: 'التركية', es: 'الإسبانية', hi: 'الهندية', mixed: 'متعدد',
};

export const LISTING_STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  pending_review: 'قيد المراجعة',
  needs_evidence: 'بحاجة إلى أدلة إضافية',
  approved: 'منشور',
  rejected: 'مرفوض',
  reserved: 'محجوز لصفقة',
  sold: 'تم البيع',
  withdrawn: 'مسحوب',
};

export const ESCROW_STATES = [
  'pending_payment', 'held', 'transfer_in_progress', 'buyer_confirmation_window',
  'released', 'disputed', 'refunded', 'split', 'cancelled',
] as const;
export type EscrowState = (typeof ESCROW_STATES)[number];

export const ESCROW_LABELS: Record<EscrowState, string> = {
  pending_payment: 'بانتظار الدفع',
  held: 'المبلغ محتجز لدى الضمان',
  transfer_in_progress: 'نقل الملكية جارٍ',
  buyer_confirmation_window: 'مهلة تأكيد المشتري',
  released: 'تم تحرير المبلغ للبائع',
  disputed: 'نزاع — الضمان مجمّد',
  refunded: 'تم رد المبلغ للمشتري',
  split: 'تسوية بالتقسيم',
  cancelled: 'ملغاة',
};

/** Legal transitions of the escrow state machine. Anything else is rejected by the server. */
export const ESCROW_TRANSITIONS: Record<EscrowState, EscrowState[]> = {
  pending_payment: ['held', 'cancelled'],
  held: ['transfer_in_progress', 'disputed', 'refunded'],
  transfer_in_progress: ['buyer_confirmation_window', 'disputed', 'refunded'],
  buyer_confirmation_window: ['released', 'disputed'],
  released: ['disputed'], // post-release reclaim dispute while funds are still in the reclaim-protection hold
  disputed: ['refunded', 'released', 'split', 'held', 'transfer_in_progress', 'buyer_confirmation_window'],
  refunded: [],
  split: [],
  cancelled: [],
};

export interface StepDef {
  no: number;
  key: string;
  performer: 'seller' | 'buyer' | 'admin';
  confirmer: 'seller' | 'buyer' | 'admin' | null;
  title: string;
  performerHint: string;
  confirmerHint?: string;
  /** Step needs a secret exchanged via one-time reveal. `from` provides, the other party reveals. */
  secret?: { from: 'seller' | 'buyer'; label: string };
}

export const TRANSFER_STEPS: StepDef[] = [
  {
    no: 1, key: 'prepare_account', performer: 'seller', confirmer: null,
    title: 'تجهيز الحساب للتسليم',
    performerHint: 'عطّل المصادقة الثنائية (2FA)، وسجّل الخروج من جميع الأجهزة والجلسات الأخرى، وأزل أي تطبيقات مرتبطة. أقرّ بأنك أتممت ذلك.',
  },
  {
    no: 2, key: 'recovery_email', performer: 'seller', confirmer: 'buyer',
    title: 'تغيير البريد الإلكتروني للاسترداد',
    performerHint: 'استخدم البريد الذي زوّدك به المشتري عبر القناة الآمنة، ثم غيّر بريد الاسترداد وأكّد التنفيذ.',
    confirmerHint: 'تأكد من وصول رسالة التأكيد من المنصة إلى بريدك، ثم أكّد.',
    secret: { from: 'buyer', label: 'البريد الإلكتروني الجديد للاسترداد' },
  },
  {
    no: 3, key: 'recovery_phone', performer: 'seller', confirmer: 'buyer',
    title: 'تغيير رقم الهاتف للاسترداد',
    performerHint: 'أزل رقمك وأضف الرقم الذي زوّدك به المشتري عبر القناة الآمنة.',
    confirmerHint: 'تأكد من وصول رمز التحقق إلى هاتفك وأن الرقم القديم أُزيل، ثم أكّد.',
    secret: { from: 'buyer', label: 'رقم الهاتف الجديد للاسترداد' },
  },
  {
    no: 4, key: 'password_handover', performer: 'seller', confirmer: 'buyer',
    title: 'تسليم كلمة المرور بكشف لمرة واحدة',
    performerHint: 'غيّر كلمة المرور إلى كلمة جديدة لم تستخدمها سابقًا، وأرسلها عبر الكشف الآمن لمرة واحدة. لا تُرسلها في المحادثة.',
    confirmerHint: 'اكشف كلمة المرور (مرة واحدة فقط)، ثم غيّرها فورًا إلى كلمة خاصة بك وأكّد.',
    secret: { from: 'seller', label: 'كلمة المرور المؤقتة' },
  },
  {
    no: 5, key: 'buyer_login', performer: 'buyer', confirmer: null,
    title: 'تأكيد الدخول والسيطرة الكاملة',
    performerHint: 'سجّل الدخول، فعّل المصادقة الثنائية باسمك، وتأكد أنك وحدك تتحكم بالحساب وبيانات الاسترداد.',
  },
  {
    no: 6, key: 'admin_verify', performer: 'admin', confirmer: null,
    title: 'مراجعة فريق العمليات وإغلاق النقل',
    performerHint: 'يراجع فريق العمليات سجل الخطوات ويعتمد اكتمال النقل، فتبدأ مهلة تأكيد المشتري.',
  },
];

export const DISPUTE_REASONS: Record<string, string> = {
  not_as_described: 'الحساب لا يطابق الوصف أو الإحصاءات',
  transfer_stalled: 'البائع لا يُكمل خطوات النقل',
  access_lost: 'فقدت الوصول بعد الاستلام',
  reclaimed: 'استعاد البائع الحساب بعد البيع',
  buyer_unresponsive: 'المشتري لا يستجيب / لا يؤكد',
  payment_issue: 'مشكلة في الدفع',
  other: 'سبب آخر',
};

export const ROLES = ['user', 'reviewer', 'arbiter', 'finance', 'admin', 'superadmin'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  user: 'مستخدم',
  reviewer: 'مراجع إعلانات',
  arbiter: 'محكّم نزاعات',
  finance: 'مالية',
  admin: 'مدير عمليات',
  superadmin: 'مدير عام',
};

export const PERMISSIONS = [
  'admin.access', 'listings.review', 'fraud.manage', 'deals.view', 'deals.transfer_verify',
  'disputes.manage', 'chat.view', 'withdrawals.manage', 'reports.view', 'users.manage',
  'roles.assign', 'settings.edit', 'audit.view',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  user: [],
  reviewer: ['admin.access', 'listings.review', 'fraud.manage'],
  arbiter: ['admin.access', 'deals.view', 'deals.transfer_verify', 'disputes.manage', 'chat.view'],
  finance: ['admin.access', 'deals.view', 'withdrawals.manage', 'reports.view'],
  admin: ['admin.access', 'listings.review', 'fraud.manage', 'deals.view', 'deals.transfer_verify',
    'disputes.manage', 'chat.view', 'withdrawals.manage', 'reports.view', 'users.manage', 'settings.edit', 'audit.view'],
  superadmin: [...PERMISSIONS],
};

export interface Settings {
  commission: { tiers: Array<{ min_cents: number; bp: number }>; min_fee_cents: number };
  withdrawal: { min_cents: number; auto_approve_max_cents: number; daily_auto_limit_cents: number };
  escrow: { confirmation_window_hours: number; reclaim_hold_days: number; payment_timeout_minutes: number };
  chat: { violation_flag_threshold: number; allow_contact_after_complete: boolean };
  fraud: { min_account_age_months: number; max_engagement_rate: number; min_price_per_1k_followers_cents: number; new_seller_hours: number; new_seller_high_price_cents: number };
  transfer: { secret_ttl_hours: number };
  flags: { signups_enabled: boolean; new_listings_enabled: boolean; purchases_enabled: boolean; withdrawals_enabled: boolean; chat_enabled: boolean };
}

export const DEFAULT_SETTINGS: Settings = {
  commission: {
    tiers: [
      { min_cents: 0, bp: 1000 },        // 10% under $1,000
      { min_cents: 100000, bp: 800 },    // 8% from $1,000
      { min_cents: 500000, bp: 600 },    // 6% from $5,000
    ],
    min_fee_cents: 500,
  },
  withdrawal: { min_cents: 2000, auto_approve_max_cents: 50000, daily_auto_limit_cents: 100000 },
  escrow: { confirmation_window_hours: 72, reclaim_hold_days: 7, payment_timeout_minutes: 60 },
  chat: { violation_flag_threshold: 3, allow_contact_after_complete: false },
  fraud: { min_account_age_months: 6, max_engagement_rate: 25, min_price_per_1k_followers_cents: 50, new_seller_hours: 48, new_seller_high_price_cents: 200000 },
  transfer: { secret_ttl_hours: 24 },
  flags: { signups_enabled: true, new_listings_enabled: true, purchases_enabled: true, withdrawals_enabled: true, chat_enabled: true },
};

/** Commission for a sale price given tiered settings. Pure and deterministic; snapshotted onto the deal. */
export function computeCommission(priceCents: number, c: Settings['commission']): { bp: number; cents: number } {
  const tiers = [...c.tiers].sort((a, b) => a.min_cents - b.min_cents);
  let bp = tiers.length ? tiers[0].bp : 0;
  for (const t of tiers) if (priceCents >= t.min_cents) bp = t.bp;
  const cents = Math.min(priceCents, Math.max(c.min_fee_cents, Math.round((priceCents * bp) / 10000)));
  return { bp, cents };
}
