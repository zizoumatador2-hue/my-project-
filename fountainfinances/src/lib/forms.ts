/** Progressive enhancement for POST forms that talk to /api/* endpoints. */
interface Options {
  validate?: (data: FormData) => string | null;
  success: string;
  event?: string;
}

declare global {
  interface Window {
    ffTrack?: (name: string, params?: Record<string, unknown>) => void;
    turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string };
  }
}

let turnstileLoading: Promise<void> | null = null;
function loadTurnstile() {
  turnstileLoading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Verification failed to load'));
    document.head.appendChild(s);
  });
  return turnstileLoading;
}

/** Optional bot protection: only active when PUBLIC_TURNSTILE_SITE_KEY is set at build time. */
function lazyTurnstile(form: HTMLFormElement) {
  const box = form.querySelector<HTMLElement>('[data-turnstile]');
  if (!box) return;
  const start = async () => {
    form.removeEventListener('focusin', start);
    try {
      await loadTurnstile();
      window.turnstile?.render(box, { sitekey: box.dataset.turnstile, theme: 'light', size: 'flexible' });
    } catch {
      /* the server will reject the submission with a clear message */
    }
  };
  form.addEventListener('focusin', start);
}

export function enhanceForm(form: HTMLFormElement, opts: Options) {
  const status = form.querySelector<HTMLElement>('.form-status');
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  lazyTurnstile(form);
  const say = (msg: string, ok: boolean) => {
    if (!status) return;
    status.textContent = msg;
    status.className = `form-status ${ok ? 'ok' : 'err'}`;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const problem = opts.validate?.(data);
    if (problem) {
      say(problem, false);
      form.querySelector<HTMLElement>('[required]:invalid, input[type="email"]')?.focus();
      return;
    }
    const payload: Record<string, string> = {};
    data.forEach((v, k) => (payload[k] = String(v)));
    payload.path = location.pathname;
    if (button) button.disabled = true;
    say('Sending…', true);
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'same-origin',
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) throw new Error(body.error || 'Something went wrong. Please try again in a few minutes.');
      say(body.message || opts.success, true);
      form.reset();
      if (opts.event) window.ffTrack?.(opts.event, { placement: form.dataset.placement });
    } catch (err) {
      say(err instanceof Error ? err.message : 'Network error. Please try again.', false);
    } finally {
      if (button) button.disabled = false;
    }
  });
}
