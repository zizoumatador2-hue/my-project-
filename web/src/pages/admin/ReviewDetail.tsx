import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CATEGORY_LABELS, CODE_METHOD_LABELS, COUNTRIES, LANGUAGES, LISTING_STATUS_LABELS, PLATFORM_LABELS, type Platform } from '../../../../shared/domain';
import { ApiError, post } from '../../lib/api';
import { accountAge, dateTime, int, money, parseIntSafe, pct } from '../../lib/format';
import { useSession } from '../../lib/session';
import { Icon, PlatformBadge } from '../../ui/icons';
import { Alert, Button, Field, Loadable, TrustSeal, useAction, useFetch } from '../../ui/kit';

const KIND: Record<string, string> = { settings: 'الإعدادات', analytics: 'الإحصاءات', code_proof: 'إثبات الرمز', other: 'أخرى' };
const ACT: Record<string, string> = { submit: 'إرسال', claim: 'حجز للمراجعة', unclaim: 'إلغاء الحجز', approve: 'اعتماد', reject: 'رفض', request_evidence: 'طلب أدلة', auto_check: 'فحص آلي' };

export default function ReviewDetail() {
  const { id } = useParams();
  const s = useFetch<any>(`/admin/listings/${id}`);
  const { user } = useSession();
  const [note, setNote] = useState('');
  const [observed, setObserved] = useState('');
  const [codeOk, setCodeOk] = useState(false);
  const [checks, setChecks] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const checksPending = s.data?.listing?.code_check_status === 'pending';
  useEffect(() => {
    if (!checksPending) return;
    const t = setInterval(s.reload, 2500);
    return () => clearInterval(t);
  }, [checksPending, s.reload]);
  const [claim, claiming] = useAction(async () => { await post(`/admin/listings/${id}/claim`); s.reload(); }, { success: 'تم حجز الإعلان لك — الأدلة متاحة الآن' });
  const [unclaim, unclaiming] = useAction(async () => { await post(`/admin/listings/${id}/unclaim`); s.reload(); });
  const [decide, deciding] = useAction(async (action: string) => {
    setErr(null);
    await post(`/admin/listings/${id}/decision`, { action, note, observedFollowers: parseIntSafe(observed) ?? undefined, codeVerified: codeOk, stepsChecked: checks });
    s.reload();
  }, { success: 'تم تسجيل القرار', onError: (e: ApiError) => { setErr(e.message); s.reload(); return true; } });

  return (
    <Loadable state={s}>
      {({ listing: l, evidence, claimedByMe, history, fraudCases, seller, sellerListings, sameHandle }) => {
        const pending = l.status === 'pending_review' || l.status === 'needs_evidence';
        const openCases = fraudCases.filter((f: any) => f.status === 'open');
        return (
          <div className="stack">
            <Link to="/admin/reviews" className="row small" style={{ gap: 4 }}><Icon.ChevronBack size={16} /> قائمة المراجعة</Link>
            <div className="row" style={{ gap: 12 }}>
              <PlatformBadge platform={l.platform as Platform} />
              <div className="grow"><h1 style={{ fontSize: '1.4rem', margin: 0 }} className="ltr">@{l.handle}</h1><div className="small muted">{l.title}</div></div>
              <span className="badge info">{LISTING_STATUS_LABELS[l.status]}</span>
            </div>

            {pending && (claimedByMe ? (
              <Alert kind="vault" title="أنت المراجع المكلّف">روابط الأدلة صالحة لدقيقتين وكل فتح يُسجّل في التدقيق. <Button size="sm" variant="ghost" loading={unclaiming} onClick={() => unclaim()}>إلغاء الحجز</Button></Alert>
            ) : l.reviewer_id ? (
              <Alert kind="warn">محجوز للمراجع {l.reviewer_name}. الأدلة متاحة له فقط.</Alert>
            ) : (
              <Alert kind="info" title="الأدلة مقفلة">احجز الإعلان لتتمكن من الاطلاع على لقطات التحقق (مبدأ أقل صلاحية). <Button size="sm" loading={claiming} onClick={() => claim()} disabled={l.seller_id === user?.id}>حجز للمراجعة</Button></Alert>
            ))}

            <div className="split">
              <div className="stack">
                <div className="card stack-sm">
                  <h2 style={{ fontSize: '1.1rem' }}>البيانات المعلنة</h2>
                  <dl className="kv">
                    <dt>المنصة</dt><dd>{PLATFORM_LABELS[l.platform as Platform]}</dd>
                    <dt>المتابعون</dt><dd className="num">{int(l.followers)}</dd>
                    <dt>التفاعل</dt><dd className="num">{pct(l.engagement_rate)}</dd>
                    <dt>عمر الحساب</dt><dd>{accountAge(l.account_created_year, l.account_created_month)} ({l.account_created_month}/{l.account_created_year})</dd>
                    <dt>المجال / الجمهور / اللغة</dt><dd>{CATEGORY_LABELS[l.category as keyof typeof CATEGORY_LABELS]} · {COUNTRIES[l.country]} · {LANGUAGES[l.language]}</dd>
                    <dt>السعر</dt><dd className="num">{money(l.price_cents)}</dd>
                  </dl>
                  <p className="small" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{l.description}</p>
                </div>

                <div className="card stack-sm">
                  <h2 style={{ fontSize: '1.1rem' }}>رمز التحقق</h2>
                  <div className="row"><div className="code-display" style={{ fontSize: '1.1rem' }}>{l.verification_code}</div><div className="small">المكان: <strong>{CODE_METHOD_LABELS[l.code_method as keyof typeof CODE_METHOD_LABELS]}</strong><br />الفحص الآلي: <strong>{({ found: 'وُجد', not_found: 'لم يُعثر عليه', unavailable: 'تعذّر الوصول', pending: 'قيد التنفيذ' } as Record<string, string>)[l.code_check_status]}</strong> {l.code_checked_at && <span className="xs muted">{dateTime(l.code_checked_at)}</span>}</div></div>
                  <p className="xs muted" style={{ margin: 0 }}>الفحص الآلي أفضل جهد: كثير من المنصات تحجب الزوار. يجب أن تتحقق بنفسك من ظهور الرمز على الحساب أو في لقطة إثبات الرمز.</p>
                </div>

                <div className="card stack-sm">
                  <h2 style={{ fontSize: '1.1rem' }}>لقطات التحقق ({int(evidence.length)})</h2>
                  <div className="evidence-grid">
                    {evidence.map((e: any) => (
                      <figure key={e.id}>
                        {e.url ? <a href={e.url} target="_blank" rel="noopener noreferrer"><img src={e.url} alt={`لقطة ${KIND[e.kind]}`} loading="lazy" /></a>
                          : <div style={{ aspectRatio: '4/3', display: 'grid', placeItems: 'center', color: 'var(--faint)' }}><Icon.Lock size={28} /></div>}
                        <figcaption><span>{KIND[e.kind]}</span>{e.reused > 0 ? <span className="badge danger">مكررة</span> : <span className="faint num">{int(Math.round(e.size / 1024))}KB</span>}</figcaption>
                      </figure>
                    ))}
                  </div>
                </div>

                {pending && claimedByMe && (
                  <div className="card pad-lg stack">
                    <h2 style={{ fontSize: '1.1rem', margin: 0 }}>القرار</h2>
                    {l.code_check_status === 'pending' && <Alert kind="info" title="الفحوص الآلية قيد التنفيذ">يُفعَّل الاعتماد بعد اكتمالها (عادة خلال ثوانٍ). تتحدث الصفحة تلقائيًا.</Alert>}
                    {openCases.length > 0 && <Alert kind="danger" title="حالة اشتباه مفتوحة">لا يمكن الاعتماد قبل معالجتها في <Link to="/admin/fraud">قائمة الاحتيال</Link>.</Alert>}
                    {err && <Alert kind="danger">{err}</Alert>}
                    <Field label="عدد المتابعين كما يظهر في لقطة الإحصاءات" htmlFor="obs" hint={`المعلن: ${int(l.followers)} — يُرفض الاعتماد آليًا إذا تجاوز الفرق 10٪ ويُفتح اشتباه.`}>
                      <input id="obs" className="input" inputMode="numeric" value={observed} onChange={(e) => setObserved(e.target.value)} />
                    </Field>
                    <label className="check"><input type="checkbox" checked={codeOk} onChange={(e) => setCodeOk(e.target.checked)} /><span>تحققت بنفسي من ظهور الرمز <span className="ltr">{l.verification_code}</span> على الحساب.</span></label>
                    <label className="check"><input type="checkbox" checked={checks} onChange={(e) => setChecks(e.target.checked)} /><span>لقطة الإعدادات تُظهر صلاحية المالك، ولقطة الإحصاءات متسقة مع التفاعل والجمهور المعلن، ولا مؤشرات تلاعب بالصور.</span></label>
                    <Field label="ملاحظة للبائع (تظهر له)" htmlFor="rnote"><textarea id="rnote" className="textarea" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
                    <div className="row">
                      <Button loading={deciding} disabled={note.trim().length < 5 || l.code_check_status === 'pending'} onClick={() => decide('approve')}><Icon.Check size={16} /> اعتماد ونشر</Button>
                      <Button variant="secondary" disabled={note.trim().length < 5 || deciding} onClick={() => decide('request_evidence')}>طلب أدلة إضافية</Button>
                      <Button variant="danger-outline" disabled={note.trim().length < 5 || deciding} onClick={() => decide('reject')}>رفض</Button>
                    </div>
                  </div>
                )}
              </div>

              <aside className="stack sticky">
                <div className="card stack-sm">
                  <h3>المؤشرات الآلية</h3>
                  <div className="row"><span className={`badge ${l.fraud_score >= 50 ? 'danger' : l.fraud_score >= 25 ? 'warn' : 'vault'}`}>درجة المخاطر <span className="num">{int(l.fraud_score)}</span></span></div>
                  {l.fraud_flags.length === 0 ? <p className="small muted" style={{ margin: 0 }}>لا مؤشرات. (المراجعة البشرية تبقى إلزامية.)</p> : (
                    <ul className="small stack-sm" style={{ margin: 0, paddingInlineStart: 18 }}>{l.fraud_flags.map((f: any) => <li key={f.code}><span className={`badge ${f.severity === 'high' ? 'danger' : f.severity === 'medium' ? 'warn' : ''}`}>{f.severity}</span> {f.detail}</li>)}</ul>
                  )}
                  {fraudCases.length > 0 && <Link className="small" to="/admin/fraud?status=all">حالات الاشتباه ({fraudCases.length})</Link>}
                </div>
                <div className="card stack-sm">
                  <h3>البائع</h3>
                  <div className="row" style={{ gap: 10 }}><TrustSeal score={seller.trust_seller} size="sm" /><div><strong>{seller.display_name}</strong><div className="xs muted ltr">{seller.email}</div></div></div>
                  <div className="xs muted">مسجّل {dateTime(seller.created_at)} · مخالفات محادثة: {int(seller.chat_violations)}</div>
                  <Link to={`/admin/users/${seller.id}`} className="small">الملف الكامل</Link>
                  {sellerListings.length > 0 && <div className="xs">إعلانات أخرى: {sellerListings.map((x: any) => LISTING_STATUS_LABELS[x.status]).join('، ')}</div>}
                </div>
                {sameHandle.length > 0 && (
                  <div className="card stack-sm">
                    <h3 style={{ color: 'var(--danger)' }}>نفس الحساب في إعلانات أخرى</h3>
                    {sameHandle.map((x: any) => <div key={x.id} className="small">{x.seller_name} — {LISTING_STATUS_LABELS[x.status]} · {dateTime(x.created_at)}</div>)}
                  </div>
                )}
                <div className="card stack-sm">
                  <h3>سجل التحقق</h3>
                  <ul className="timeline">{history.map((h: any, i: number) => <li key={i}><div><strong className="small">{ACT[h.action] ?? h.action}</strong> <span className="xs muted">{h.actor ?? 'النظام'} · {dateTime(h.created_at)}</span>{h.note && <div className="xs">{h.note}</div>}</div></li>)}</ul>
                </div>
              </aside>
            </div>
          </div>
        );
      }}
    </Loadable>
  );
}
