export const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export const wordCount = (md: string) =>
  md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_|`-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
export const readingMinutes = (words: number) => Math.max(1, Math.round(words / 230));
/** "PT2H30M" / "P7D" → "2 hours 30 minutes" / "7 days" */
export function durationText(iso: string) {
  const m = iso.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/);
  if (!m) return iso;
  const [, d, h, min] = m;
  const part = (n: string | undefined, u: string) => (n ? `${n} ${u}${n === '1' ? '' : 's'}` : '');
  return [part(d, 'day'), part(h, 'hour'), part(min, 'minute')].filter(Boolean).join(' ');
}
