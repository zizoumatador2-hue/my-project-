/* Site-wide progressive enhancements. Every feature works (or degrades gracefully) without JS. */
import { track, initConsent } from './analytics';

document.documentElement.classList.add('js');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Toast ---------- */
export function toast(msg: string) {
  const el = document.querySelector<HTMLElement>('[data-toast]');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('is-visible');
  window.clearTimeout(Number(el.dataset.t));
  el.dataset.t = String(window.setTimeout(() => el.classList.remove('is-visible'), 2600));
}

/* ---------- Sticky header that shrinks on scroll ---------- */
const header = document.querySelector<HTMLElement>('[data-header]');
const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 12);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- Desktop dropdowns (click + keyboard) ---------- */
document.querySelectorAll<HTMLButtonElement>('[data-dropdown]').forEach((btn) => {
  const menu = document.getElementById(btn.getAttribute('aria-controls') || '');
  const set = (open: boolean) => {
    btn.setAttribute('aria-expanded', String(open));
    menu?.classList.toggle('is-open', open);
  };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  btn.parentElement?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      set(false);
      btn.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!btn.parentElement?.contains(e.target as Node)) set(false);
  });
});

/* ---------- Mobile menu with focus trap ---------- */
const mm = document.querySelector<HTMLElement>('[data-mobile-menu]');
const openBtn = document.querySelector<HTMLButtonElement>('[data-menu-open]');
const focusables = () =>
  Array.from(mm?.querySelectorAll<HTMLElement>('a[href], button, summary, input, [tabindex]:not([tabindex="-1"])') ?? []).filter((el) => el.offsetParent !== null);
function setMenu(open: boolean) {
  if (!mm) return;
  mm.classList.toggle('is-open', open);
  mm.setAttribute('aria-hidden', String(!open));
  openBtn?.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) window.setTimeout(() => focusables()[0]?.focus(), 50);
  else openBtn?.focus();
}
openBtn?.addEventListener('click', () => setMenu(true));
mm?.querySelectorAll('[data-menu-close]').forEach((b) => b.addEventListener('click', () => setMenu(false)));
mm?.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setMenu(false);
  if (e.key !== 'Tab') return;
  const f = focusables();
  const first = f[0];
  const last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last?.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first?.focus();
  }
});

/* ---------- Scroll reveals (staggered) ---------- */
const reveals = document.querySelectorAll<HTMLElement>('[data-reveal]');
if (reduceMotion || !('IntersectionObserver' in window)) {
  reveals.forEach((el) => el.classList.add('is-in'));
} else {
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      }),
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  document.querySelectorAll<HTMLElement>('[data-stagger]').forEach((group) => {
    group.querySelectorAll<HTMLElement>(':scope > [data-reveal]').forEach((el, i) => el.style.setProperty('--d', String(i % 6)));
  });
  reveals.forEach((el) => io.observe(el));
}

/* ---------- Parallax on select large images ---------- */
const parallax = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
if (!reduceMotion && parallax.length) {
  let ticking = false;
  const update = () => {
    const vh = window.innerHeight;
    parallax.forEach((el) => {
      const r = el.parentElement!.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const p = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.transform = `translate3d(0, ${(p * -40).toFixed(1)}px, 0) scale(1.12)`;
    });
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
}

/* ---------- Draggable snap carousel ---------- */
document.querySelectorAll<HTMLElement>('[data-carousel]').forEach((track) => {
  let down = false;
  let startX = 0;
  let startScroll = 0;
  let moved = false;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    down = true;
    moved = false;
    startX = e.clientX;
    startScroll = track.scrollLeft;
  });
  window.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 5) {
      moved = true;
      track.classList.add('is-dragging');
    }
    track.scrollLeft = startScroll - dx;
  });
  window.addEventListener('pointerup', () => {
    if (!down) return;
    down = false;
    track.classList.remove('is-dragging');
  });
  track.addEventListener('click', (e) => {
    if (moved) {
      e.preventDefault();
      e.stopPropagation();
      moved = false;
    }
  }, true);
  track.addEventListener('dragstart', (e) => e.preventDefault());
  const id = track.id;
  document.querySelectorAll<HTMLButtonElement>(`[data-carousel-prev="${id}"], [data-carousel-next="${id}"]`).forEach((b) =>
    b.addEventListener('click', () => {
      const dir = b.hasAttribute('data-carousel-next') ? 1 : -1;
      track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: reduceMotion ? 'auto' : 'smooth' });
    }),
  );
});

/* ---------- Saved trips (kept locally on this device) ---------- */
const SAVE_KEY = 'sv:saved';
type Saved = { id: string; title: string; href: string; img?: string; kind?: string };
export function getSaved(): Saved[] {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY) || '[]');
  } catch {
    return [];
  }
}
function setSaved(list: Saved[]) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable — saving is a convenience only */
  }
  renderSaved();
}
function renderSaved() {
  const saved = getSaved();
  const ids = new Set(saved.map((s) => s.id));
  document.querySelectorAll<HTMLButtonElement>('[data-save]').forEach((b) => {
    const on = ids.has(b.dataset.save!);
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', `${on ? 'Remove' : 'Save'} ${b.dataset.title} ${on ? 'from' : 'to'} saved trips`);
  });
  document.querySelectorAll<HTMLElement>('[data-saved-count]').forEach((el) => (el.textContent = saved.length ? String(saved.length) : ''));
  document.dispatchEvent(new CustomEvent('saved:change'));
}
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-save]');
  if (!b) return;
  e.preventDefault();
  const list = getSaved();
  const i = list.findIndex((s) => s.id === b.dataset.save);
  if (i >= 0) {
    list.splice(i, 1);
    toast('Removed from saved trips');
  } else {
    list.push({ id: b.dataset.save!, title: b.dataset.title!, href: b.dataset.href!, img: b.dataset.img, kind: b.dataset.kind });
    toast('Saved! Find it under the heart icon.');
    track('save_item', { id: b.dataset.save! });
  }
  setSaved(list);
});
renderSaved();
(window as unknown as { svRenderSaved: () => void }).svRenderSaved = renderSaved;

/* ---------- Tabs (WAI-ARIA pattern) ---------- */
document.querySelectorAll<HTMLElement>('[data-tabs]').forEach((root) => {
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const select = (t: HTMLButtonElement) => {
    tabs.forEach((x) => {
      const on = x === t;
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(x.getAttribute('aria-controls')!);
      if (panel) panel.hidden = !on;
    });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      const n = tabs[(i + d + tabs.length) % tabs.length];
      n.focus();
      select(n);
    });
  });
});

/* ---------- AJAX forms (progressive enhancement over normal POST) ---------- */
document.querySelectorAll<HTMLFormElement>('form[data-ajax-form]').forEach((form) => {
  form.addEventListener('submit', async (e) => {
    const status = form.querySelector<HTMLElement>('[data-status]');
    if (!form.checkValidity()) {
      e.preventDefault();
      form.reportValidity();
      return;
    }
    e.preventDefault();
    const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    btn?.setAttribute('disabled', '');
    if (status) {
      status.dataset.state = '';
      status.textContent = 'Sending…';
    }
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
        credentials: 'same-origin',
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      if (status) {
        status.dataset.state = 'ok';
        status.textContent = data.message || 'Thank you!';
      }
      if (form.dataset.event) track(form.dataset.event);
      form.reset();
    } catch (err) {
      if (status) {
        status.dataset.state = 'error';
        status.textContent = (err as Error).message;
      }
    } finally {
      btn?.removeAttribute('disabled');
    }
  });
});

/* ---------- Outbound affiliate click events ---------- */
document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-affiliate]');
  if (a) track('affiliate_click', { id: a.dataset.affiliate || '', partner: a.dataset.partner || '', placement: a.dataset.placement || '' });
});

initConsent();
