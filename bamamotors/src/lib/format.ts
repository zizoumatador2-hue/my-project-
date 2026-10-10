const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('en-US');

export const formatPrice = (cents: number): string => usd.format(Math.round(cents / 100));
export const formatNumber = (n: number): string => num.format(n);

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Chicago' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago',
  });
}

/** Estimated monthly payment (standard amortization). Used only as a clearly-labelled estimate. */
export function monthlyPayment(principal: number, aprPercent: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = aprPercent / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export function vehicleTitle(v: { year: number; make_name: string; model_name: string; trim?: string | null }): string {
  return [v.year, v.make_name, v.model_name, v.trim].filter(Boolean).join(' ');
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.5 ? cut.slice(0, sp) : cut).trimEnd()}…`;
}
