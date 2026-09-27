import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CATEGORIES, CATEGORY_LABELS, COUNTRIES, LANGUAGES, PLATFORMS, PLATFORM_LABELS } from '../../../shared/domain';
import { int } from '../lib/format';
import { Icon } from '../ui/icons';
import { ListingCard, ListingCardSkeleton, type ListingSummary } from '../ui/ListingCard';
import { Button, Empty, ErrorState, useFetch } from '../ui/kit';
import { PageHeader } from '../ui/Shell';

const SORTS: Record<string, string> = {
  newest: 'الأحدث', price_asc: 'السعر: من الأقل', price_desc: 'السعر: من الأعلى', followers_desc: 'الأكثر متابعين',
  engagement_desc: 'الأعلى تفاعلًا', age_desc: 'الأقدم إنشاءً', trust_desc: 'الأعلى ثقة للبائع',
};
const FILTER_KEYS = ['q', 'platform', 'category', 'country', 'language', 'minFollowers', 'maxFollowers', 'minPrice', 'maxPrice', 'minEngagement', 'maxEngagement', 'minAgeYears'];
const PAGE = 12;

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? ''])));
  const page = Math.max(0, Number(params.get('page')) || 0);
  const sort = params.get('sort') || 'newest';

  const query = useMemo(() => {
    const q = new URLSearchParams();
    for (const k of FILTER_KEYS) if (params.get(k)) q.set(k, params.get(k)!);
    q.set('sort', sort);
    q.set('limit', String(PAGE));
    q.set('offset', String(page * PAGE));
    return q.toString();
  }, [params, sort, page]);
  const res = useFetch<{ items: ListingSummary[]; total: number }>(`/listings?${query}`);
  const activeCount = FILTER_KEYS.filter((k) => k !== 'q' && params.get(k)).length;

  function apply(e?: React.FormEvent) {
    e?.preventDefault();
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(draft)) if (v.trim()) next.set(k, v.trim());
    if (sort !== 'newest') next.set('sort', sort);
    setParams(next);
    setShowFilters(false);
  }
  function reset() {
    setDraft(Object.fromEntries(FILTER_KEYS.map((k) => [k, ''])));
    setParams(new URLSearchParams());
  }
  const setP = (k: string, v: string) => setDraft((d) => ({ ...d, [k]: v }));
  const num = (k: string, label: string, ph: string) => (
    <div className="field">
      <label htmlFor={k}>{label}</label>
      <input id={k} className="input" inputMode="decimal" placeholder={ph} value={draft[k]} onChange={(e) => setP(k, e.target.value.replace(/[^\d.]/g, ''))} />
    </div>
  );

  const filters = (
    <form className="card filters" onSubmit={apply} aria-label="تصفية النتائج">
      <div className="form-grid two">
        <div className="field"><label htmlFor="platform">المنصة</label>
          <select id="platform" className="select" value={draft.platform} onChange={(e) => setP('platform', e.target.value)}>
            <option value="">الكل</option>{PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
          </select></div>
        <div className="field"><label htmlFor="category">المجال</label>
          <select id="category" className="select" value={draft.category} onChange={(e) => setP('category', e.target.value)}>
            <option value="">الكل</option>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select></div>
        <div className="field"><label htmlFor="country">دولة الجمهور</label>
          <select id="country" className="select" value={draft.country} onChange={(e) => setP('country', e.target.value)}>
            <option value="">الكل</option>{Object.entries(COUNTRIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
        <div className="field"><label htmlFor="language">اللغة الأساسية</label>
          <select id="language" className="select" value={draft.language} onChange={(e) => setP('language', e.target.value)}>
            <option value="">الكل</option>{Object.entries(LANGUAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
        {num('minFollowers', 'متابعون من', 'مثال: 10000')}
        {num('maxFollowers', 'متابعون إلى', 'بلا حد')}
        {num('minPrice', 'السعر من ($)', '0')}
        {num('maxPrice', 'السعر إلى ($)', 'بلا حد')}
        {num('minEngagement', 'تفاعل من (%)', '0')}
        {num('maxEngagement', 'تفاعل إلى (%)', 'بلا حد')}
        <div className="field"><label htmlFor="minAgeYears">أقل عمر للحساب</label>
          <select id="minAgeYears" className="select" value={draft.minAgeYears} onChange={(e) => setP('minAgeYears', e.target.value)}>
            <option value="">أي عمر</option><option value="1">سنة فأكثر</option><option value="2">سنتان فأكثر</option><option value="3">3 سنوات فأكثر</option><option value="5">5 سنوات فأكثر</option>
          </select></div>
      </div>
      <div className="row end">
        <Button type="button" variant="ghost" onClick={reset}>مسح الكل</Button>
        <Button type="submit">عرض النتائج</Button>
      </div>
    </form>
  );

  return (
    <div className="container page">
      <PageHeader title="تصفح الحسابات الموثّقة" sub="كل إعلان هنا اجتاز التحقق من الملكية ومراجعة بشرية." />
      <div className="stack">
        <form className="row" onSubmit={apply} role="search">
          <div className="input-affix grow">
            <input className="input" type="search" placeholder="ابحث بالعنوان أو المعرّف أو الوصف" value={draft.q} onChange={(e) => setP('q', e.target.value)} aria-label="بحث" />
            <span className="affix"><Icon.Search size={18} /></span>
          </div>
          <Button type="button" variant="secondary" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
            <Icon.Filter size={18} /> التصفية{activeCount > 0 && <span className="pill-count num">{activeCount}</span>}
          </Button>
        </form>
        {showFilters && filters}
        <div className="row between">
          <span className="small muted" aria-live="polite">{res.data ? `${int(res.data.total)} حساب` : ' '}</span>
          <label className="row small" style={{ gap: 6 }}>
            <span className="muted">الترتيب:</span>
            <select className="select" style={{ inlineSize: 'auto', minBlockSize: 38 }} value={sort} onChange={(e) => { const n = new URLSearchParams(params); n.set('sort', e.target.value); n.delete('page'); setParams(n); }}>
              {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {PLATFORMS.map((p) => (
            <button key={p} type="button" className="chip" aria-pressed={params.get('platform') === p}
              onClick={() => { const n = new URLSearchParams(params); if (n.get('platform') === p) n.delete('platform'); else n.set('platform', p); n.delete('page'); setParams(n); setDraft((d) => ({ ...d, platform: n.get('platform') ?? '' })); }}>
              {PLATFORM_LABELS[p]}
            </button>
          ))}
        </div>
        {res.error ? <ErrorState error={res.error} onRetry={res.reload} /> : !res.data || res.loading ? (
          <div className="grid cols-3">{Array.from({ length: 6 }, (_, i) => <ListingCardSkeleton key={i} />)}</div>
        ) : res.data.items.length === 0 ? (
          <Empty icon={<Icon.Search size={26} />} title="لا توجد نتائج مطابقة" action={activeCount > 0 || params.get('q') ? <Button variant="secondary" onClick={reset}>مسح عوامل التصفية</Button> : undefined}>
            جرّب توسيع نطاق التصفية.
          </Empty>
        ) : (
          <>
            <div className="grid cols-3">{res.data.items.map((l) => <ListingCard key={l.id} l={l} />)}</div>
            {res.data.total > PAGE && (
              <nav className="row" style={{ justifyContent: 'center' }} aria-label="الصفحات">
                <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => { const n = new URLSearchParams(params); n.set('page', String(page - 1)); setParams(n); }}><Icon.ChevronBack size={16} /> السابق</Button>
                <span className="small muted num">صفحة {int(page + 1)} من {int(Math.ceil(res.data.total / PAGE))}</span>
                <Button variant="secondary" size="sm" disabled={(page + 1) * PAGE >= res.data.total} onClick={() => { const n = new URLSearchParams(params); n.set('page', String(page + 1)); setParams(n); }}>التالي <Icon.ChevronForward size={16} /></Button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
