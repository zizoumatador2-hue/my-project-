// Detects attempts to move a deal off-platform (contact details, external apps, links, off-platform payment).
// Runs server-side on every message; the client runs the same module only as a UX hint.

export type ChatViolation = 'phone' | 'email' | 'link' | 'messaging_app' | 'handle' | 'offplatform_payment';

const ARABIC_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'صفر', 'واحد', 'اثنين', 'اثنان', 'إثنين', 'ثلاثه', 'ثلاثة', 'اربعه', 'أربعة', 'اربعة', 'خمسه', 'خمسة',
  'سته', 'ستة', 'سبعه', 'سبعة', 'ثمانيه', 'ثمانية', 'تسعه', 'تسعة',
];

const MESSAGING = [
  'whatsapp', 'whats app', 'watsap', 'wtsp', 'wa.me', 'telegram', 'tele gram', 't.me', 'signal', 'viber', 'wechat',
  'discord', 'skype', 'imo', 'botim', 'messenger', 'kik', 'line app',
  'واتساب', 'واتس اب', 'واتس', 'وتساب', 'الواتس', 'تيليجرام', 'تليجرام', 'تلجرام', 'تلقرام', 'تيليقرام', 'التلي',
  'سيجنال', 'فايبر', 'ديسكورد', 'سكايب', 'ايمو', 'بوتيم', 'ماسنجر',
  'كلمني على', 'راسلني على', 'ضيفني', 'أضفني', 'اضفني', 'add me on', 'dm me on', 'text me', 'call me',
];

const PAYMENT = [
  'paypal', 'pay pal', 'western union', 'moneygram', 'usdt', 'bitcoin', 'btc', 'binance', 'crypto', 'iban', 'swift',
  'bank transfer', 'wire transfer', 'cashapp', 'cash app', 'venmo', 'zelle', 'stc pay', 'stcpay', 'urpay', 'vodafone cash',
  'باي بال', 'بايبال', 'ويسترن', 'تحويل بنكي', 'حوالة', 'حواله', 'ايبان', 'آيبان', 'كريبتو', 'بيتكوين', 'بينانس',
  'فودافون كاش', 'اس تي سي باي', 'خارج المنصة', 'خارج الموقع', 'بدون وسيط', 'بدون الموقع',
];

const TLDS = 'com|net|org|io|co|me|ly|gg|app|dev|info|biz|xyz|link|site|online|store|sa|ae|eg|kw|qa|tv|to|ru|uk|us';

export function normalize(input: string): string {
  let s = input.normalize('NFKC').toLowerCase();
  s = s.replace(/[​-‏‪-‮⁠-⁤﻿­]/g, ''); // zero-width & bidi controls
  s = s.replace(/[٠-٩۰-۹]/g, (d) => ARABIC_DIGITS[d] ?? d);
  s = s.replace(/[ـ]/g, ''); // tatweel
  return s;
}

export function scanMessage(raw: string, allowedHandles: string[] = []): ChatViolation[] {
  const s = normalize(raw);
  const found = new Set<ChatViolation>();

  // Phone numbers: a run of digits with phone-style separators (not commas, so "1,200,000" stays allowed).
  const runs = s.match(/\+?\(?\d[\d\s\-.()/]{5,}\d/g) || [];
  for (const run of runs) {
    const digits = run.replace(/\D/g, '');
    const intl = /^\s*(\+|00)/.test(run);
    const local = /^0[1-9]/.test(digits);
    if (digits.length >= 9 || ((intl || local) && digits.length >= 8)) found.add('phone');
  }
  // Numbers spelled out as words ("zero five five ...")
  const words = s.split(/[\s,.\-_/]+/);
  let streak = 0;
  for (const w of words) {
    if (NUMBER_WORDS.includes(w) || /^\d{1,3}$/.test(w)) {
      streak++;
      if (streak >= 7) found.add('phone');
    } else streak = 0;
  }

  // Emails, including obfuscated "name at gmail dot com" / "name [at] gmail".
  if (/[a-z0-9._%+-]+\s*(@|\(at\)|\[at\]|\sat\s|آت)\s*[a-z0-9-]+\s*(\.|\(dot\)|\[dot\]|\sdot\s|دوت|نقطة)\s*[a-z]{2,}/.test(s)) found.add('email');
  if (/\b(gmail|hotmail|outlook|yahoo|icloud|protonmail|proton\.me)\b|جيميل|جي ميل|هوتميل|ياهو/.test(s)) found.add('email');

  // Links
  if (/(https?:\/\/|www\.)\S+/.test(s)) found.add('link');
  if (new RegExp(`\\b[a-z0-9-]{2,}\\s*(\\.|\\(dot\\)|\\[dot\\]|\\sdot\\s|دوت)\\s*(${TLDS})\\b`).test(s)) found.add('link');
  if (/\b(bit\.ly|tinyurl|linktr\.ee|linktree|beacons\.ai|t\.me|wa\.me|discord\.gg|snapchat\.com\/add)\b/.test(s)) found.add('link');

  // Messaging apps / invitations to contact elsewhere
  for (const m of MESSAGING) {
    if (s.includes(m)) {
      found.add('messaging_app');
      break;
    }
  }

  // Off-platform payment
  for (const p of PAYMENT) {
    const re = /^[a-z ]+$/.test(p) ? new RegExp(`\\b${p.replace(/\s+/g, '\\s*')}\\b`) : null;
    if (re ? re.test(s) : s.includes(p)) {
      found.add('offplatform_payment');
      break;
    }
  }

  // @handles other than the listed account's own handle
  const allowed = new Set(allowedHandles.map((h) => h.toLowerCase().replace(/^@/, '')));
  const handles = s.match(/(^|[^a-z0-9._])@([a-z0-9._]{3,30})/g) || [];
  for (const h of handles) {
    const name = h.replace(/^[^@]*@/, '');
    if (!allowed.has(name)) found.add('handle');
  }
  if (/\b(snap|sc|ig|insta|tiktok|tt)\s*[:：]\s*[a-z0-9._]{3,}/.test(s)) found.add('handle');

  return [...found];
}

export const VIOLATION_LABELS: Record<ChatViolation, string> = {
  phone: 'رقم هاتف',
  email: 'بريد إلكتروني',
  link: 'رابط خارجي',
  messaging_app: 'تطبيق مراسلة خارجي',
  handle: 'معرّف حساب خارجي',
  offplatform_payment: 'دفع خارج المنصة',
};
