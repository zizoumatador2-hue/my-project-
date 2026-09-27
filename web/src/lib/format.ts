// Arabic formatting with Latin (Western) digits: most legible for prices/stats across Arab markets and
// consistent with card statements and bank transfers. Currency symbol placement follows ar locale.

const LOCALE = 'ar-u-nu-latn';

const moneyFmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const moneyFmt2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const intFmt = new Intl.NumberFormat(LOCALE);
const compactFmt = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 });
const dateFmt = new Intl.DateTimeFormat(LOCALE, { year: 'numeric', month: 'long', day: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const rel = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });

/** "$1,250.00" wrapped in Unicode LTR isolates so sign, symbol and digits never reorder inside Arabic text. */
export const money = (cents: number | null | undefined, exact = false) => {
  const v = (cents ?? 0) / 100;
  return `\u2066${v < 0 ? '-' : ''}$${(exact ? moneyFmt2 : moneyFmt).format(Math.abs(v))}\u2069`;
};
export const int = (n: number | null | undefined) => intFmt.format(n ?? 0);
export const compact = (n: number | null | undefined) => compactFmt.format(n ?? 0);
export const pct = (n: number | null | undefined) => `${intFmt.format(Math.round((n ?? 0) * 10) / 10)}٪`;
export const date = (ms: number | null | undefined) => (ms ? dateFmt.format(new Date(ms)) : '—');
export const dateTime = (ms: number | null | undefined) => (ms ? dateTimeFmt.format(new Date(ms)) : '—');

export function ago(ms: number | null | undefined): string {
  if (!ms) return '—';
  const diff = (ms - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return 'الآن';
  if (abs < 3600) return rel.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rel.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 30) return rel.format(Math.round(diff / 86400), 'day');
  return date(ms);
}

export function countdown(ms: number | null | undefined): string {
  if (!ms) return '—';
  let s = Math.max(0, Math.floor((ms - Date.now()) / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60);
  if (d > 0) return `${int(d)} يوم و${int(h)} ساعة`;
  if (h > 0) return `${int(h)} ساعة و${int(m)} دقيقة`;
  return `${int(m)} دقيقة`;
}

export function accountAge(year: number, month = 1): string {
  const months = (new Date().getUTCFullYear() - year) * 12 + (new Date().getUTCMonth() + 1 - month);
  if (months < 12) return `${int(Math.max(0, months))} شهر`;
  const y = Math.floor(months / 12);
  return y === 1 ? 'سنة واحدة' : y === 2 ? 'سنتان' : `${int(y)} ${y <= 10 ? 'سنوات' : 'سنة'}`;
}

/** Parses user-entered money (Arabic or Latin digits, commas) into cents. */
export function parseMoney(s: string): number | null {
  const t = s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[,،\s$]/g, '').replace('٫', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(parseFloat(t) * 100);
}

export function parseIntSafe(s: string): number | null {
  const t = s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[,،\s]/g, '');
  if (!/^\d+$/.test(t)) return null;
  return parseInt(t, 10);
}

export function parseDecimal(s: string): number | null {
  const t = s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace('٫', '.').replace(/[%٪\s]/g, '');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  return parseFloat(t);
}
