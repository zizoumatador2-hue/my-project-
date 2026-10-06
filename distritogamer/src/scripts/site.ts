// Small, dependency-free client script: menu, scroll reveals, card spotlight, consent-gated analytics/ads.
const d = document;

// Mobile menu
const btn = d.querySelector<HTMLButtonElement>('[data-menu-btn]');
const panel = d.querySelector<HTMLElement>('[data-menu-panel]');
if (btn && panel) {
  const set = (open: boolean) => {
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    panel.hidden = !open;
  };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  d.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
}

// Pillar contents: open by default on wide screens, collapsed on phones
if (matchMedia('(min-width: 1040px)').matches) d.querySelectorAll<HTMLDetailsElement>('.pillar-toc details').forEach((x) => (x.open = true));

// Scroll reveals (skipped entirely for reduced motion; CSS already shows content)
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const targets = d.querySelectorAll<HTMLElement>('.reveal');
if (reduce || !('IntersectionObserver' in window)) {
  targets.forEach((t) => t.classList.add('in'));
} else {
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  targets.forEach((t) => io.observe(t));
}

// Card spotlight (pointer devices only)
if (!reduce && matchMedia('(hover: hover)').matches) {
  d.addEventListener('pointermove', (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('[data-spot]');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });
}

// Consent-gated third parties. Nothing loads unless configured AND accepted.
const body = d.body;
const ga = body.dataset.ga || '';
const ads = body.dataset.ads || '';
const KEY = 'dg-consent';
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = (v: string) => { try { localStorage.setItem(KEY, v); } catch { /* storage unavailable */ } };

function loadThirdParties() {
  const idle = (window as any).requestIdleCallback || ((fn: () => void) => setTimeout(fn, 800));
  idle(() => {
    if (ga) {
      const s = d.createElement('script');
      s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`;
      d.head.appendChild(s);
      const w = window as any;
      w.dataLayer = w.dataLayer || [];
      w.gtag = function () { w.dataLayer.push(arguments); };
      w.gtag('js', new Date()); w.gtag('config', ga, { anonymize_ip: true });
    }
    if (ads) {
      const s = d.createElement('script');
      s.async = true; s.crossOrigin = 'anonymous';
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ads)}`;
      d.head.appendChild(s);
      d.querySelectorAll<HTMLElement>('[data-ad-slot]').forEach((slot) => {
        const ins = d.createElement('ins');
        ins.className = 'adsbygoogle'; ins.style.display = 'block';
        ins.setAttribute('data-ad-client', ads);
        ins.setAttribute('data-ad-slot', slot.dataset.adSlot || '');
        ins.setAttribute('data-ad-format', 'auto');
        ins.setAttribute('data-full-width-responsive', 'true');
        slot.appendChild(ins);
        try { ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({}); } catch { /* ignore */ }
      });
    }
  });
}

const bar = d.querySelector<HTMLElement>('[data-consent]');
if (ga || ads) {
  const state = read();
  if (state === 'granted') loadThirdParties();
  else if (!state && bar) {
    bar.hidden = false;
    bar.querySelector('[data-consent-accept]')?.addEventListener('click', () => { write('granted'); bar.hidden = true; loadThirdParties(); });
    bar.querySelector('[data-consent-decline]')?.addEventListener('click', () => { write('denied'); bar.hidden = true; });
  }
}
d.querySelector('[data-consent-reset]')?.addEventListener('click', () => { try { localStorage.removeItem(KEY); } catch { /* */ } if (bar) bar.hidden = false; });
