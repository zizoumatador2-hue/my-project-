/* Consent-gated analytics and ads. Events are queued until consent, then forwarded to
   Plausible and/or GA4 (whichever is configured). Google Consent Mode v2 defaults every
   storage type to "denied"; it is only upgraded after the visitor accepts. AdSense (when
   configured) therefore serves non-personalized ads until consent is given. */

const KEY = 'sv:consent';
type Consent = 'accept' | 'reject' | null;
type Props = Record<string, string | number>;

const queue: [string, Props][] = [];
let loaded = false;

declare global {
  interface Window {
    plausible?: (e: string, o?: { props?: Props }) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    svTrack?: typeof track;
    adsbygoogle?: unknown[];
  }
}

window.dataLayer = window.dataLayer || [];
window.gtag =
  window.gtag ||
  function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
const GRANTED = { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' };
// Consent defaults (denied) are set earlier by /consent-default.js, before the AdSense tag in <head>.

function getConsent(): Consent {
  try {
    return localStorage.getItem(KEY) as Consent;
  } catch {
    return null;
  }
}

function loadScript(src: string, attrs: Record<string, string> = {}, async = false) {
  const s = document.createElement('script');
  s.src = src;
  if (async) s.async = true;
  else s.defer = true;
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  document.head.appendChild(s);
}

function loadAnalytics() {
  if (loaded) return;
  loaded = true;
  const plausible = document.body.dataset.plausible;
  const ga4 = document.body.dataset.ga4;
  if (plausible) {
    window.plausible = window.plausible || ((...a: unknown[]) => ((window as unknown as { _pq: unknown[] })._pq ||= []).push(a));
    loadScript('https://plausible.io/js/script.tagged-events.js', { 'data-domain': plausible });
  }
  if (ga4) {
    window.gtag!('js', new Date());
    window.gtag!('config', ga4, { anonymize_ip: true });
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4)}`);
  }
  queue.splice(0).forEach(([e, p]) => send(e, p));
}

function send(event: string, props: Props) {
  window.plausible?.(event, { props });
  window.gtag?.('event', event, props);
}

/** AdSense: the tag itself loads in <head> (Base.astro); this fills each labeled <ins class="adsbygoogle"> slot once. */
function loadAds() {
  const client = document.body.dataset.adsense;
  if (!client) return;
  document.querySelectorAll('ins.adsbygoogle').forEach(() => (window.adsbygoogle = window.adsbygoogle || []).push({}));
}

/** Analytics hook used across the site: clicks, searches, planner submissions, newsletter signups. */
export function track(event: string, props: Props = {}) {
  if (getConsent() !== 'accept') return;
  if (!loaded) queue.push([event, props]);
  else send(event, props);
}
window.svTrack = track;

export function initConsent() {
  const banner = document.querySelector<HTMLElement>('[data-cookie-banner]');
  const current = getConsent();
  if (current === 'accept') {
    window.gtag!('consent', 'update', GRANTED);
    loadAnalytics();
  }
  loadAds();
  if (!current && banner) banner.hidden = false;
  banner?.querySelectorAll<HTMLButtonElement>('[data-consent]').forEach((b) =>
    b.addEventListener('click', () => {
      const v = b.dataset.consent as Consent;
      try {
        localStorage.setItem(KEY, v!);
      } catch {
        /* ignore */
      }
      banner.hidden = true;
      if (v === 'accept') {
        window.gtag!('consent', 'update', GRANTED);
        loadAnalytics();
      } else {
        window.gtag!('consent', 'update', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
      }
    }),
  );
  document.querySelectorAll('[data-cookie-settings]').forEach((b) =>
    b.addEventListener('click', () => {
      if (!banner) return;
      banner.hidden = false;
      banner.querySelector<HTMLButtonElement>('[data-consent]')?.focus();
    }),
  );
}
