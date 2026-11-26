/* Cinematic interactions inspired by ReactBits (SplitText/BlurText, TiltedCard, SpotlightCard,
   Magnet, CountUp, ScrollVelocity). Vanilla, passive listeners, rAF-throttled, and fully disabled
   under prefers-reduced-motion. Fine-pointer effects (tilt, magnet) only run on mouse devices. */

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------- SplitText / BlurText: word-by-word blur-in for [data-split] headings ---------- */
function splitWords(el: HTMLElement) {
  if (el.dataset.splitDone) return;
  el.dataset.splitDone = '1';
  const words = (el.textContent || '').trim().split(/\s+/);
  el.setAttribute('aria-label', words.join(' '));
  el.innerHTML = words.map((w, i) => `<span class="split-word" aria-hidden="true" style="--w:${i}">${w.replace(/</g, '&lt;')}</span>`).join(' ');
}
const splits = Array.from(document.querySelectorAll<HTMLElement>('[data-split]'));
if (!reduce && splits.length) {
  splits.forEach(splitWords);
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }),
    { threshold: 0.2 },
  );
  splits.forEach((el) => {
    // Above-the-fold headings animate immediately so they never delay the first paint.
    if (el.getBoundingClientRect().top < window.innerHeight) requestAnimationFrame(() => el.classList.add('is-in'));
    else io.observe(el);
  });
}

/* ---------- CountUp on real numbers ---------- */
const counters = Array.from(document.querySelectorAll<HTMLElement>('[data-countup]'));
if (counters.length) {
  const run = (el: HTMLElement) => {
    const target = Number(el.dataset.countup || 0);
    if (reduce || target === 0) {
      el.textContent = String(target);
      return;
    }
    const start = performance.now();
    const dur = 1600;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    el.textContent = '0';
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          run(e.target as HTMLElement);
          io.unobserve(e.target);
        }
      }),
    { threshold: 0.6 },
  );
  counters.forEach((c) => io.observe(c));
}

/* ---------- Scroll-driven hero (slow push-in + fade) and ScrollVelocity marquee ---------- */
const heroes = Array.from(document.querySelectorAll<HTMLElement>('[data-cine-hero]'));
const marquee = document.querySelector<HTMLElement>('[data-marquee] .marquee__track');
if (!reduce && (heroes.length || marquee)) {
  let lastY = window.scrollY;
  let velocity = 0;
  let offset = 0;
  let ticking = false;
  const half = () => (marquee ? marquee.scrollWidth / 2 : 1);
  const frame = () => {
    const y = window.scrollY;
    velocity = velocity * 0.9 + (y - lastY) * 0.1;
    lastY = y;
    for (const h of heroes) {
      const r = h.getBoundingClientRect();
      if (r.bottom < 0) continue;
      const p = Math.min(1, Math.max(0, -r.top / r.height));
      const media = h.querySelector<HTMLElement>('[data-hero-media]');
      if (media) media.style.transform = `translate3d(0, ${(p * 18).toFixed(2)}%, 0) scale(${(1 + p * 0.08).toFixed(3)})`;
      const inner = h.querySelector<HTMLElement>('.container');
      if (inner) inner.style.opacity = String(Math.max(0, 1 - p * 1.4).toFixed(3));
    }
    if (marquee) {
      offset -= 0.6 + Math.min(12, Math.abs(velocity) * 0.25);
      if (-offset >= half()) offset += half();
      marquee.style.transform = `translate3d(${offset.toFixed(1)}px, 0, 0)`;
    }
    ticking = false;
    if (marquee || Math.abs(velocity) > 0.1) schedule();
  };
  const schedule = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(frame);
    }
  };
  window.addEventListener('scroll', schedule, { passive: true });
  // The marquee runs continuously, but only while it is on screen.
  if (marquee) {
    const vis = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) schedule();
    });
    vis.observe(marquee);
  }
  schedule();
}

/* ---------- TiltedCard + glare, SpotlightCard, Magnet (mouse only) ---------- */
if (!reduce && finePointer) {
  document.addEventListener(
    'pointermove',
    (e) => {
      const t = e.target as HTMLElement;
      const card = t.closest<HTMLElement>('.card');
      if (card) {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.classList.add('is-tilting');
        card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
        card.style.transform = `perspective(900px) rotateX(${((0.5 - y) * 7).toFixed(2)}deg) rotateY(${((x - 0.5) * 9).toFixed(2)}deg) translateY(-6px)`;
      }
      const spot = t.closest<HTMLElement>('.info-card');
      if (spot) {
        const r = spot.getBoundingClientRect();
        spot.style.setProperty('--mx', `${e.clientX - r.left}px`);
        spot.style.setProperty('--my', `${e.clientY - r.top}px`);
      }
      const mag = t.closest<HTMLElement>('[data-magnet]');
      if (mag) {
        const r = mag.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        mag.style.transform = `translate(${(dx * 0.22).toFixed(1)}px, ${(dy * 0.3).toFixed(1)}px)`;
      }
    },
    { passive: true },
  );
  document.addEventListener(
    'pointerout',
    (e) => {
      const t = e.target as HTMLElement;
      const rel = e.relatedTarget as Node | null;
      const card = t.closest<HTMLElement>('.card');
      if (card && !(rel && card.contains(rel))) {
        card.classList.remove('is-tilting');
        card.style.transform = '';
      }
      const mag = t.closest<HTMLElement>('[data-magnet]');
      if (mag && !(rel && mag.contains(rel))) mag.style.transform = '';
    },
    { passive: true },
  );
}

export {};
