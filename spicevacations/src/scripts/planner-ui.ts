import { plan, type IndexItem, type PlanResult } from '../lib/planner-core';
import { track } from './analytics';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function collect(form: HTMLFormElement) {
  const fd = new FormData(form);
  const o: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== 'string' || v === '') continue;
    if (k === 'interests') ((o.interests as string[]) ||= []).push(v);
    else if (['budget', 'days', 'adults', 'children', 'month'].includes(k)) o[k] = Number(v);
    else o[k] = v;
  }
  return o;
}

let localIndex: IndexItem[] | undefined;
async function requestPlan(body: Record<string, unknown>): Promise<PlanResult> {
  try {
    const res = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 404 || res.status === 405) throw new TypeError('planner api unavailable');
    const data = (await res.json()) as { ok: boolean; result?: PlanResult; error?: string };
    if (!data.ok || !data.result) throw new Error(data.error || 'Something went wrong.');
    return data.result;
  } catch (err) {
    // Resilience: if the API is unreachable (e.g. static preview), rank the same index in the browser.
    if (!(err instanceof TypeError)) throw err;
    localIndex ||= ((await (await fetch('/search-index.json')).json()) as { items: IndexItem[] }).items;
    return plan(localIndex, body);
  }
}

function card(r: PlanResult['recommendations'][number]) {
  const i = r.item;
  const kind = i.kind === 'resort' ? 'Resort' : 'Destination';
  return `<article class="card is-in" data-reveal>
    <div class="card__media"><img src="${esc(i.img)}" alt="${esc(i.imgAlt)}" width="1600" height="1000" loading="lazy">
      <div class="card__badges"><span class="badge badge--glass">${kind}</span>${i.adultsOnly ? '<span class="badge badge--gold">Adults-only</span>' : ''}</div>
      <button class="save-btn" type="button" aria-pressed="false" data-save="${i.kind}:${esc(i.id)}" data-title="${esc(i.title)}" data-href="${esc(i.href)}" data-img="${esc(i.img)}" data-kind="${kind}" aria-label="Save ${esc(i.title)}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg></button>
    </div>
    <div class="card__body">
      <p class="card__kicker">${esc(i.destinationName && i.kind === 'resort' ? i.destinationName : 'Destination')}</p>
      <h3 class="card__title"><a href="${esc(i.href)}">${esc(i.title)}</a></h3>
      <p class="card__text"><strong>Why it matches:</strong></p>
      <ul class="reasons">${r.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="card__footer"><span class="price-note">Prices vary. Check availability.</span><span class="link-arrow" aria-hidden="true">View</span></div>
    </div>
  </article>`;
}

function render(result: PlanResult) {
  const wrap = document.querySelector<HTMLElement>('[data-results]')!;
  const grid = wrap.querySelector<HTMLElement>('[data-results-grid]')!;
  const guides = wrap.querySelector<HTMLElement>('[data-results-guides]')!;
  wrap.querySelector('[data-results-summary]')!.textContent = result.summary;
  if (!result.recommendations.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>No close matches yet</h3><p>Try widening your destination or trip style, or <a href="/destinations/">browse all destinations</a>.</p></div>`;
  } else grid.innerHTML = result.recommendations.map(card).join('');
  guides.innerHTML = result.guides.length
    ? `<h3>Guides to read next</h3><ul class="pill-list mt-2">${result.guides.map((g) => `<li><a class="chip" href="${esc(g.href)}">${esc(g.title)}</a></li>`).join('')}</ul>`
    : '';
  wrap.hidden = false;
  (window as unknown as { svRenderSaved?: () => void }).svRenderSaved?.();
  const title = wrap.querySelector<HTMLElement>('[data-results-title]')!;
  title.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  title.focus({ preventScroll: true });
}

async function run(body: Record<string, unknown>, errorEl?: HTMLElement | null) {
  const sk = document.querySelector<HTMLElement>('[data-skeletons]')!;
  const wrapOuter = document.querySelector<HTMLElement>('[data-results-wrap]')!;
  document.querySelector<HTMLElement>('[data-results]')!.hidden = true;
  sk.hidden = false;
  wrapOuter.setAttribute('aria-busy', 'true');
  if (errorEl) errorEl.textContent = '';
  try {
    const result = await requestPlan(body);
    track('planner_submit', { provider: result.provider, matches: result.recommendations.length });
    render(result);
  } catch (e) {
    if (errorEl) errorEl.textContent = (e as Error).message;
  } finally {
    sk.hidden = true;
    wrapOuter.setAttribute('aria-busy', 'false');
  }
}

export function initPlanner() {
  const form = document.querySelector<HTMLFormElement>('[data-planner]');
  if (!form) return;
  const steps = Array.from(form.querySelectorAll<HTMLElement>('[data-step]'));
  const prev = form.querySelector<HTMLButtonElement>('[data-prev]')!;
  const next = form.querySelector<HTMLButtonElement>('[data-next]')!;
  const submit = form.querySelector<HTMLButtonElement>('[data-submit]')!;
  const progress = form.querySelector<HTMLElement>('[data-progress]')!;
  const label = form.querySelector<HTMLElement>('[data-step-label]')!;
  const errorEl = form.querySelector<HTMLElement>('[data-planner-error]');
  let i = 0;
  const show = (n: number, focus = true) => {
    i = Math.max(0, Math.min(steps.length - 1, n));
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    prev.style.visibility = i === 0 ? 'hidden' : 'visible';
    next.hidden = i === steps.length - 1;
    submit.hidden = i !== steps.length - 1;
    progress.style.width = `${((i + 1) / steps.length) * 100}%`;
    label.textContent = `Step ${i + 1} of ${steps.length}`;
    if (focus) steps[i].querySelector<HTMLElement>('input, select, textarea')?.focus();
  };
  prev.addEventListener('click', () => show(i - 1));
  next.addEventListener('click', () => show(i + 1));

  // Prefill from URL (?destination=, ?type=) so destination and category pages can deep-link.
  const params = new URLSearchParams(location.search);
  const dest = params.get('destination');
  const type = params.get('type');
  if (dest) (form.elements.namedItem('destination') as HTMLSelectElement).value = dest;
  if (type) form.querySelector<HTMLInputElement>(`input[name="vacationType"][value="${CSS.escape(type)}"]`)?.click();
  show(0, false);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    run(collect(form), errorEl);
  });
  document.querySelector<HTMLFormElement>('[data-quick-planner]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.currentTarget as HTMLFormElement;
    if (!f.checkValidity()) return f.reportValidity();
    run({ text: (f.elements.namedItem('text') as HTMLTextAreaElement).value, travelers: undefined }, errorEl);
  });
  document.querySelector('[data-restart]')?.addEventListener('click', () => {
    form.reset();
    document.querySelector<HTMLElement>('[data-results]')!.hidden = true;
    show(0);
    form.scrollIntoView({ behavior: 'smooth' });
  });
}
