import { searchItems, type IndexItem, type SearchFilters } from '../lib/planner-core';
import { track } from './analytics';

const PER_PAGE = 12;
const KIND_LABEL: Record<string, string> = { destination: 'Destination', resort: 'Resort', guide: 'Guide', deal: 'Deal' };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function readFilters(p: URLSearchParams): SearchFilters & { page: number } {
  const num = (k: string) => (p.get(k) ? Number(p.get(k)) : undefined);
  return {
    q: p.get('q') || undefined,
    kind: p.get('kind') || undefined,
    destination: p.get('destination') || undefined,
    region: p.get('region') || undefined,
    type: p.get('type') || undefined,
    resortType: p.get('resortType') || undefined,
    budget: p.get('budget') || undefined,
    travelers: p.get('travelers') || undefined,
    month: num('month'),
    children: num('children'),
    activity: p.get('activity') || undefined,
    page: Math.max(1, num('page') ?? 1),
  };
}

function card(i: IndexItem) {
  const rating = i.rating ? `<span class="badge badge--glass">★ ${i.rating.value.toFixed(1)} · ${esc(i.rating.source)}</span>` : '';
  const footer =
    i.kind === 'resort' || i.kind === 'deal'
      ? `<span class="price-note">Prices vary. Check availability.</span><span class="link-arrow" aria-hidden="true">Details</span>`
      : `<span class="price-note">${esc(i.destinationName || '')}</span><span class="link-arrow" aria-hidden="true">${i.kind === 'guide' ? 'Read' : 'Explore'}</span>`;
  return `<article class="card">
    <div class="card__media"><img src="${esc(i.img)}" alt="${esc(i.imgAlt)}" width="1600" height="1000" loading="lazy">
      <div class="card__badges"><span class="badge badge--glass">${KIND_LABEL[i.kind]}</span>${i.adultsOnly ? '<span class="badge badge--gold">Adults-only</span>' : ''}${rating}</div>
      ${i.kind !== 'guide' ? `<button class="save-btn" type="button" aria-pressed="false" data-save="${i.kind}:${esc(i.id)}" data-title="${esc(i.title)}" data-href="${esc(i.href)}" data-img="${esc(i.img)}" data-kind="${KIND_LABEL[i.kind]}" aria-label="Save ${esc(i.title)}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg></button>` : ''}
    </div>
    <div class="card__body">
      <p class="card__kicker">${esc(i.kind === 'resort' ? i.destinationName : KIND_LABEL[i.kind])}</p>
      <h2 class="card__title"><a href="${esc(i.href)}">${esc(i.title)}</a></h2>
      <p class="card__text">${esc(i.summary)}</p>
      <div class="card__footer">${footer}</div>
    </div>
  </article>`;
}

export async function initSearch() {
  const form = document.querySelector<HTMLFormElement>('[data-search-form]');
  const out = document.querySelector<HTMLElement>('[data-search-results]');
  const count = document.querySelector<HTMLElement>('[data-search-count]');
  const pager = document.querySelector<HTMLElement>('[data-search-pager]');
  if (!form || !out || !count || !pager) return;

  let items: IndexItem[] = [];
  try {
    items = ((await (await fetch('/search-index.json')).json()) as { items: IndexItem[] }).items;
  } catch {
    count.textContent = 'Search is temporarily unavailable. Please browse destinations or guides instead.';
    out.innerHTML = '';
    return;
  }

  const apply = (push: boolean) => {
    const params = new URLSearchParams(location.search);
    const f = readFilters(params);
    // Sync form controls with the URL.
    for (const el of Array.from(form.elements) as HTMLInputElement[]) if (el.name) el.value = params.get(el.name) ?? '';
    const res = searchItems(items, f);
    const pages = Math.max(1, Math.ceil(res.length / PER_PAGE));
    const page = Math.min(f.page, pages);
    const slice = res.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    count.textContent = res.length ? `${res.length} ${res.length === 1 ? 'result' : 'results'}${pages > 1 ? ` · page ${page} of ${pages}` : ''}` : 'No results';
    out.innerHTML = slice.length
      ? slice.map(card).join('')
      : `<div class="empty-state" style="grid-column:1/-1"><h2>No matches for those filters</h2><p>Try removing a filter or two. Popular starting points:</p>
         <ul class="pill-list" style="justify-content:center"><li><a class="chip" href="/search/?type=romantic-getaways">Romantic getaways</a></li><li><a class="chip" href="/search/?type=adults-only-resorts">Adults-only resorts</a></li><li><a class="chip" href="/search/?region=usa">U.S. destinations</a></li><li><a class="chip" href="/plan-my-vacation/">Plan my vacation</a></li></ul></div>`;
    pager.innerHTML =
      pages > 1
        ? Array.from({ length: pages }, (_, k) => {
            const p = new URLSearchParams(params);
            p.set('page', String(k + 1));
            return k + 1 === page ? `<span aria-current="page">${k + 1}</span>` : `<a href="?${p}" data-page>${k + 1}</a>`;
          }).join('')
        : '';
    (window as unknown as { svRenderSaved?: () => void }).svRenderSaved?.();
    if (push && f.q) track('search', { q: f.q.slice(0, 60), results: res.length });
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    for (const [k, v] of new FormData(form).entries()) if (typeof v === 'string' && v.trim()) p.set(k, v.trim());
    history.pushState(null, '', `/search/${p.toString() ? `?${p}` : ''}`);
    apply(true);
  });
  form.addEventListener('change', (e) => {
    if ((e.target as HTMLElement).tagName === 'SELECT') form.requestSubmit();
  });
  pager.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-page]');
    if (!a) return;
    e.preventDefault();
    history.pushState(null, '', a.getAttribute('href'));
    apply(false);
    count.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  window.addEventListener('popstate', () => apply(false));
  apply(true);
}
