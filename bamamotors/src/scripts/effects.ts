/**
 * Lightweight vanilla adaptations of React Bits effects (SpotlightCard, CountUp, FadeContent).
 * React Bits © 2026 David Haz — MIT + Commons Clause. https://github.com/DavidHDev/react-bits
 * Passive listeners + rAF keep interaction latency (INP) low.
 */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// SpotlightCard: one delegated pointer listener for every .spotlight element.
let pending: { el: HTMLElement; x: number; y: number } | null = null;
document.addEventListener(
  'pointermove',
  (e) => {
    const el = (e.target as Element | null)?.closest<HTMLElement>('.spotlight');
    if (!el) return;
    const r = el.getBoundingClientRect();
    const first = !pending;
    pending = { el, x: e.clientX - r.left, y: e.clientY - r.top };
    if (first) requestAnimationFrame(() => {
      if (pending) { pending.el.style.setProperty('--mx', `${pending.x}px`); pending.el.style.setProperty('--my', `${pending.y}px`); }
      pending = null;
    });
  },
  { passive: true },
);

// CountUp: numbers are server-rendered (correct without JS); animate from 0 when visible.
function countUp(el: HTMLElement) {
  const to = Number(el.dataset.count);
  if (!Number.isFinite(to) || reduce) return;
  const prefix = el.dataset.prefix ?? '';
  const suffix = el.dataset.suffix ?? '';
  const dur = 1400;
  const t0 = performance.now();
  const fmt = new Intl.NumberFormat('en-US');
  const step = (t: number) => {
    const p = Math.min(1, (t - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = `${prefix}${fmt.format(Math.round(to * eased))}${suffix}`;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// FadeContent: reveal on scroll.
const io = 'IntersectionObserver' in window
  ? new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          const el = en.target as HTMLElement;
          el.classList.add('in');
          el.querySelectorAll<HTMLElement>('[data-count]').forEach(countUp);
          io!.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
  : null;

document.querySelectorAll<HTMLElement>('.reveal, .reveal-stagger').forEach((el) => {
  if (el.classList.contains('reveal-stagger')) Array.from(el.children).forEach((c, i) => (c as HTMLElement).style.setProperty('--i', String(Math.min(i, 12))));
  if (io && !reduce) io.observe(el);
  else el.classList.add('in');
});
