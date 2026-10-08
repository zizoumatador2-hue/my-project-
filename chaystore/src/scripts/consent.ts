// Loads GA4 only after explicit consent. Not used unless PUBLIC_GA_ID is set.
const el = document.getElementById('consent');
const id = el?.dataset.ga;
const KEY = 'chay-consent';
function load() {
  if (!id) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(s);
  const w = window as unknown as { dataLayer: unknown[] };
  w.dataLayer = w.dataLayer || [];
  function gtag(..._a: unknown[]) { w.dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', id, { anonymize_ip: true });
}
let v: string | null = null;
try { v = localStorage.getItem(KEY); } catch {}
if (v === 'yes') load();
else if (v !== 'no' && el) {
  el.classList.add('show');
  el.querySelector('.yes')?.addEventListener('click', () => { try { localStorage.setItem(KEY, 'yes'); } catch {} el.classList.remove('show'); load(); });
  el.querySelector('.no')?.addEventListener('click', () => { try { localStorage.setItem(KEY, 'no'); } catch {} el.classList.remove('show'); });
}
