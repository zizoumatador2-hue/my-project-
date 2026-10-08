// Cinematic effects: steam particles, parallax, scroll reveal, reading progress.
// Everything is progressive enhancement and respects prefers-reduced-motion.
const root = document.documentElement;
root.classList.add('js');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('loaded')));

// Scroll reveal
const reveals = document.querySelectorAll<HTMLElement>('.reveal');
if ('IntersectionObserver' in window && !reduce) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  reveals.forEach((el) => io.observe(el));
} else {
  reveals.forEach((el) => el.classList.add('in'));
}

// Reading progress bar
const bar = document.querySelector<HTMLElement>('.progress');
let ticking = false;
const parallax = document.querySelectorAll<HTMLElement>('[data-parallax]');
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const y = scrollY;
    if (bar) {
      const h = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${h > 0 ? Math.min(1, y / h) : 0})`;
    }
    if (!reduce) {
      parallax.forEach((el) => {
        const f = parseFloat(el.dataset.parallax || '0.2');
        if (y < innerHeight * 1.5) el.style.transform = `translate3d(0,${(y * f).toFixed(1)}px,0)`;
      });
    }
    ticking = false;
  });
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// A restrained pointer-lit editorial scene. It adds depth without hijacking
// scrolling, and is skipped for touch/reduced-motion users.
const cinemaStage = document.querySelector<HTMLElement>('[data-cinema-stage]');
const cinemaFrame = document.querySelector<HTMLElement>('[data-cinema-frame]');
if (cinemaStage && cinemaFrame && !reduce && matchMedia('(pointer:fine)').matches) {
  cinemaStage.addEventListener('pointermove', (event) => {
    const box = cinemaStage.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
    const y = Math.max(0, Math.min(1, (event.clientY - box.top) / box.height));
    cinemaStage.style.setProperty('--cinema-x', `${(x * 100).toFixed(1)}%`);
    cinemaStage.style.setProperty('--cinema-y', `${(y * 100).toFixed(1)}%`);
    cinemaFrame.style.setProperty('--cinema-ry', `${((x - 0.5) * 7).toFixed(2)}deg`);
    cinemaFrame.style.setProperty('--cinema-rx', `${((0.5 - y) * 5).toFixed(2)}deg`);
  }, { passive: true });
  cinemaStage.addEventListener('pointerleave', () => {
    cinemaFrame.style.setProperty('--cinema-ry', '-3deg');
    cinemaFrame.style.setProperty('--cinema-rx', '1deg');
  });
}

// Steam: soft rising puffs on a canvas, paused when off-screen.
const canvas = document.querySelector<HTMLCanvasElement>('.hero-steam');
if (canvas) {
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    let w = 0, h = 0;
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 128;
    const sc = sprite.getContext('2d')!;
    const g = sc.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,244,225,0.55)');
    g.addColorStop(1, 'rgba(255,244,225,0)');
    sc.fillStyle = g;
    sc.fillRect(0, 0, 128, 128);

    type P = { x: number; y: number; s: number; v: number; a: number; d: number; ph: number };
    let ps: P[] = [];
    const mk = (initial: boolean): P => ({
      x: w * (0.45 + Math.random() * 0.5),
      y: initial ? Math.random() * h : h + 80,
      s: 90 + Math.random() * 160,
      v: 0.25 + Math.random() * 0.55,
      a: 0.25 + Math.random() * 0.5,
      d: (Math.random() - 0.5) * 0.4,
      ph: Math.random() * Math.PI * 2,
    });
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = w < 640 ? 14 : 26;
      ps = Array.from({ length: n }, () => mk(true));
    };
    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.y -= p.v;
        p.x += p.d + Math.sin(t / 2200 + p.ph) * 0.35;
        p.s += 0.18;
        const life = Math.max(0, Math.min(1, p.y / h));
        ctx.globalAlpha = p.a * Math.sin(Math.PI * (1 - life)) * 0.8;
        ctx.drawImage(sprite, p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
        if (p.y < -p.s) Object.assign(p, mk(false));
      }
    };
    resize();
    addEventListener('resize', resize);
    if (reduce) {
      draw(0);
    } else {
      let run = true, raf = 0;
      const loop = (t: number) => { if (run) { draw(t); raf = requestAnimationFrame(loop); } };
      new IntersectionObserver(([e]) => {
        run = e.isIntersecting;
        if (run) raf = requestAnimationFrame(loop); else cancelAnimationFrame(raf);
      }).observe(canvas);
    }
  }
}

