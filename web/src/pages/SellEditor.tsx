import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CATEGORIES, CATEGORY_LABELS, CODE_METHODS, CODE_METHOD_LABELS, COUNTRIES, LANGUAGES, LISTING_STATUS_LABELS, PLATFORMS, PLATFORM_LABELS, computeCommission, type Platform,
} from '../../../shared/domain';
import { ApiError, del, post, put } from '../lib/api';
import { date, dateTime, int, money, parseDecimal, parseIntSafe, parseMoney } from '../lib/format';
import { useSession } from '../lib/session';
import { Icon, PlatformBadge } from '../ui/icons';
import { Alert, Button, Field, Loadable, Turnstile, useAction, useFetch, useToast } from '../ui/kit';
import { PageHeader } from '../ui/Shell';
import { STATUS_TONE } from './Sell';

const EVIDENCE_KINDS = [
  { kind: 'settings', title: 'لقطة إعدادات الحساب', hint: 'صفحة الإعدادات/الحساب وتظهر فيها صلاحيتك كمالك (البريد أو الهاتف مموّه جزئيًا مقبول).', required: true },
  { kind: 'analytics', title: 'لقطة الإحصاءات', hint: 'لوحة الإحصاءات: عدد المتابعين، التفاعل، وتوزيع الجمهور حسب الدولة.', required: true },
  { kind: 'code_proof', title: 'لقطة رمز التحقق', hint: 'لقطة للملف الشخصي والرمز ظاهر فيه (تسرّع المراجعة).', required: false },
  { kind: 'other', title: 'أدلة إضافية', hint: 'أي لقطات أخرى تدعم الإعلان (مثل تاريخ الإنشاء).', required: false },
];

const years = Array.from({ length: new Date().getFullYear() - 2003 }, (_, i) => new Date().getFullYear() - i);

type Form = { platform: Platform; handle: string; title: string; description: string; followers: string; engagementRate: string; category: string; country: string; language: string; accountCreatedYear: string; accountCreatedMonth: string; price: string; codeMethod: string };
const empty: Form = { platform: 'instagram', handle: '', title: '', description: '', followers: '', engagementRate: '', category: 'lifestyle', country: 'SA', language: 'ar', accountCreatedYear: String(new Date().getFullYear() - 3), accountCreatedMonth: '1', price: '', codeMethod: 'bio' };

function DetailsForm({ initial, onSaved, listingId }: { initial: Form; onSaved: (id: string) => void; listingId?: string }) {
  const [f, setF] = useState<Form>(initial);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { config } = useSession();
  const toast = useToast();
  const set = (k: keyof Form, v: string) => setF((x) => ({ ...x, [k]: v }));
  const methods = CODE_METHODS[f.platform];
  useEffect(() => { if (!methods.includes(f.codeMethod as never)) set('codeMethod', methods[0]); }, [f.platform]); // eslint-disable-line react-hooks/exhaustive-deps

  const priceCents = parseMoney(f.price);
  const fee = priceCents && config ? computeCommission(priceCents, config.commission) : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const local: Record<string, string> = {};
    const followers = parseIntSafe(f.followers);
    const eng = parseDecimal(f.engagementRate);
    if (!f.handle.trim()) local.handle = 'مطلوب';
    if (f.title.trim().length < 8) local.title = 'العنوان قصير جدًا';
    if (f.description.trim().length < 30) local.description = '30 حرفًا على الأقل';
    if (followers === null || followers < 100) local.followers = 'رقم صحيح (100 على الأقل)';
    if (eng === null || eng > 100) local.engagementRate = 'نسبة بين 0 و100';
    if (priceCents === null || priceCents < 1000) local.priceCents = 'أقل سعر 10 دولارات';
    setFields(local);
    if (Object.keys(local).length) return;
    const payload = {
      platform: f.platform, handle: f.handle, title: f.title, description: f.description, followers, engagementRate: eng, category: f.category,
      country: f.country, language: f.language, accountCreatedYear: Number(f.accountCreatedYear), accountCreatedMonth: Number(f.accountCreatedMonth),
      priceCents, codeMethod: f.codeMethod,
    };
    setBusy(true);
    try {
      if (listingId) { await put(`/listings/${listingId}`, payload); toast('success', 'تم حفظ البيانات'); onSaved(listingId); }
      else { const r = await post<{ id: string }>('/listings', payload); toast('success', 'تم إنشاء المسودة — أثبت الملكية الآن'); onSaved(r.id); }
    } catch (e2) {
      if (e2 instanceof ApiError) { setErr(e2.message); setFields(e2.fields); } else setErr('تعذّر الحفظ.');
    } finally { setBusy(false); }
  }

  return (
    <form className="card pad-lg stack" onSubmit={submit} noValidate>
      <h2 style={{ fontSize: '1.15rem', margin: 0 }}>1. بيانات الحساب</h2>
      {err && <Alert kind="danger">{err}</Alert>}
      <div className="form-grid two">
        <Field label="المنصة" htmlFor="platform">
          <select id="platform" className="select" value={f.platform} onChange={(e) => set('platform', e.target.value)}>{PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}</select>
        </Field>
        <Field label="معرّف الحساب" htmlFor="handle" error={fields.handle} hint="بدون @، كما يظهر في رابط الحساب.">
          <input id="handle" className="input ltr-input" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={f.handle} onChange={(e) => set('handle', e.target.value)} aria-invalid={!!fields.handle} />
        </Field>
        <Field label="عنوان الإعلان" htmlFor="title" error={fields.title} className="span-2">
          <input id="title" className="input" maxLength={90} value={f.title} onChange={(e) => set('title', e.target.value)} aria-invalid={!!fields.title} />
        </Field>
        <Field label="الوصف" htmlFor="desc" error={fields.description} className="span-2" hint="نوع المحتوى، مصادر الجمهور، أي قيود. لا تضع وسائل تواصل خارجية.">
          <textarea id="desc" className="textarea" maxLength={3000} value={f.description} onChange={(e) => set('description', e.target.value)} aria-invalid={!!fields.description} />
        </Field>
        <Field label="عدد المتابعين" htmlFor="followers" error={fields.followers} hint="يجب أن يطابق لقطة الإحصاءات (±10٪).">
          <input id="followers" className="input" inputMode="numeric" value={f.followers} onChange={(e) => set('followers', e.target.value)} aria-invalid={!!fields.followers} />
        </Field>
        <Field label="معدل التفاعل (٪)" htmlFor="eng" error={fields.engagementRate}>
          <input id="eng" className="input" inputMode="decimal" value={f.engagementRate} onChange={(e) => set('engagementRate', e.target.value)} aria-invalid={!!fields.engagementRate} />
        </Field>
        <Field label="المجال" htmlFor="cat">
          <select id="cat" className="select" value={f.category} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}</select>
        </Field>
        <Field label="دولة الجمهور الرئيسية" htmlFor="country">
          <select id="country" className="select" value={f.country} onChange={(e) => set('country', e.target.value)}>{Object.entries(COUNTRIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </Field>
        <Field label="اللغة الأساسية" htmlFor="lang">
          <select id="lang" className="select" value={f.language} onChange={(e) => set('language', e.target.value)}>{Object.entries(LANGUAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </Field>
        <Field label="تاريخ إنشاء الحساب" htmlFor="year">
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <select aria-label="الشهر" className="select" value={f.accountCreatedMonth} onChange={(e) => set('accountCreatedMonth', e.target.value)}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{new Intl.DateTimeFormat('ar', { month: 'long' }).format(new Date(2020, i, 1))}</option>)}</select>
            <select id="year" className="select" value={f.accountCreatedYear} onChange={(e) => set('accountCreatedYear', e.target.value)}>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
          </div>
        </Field>
        <Field label="السعر (دولار أمريكي)" htmlFor="price" error={fields.priceCents} hint={fee && priceCents ? `عمولة المنصة ${int(fee.bp / 100)}٪ (${money(fee.cents, true)}) · صافي لك ${money(priceCents - fee.cents, true)}` : 'تُخصم عمولة المنصة من البائع عند اكتمال البيع فقط.'}>
          <div className="input-affix"><input id="price" className="input" inputMode="decimal" value={f.price} onChange={(e) => set('price', e.target.value)} aria-invalid={!!fields.priceCents} /><span className="affix">$</span></div>
        </Field>
        <Field label="أين ستضع رمز التحقق؟" htmlFor="method" error={fields.codeMethod}>
          <select id="method" className="select" value={f.codeMethod} onChange={(e) => set('codeMethod', e.target.value)}>{methods.map((m) => <option key={m} value={m}>{CODE_METHOD_LABELS[m]}</option>)}</select>
        </Field>
      </div>
      <div className="row end"><Button type="submit" loading={busy}>{listingId ? 'حفظ التعديلات' : 'حفظ والمتابعة'}</Button></div>
    </form>
  );
}

function EvidencePanel({ listingId, evidence, onChange, locked }: { listingId: string; evidence: any[]; onChange: () => void; locked: boolean }) {
  const toast = useToast();
  const [uploading, setUploading] = useState<string | null>(null);
  async function upload(kind: string, file: File | undefined) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast('error', 'الحد الأقصى 8 ميغابايت للملف.'); return; }
    const fd = new FormData();
    fd.append('kind', kind);
    fd.append('file', file);
    setUploading(kind);
    try { await post(`/listings/${listingId}/evidence`, fd); toast('success', 'تم رفع الملف وتشفيره'); onChange(); }
    catch (e) { toast('error', e instanceof ApiError ? e.message : 'فشل الرفع. أعد المحاولة.'); }
    finally { setUploading(null); }
  }
  const [remove] = useAction(async (id: string) => { await del(`/listings/${listingId}/evidence/${id}`); onChange(); }, { success: 'تم حذف الملف' });
  return (
    <div className="card pad-lg stack">
      <div className="row between"><h2 style={{ fontSize: '1.15rem', margin: 0 }}>3. أدلة الملكية</h2><span className="badge"><Icon.Lock size={14} /> تشفير AES-256</span></div>
      <p className="small muted" style={{ margin: 0 }}>PNG أو JPG أو WEBP بحد أقصى 8 ميغابايت. يُمنع رفع لقطات استُخدمت في إعلانات أخرى — يُكتشف ذلك تلقائيًا.</p>
      <div className="grid cols-2">
        {EVIDENCE_KINDS.map((k) => {
          const files = evidence.filter((e) => e.kind === k.kind);
          return (
            <div key={k.kind} className="panel stack-sm">
              <div className="row between"><strong className="small">{k.title}</strong>{k.required ? (files.length ? <span className="badge vault"><Icon.Check size={12} />مكتمل</span> : <span className="badge warn">مطلوب</span>) : <span className="badge">اختياري</span>}</div>
              <span className="xs muted">{k.hint}</span>
              {files.map((f) => (
                <div key={f.id} className="row between xs" style={{ background: 'var(--surface)', borderRadius: 8, padding: '6px 10px', border: '1px solid var(--line)' }}>
                  <span className="row" style={{ gap: 6 }}><Icon.File size={14} /> {f.mime.split('/')[1].toUpperCase()} · {int(Math.round(f.size / 1024))} KB · {dateTime(f.created_at)}</span>
                  {!locked && <button className="btn btn-ghost btn-sm" onClick={() => remove(f.id)} aria-label="حذف الملف">حذف</button>}
                </div>
              ))}
              {!locked && (
                <label className="upload-zone">
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { upload(k.kind, e.target.files?.[0]); e.target.value = ''; }} disabled={!!uploading} />
                  {uploading === k.kind ? <span className="row" style={{ justifyContent: 'center' }}><span className="spinner" /> جارٍ الرفع والتشفير…</span> : <span className="row small" style={{ justifyContent: 'center' }}><Icon.Upload size={18} /> اختر صورة</span>}
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SellEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const { config } = useSession();
  const state = useFetch<any>(id ? `/me/listings/${id}` : null);
  const [attest, setAttest] = useState(false);
  const [token, setToken] = useState<string>();
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submit, submitting] = useAction(async () => {
    setSubmitErr(null);
    await post(`/listings/${id}/submit`, { attest: true, turnstileToken: token });
    state.reload();
  }, { success: 'تم الإرسال للمراجعة', onError: (e) => { setSubmitErr(e.message); return true; } });
  const [withdraw, withdrawing] = useAction(async () => { await post(`/listings/${id}/withdraw`); state.reload(); }, { success: 'تم سحب الإعلان' });

  if (!id) {
    return (
      <div className="container page narrow">
        <PageHeader title="إعلان جديد" back="/sell" sub="ابدأ بالبيانات، ثم تثبت الملكية برمز لمرة واحدة ولقطات شاشة." />
        <div className="wizard-steps" style={{ marginBlockEnd: 16 }} aria-hidden><span className="on" /><span /><span /><span /></div>
        <DetailsForm initial={empty} onSaved={(nid) => nav(`/sell/${nid}`, { replace: true })} />
      </div>
    );
  }

  return (
    <div className="container page narrow">
      <Loadable state={state}>
        {({ listing: l, evidence, history }) => {
          const editable = l.status === 'draft' || l.status === 'needs_evidence';
          const hasReq = ['settings', 'analytics'].every((k) => evidence.some((e: any) => e.kind === k));
          const initial: Form = {
            platform: l.platform, handle: l.handle, title: l.title, description: l.description, followers: String(l.followers), engagementRate: String(l.engagement_rate),
            category: l.category, country: l.country, language: l.language, accountCreatedYear: String(l.account_created_year), accountCreatedMonth: String(l.account_created_month),
            price: String(l.price_cents / 100), codeMethod: l.code_method,
          };
          const stepOn = [true, true, hasReq, l.status !== 'draft'];
          return (
            <div className="stack">
              <PageHeader back="/sell" title={<span className="row" style={{ gap: 10 }}><PlatformBadge platform={l.platform} small /><span className="ltr">@{l.handle}</span></span>} sub={l.title}
                actions={<span className={`badge ${STATUS_TONE[l.status]}`}>{LISTING_STATUS_LABELS[l.status]}</span>} />
              <div className="wizard-steps" aria-hidden>{stepOn.map((on, i) => <span key={i} className={on ? 'on' : ''} />)}</div>

              {l.status === 'needs_evidence' && <Alert kind="warn" title="طلب المراجع أدلة إضافية">{l.review_note}</Alert>}
              {l.status === 'rejected' && <Alert kind="danger" title="تم رفض الإعلان">{l.review_note}</Alert>}
              {l.status === 'pending_review' && <Alert kind="info" title="الإعلان قيد المراجعة">يراجع فريقنا الرمز واللقطات يدويًا. ستصلك إشعارات عند القرار. لا تُزل رمز التحقق حتى يُعتمد الإعلان.</Alert>}
              {l.status === 'approved' && <Alert kind="vault" title="إعلانك منشور">يمكنك الآن إزالة رمز التحقق من الحساب. <Link to={`/listings/${l.id}`}>عرض الإعلان العام</Link></Alert>}

              {editable && <DetailsForm initial={initial} listingId={l.id} onSaved={() => state.reload()} />}

              <div className="card pad-lg stack">
                <h2 style={{ fontSize: '1.15rem', margin: 0 }}>2. رمز التحقق لمرة واحدة</h2>
                <p className="small" style={{ margin: 0 }}>ضع الرمز التالي في <strong>{CODE_METHOD_LABELS[l.code_method as keyof typeof CODE_METHOD_LABELS]}</strong> لحساب <span className="ltr">@{l.handle}</span> على {PLATFORM_LABELS[l.platform as Platform]}، واتركه حتى يُعتمد الإعلان.</p>
                <div className="code-display" aria-label="رمز التحقق">{l.verification_code}</div>
                <p className="xs muted" style={{ margin: 0 }}>الرمز مرتبط بهذا الحساب وهذا الإعلان فقط. تغيير المنصة أو المعرّف يولّد رمزًا جديدًا.</p>
              </div>

              <EvidencePanel listingId={l.id} evidence={evidence} onChange={state.reload} locked={!editable} />

              {editable && (
                <div className="card pad-lg stack">
                  <h2 style={{ fontSize: '1.15rem', margin: 0 }}>4. الإرسال للمراجعة</h2>
                  {!hasReq && <Alert kind="warn">ارفع لقطة الإعدادات ولقطة الإحصاءات أولًا.</Alert>}
                  {submitErr && <Alert kind="danger">{submitErr}</Alert>}
                  <label className="check">
                    <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} />
                    <span>أقرّ بأنني المالك الشرعي لهذا الحساب، وأنه لم يُحصل عليه بطريقة احتيالية أو مسروقة، وأن البيانات والأرقام صحيحة، وأفهم أن تقديم معلومات مضللة يؤدي لإيقاف حسابي.</span>
                  </label>
                  <Turnstile siteKey={config?.turnstileSiteKey ?? null} action="listing_submit" onToken={setToken} />
                  <div className="row end"><Button disabled={!attest || !hasReq} loading={submitting} onClick={() => submit()}>إرسال للمراجعة</Button></div>
                </div>
              )}

              {history.length > 0 && (
                <div className="card stack-sm">
                  <h3>سجل المراجعة</h3>
                  <ul className="timeline">
                    {history.map((h: any, i: number) => (
                      <li key={i}><div><strong className="small">{({ submit: 'إرسال', approve: 'اعتماد', reject: 'رفض', request_evidence: 'طلب أدلة' } as Record<string, string>)[h.action] ?? h.action}</strong> <span className="xs muted">{dateTime(h.created_at)}</span>{h.note && <div className="small">{h.note}</div>}</div></li>
                    ))}
                  </ul>
                </div>
              )}

              {['draft', 'pending_review', 'needs_evidence', 'approved'].includes(l.status) && (
                <div className="row end"><Button variant="danger-outline" loading={withdrawing} onClick={() => confirm('سحب الإعلان؟ لن يظهر للمشترين.') && withdraw()}>سحب الإعلان</Button></div>
              )}
              <p className="xs muted">أُنشئ {date(l.created_at)}</p>
            </div>
          );
        }}
      </Loadable>
    </div>
  );
}
