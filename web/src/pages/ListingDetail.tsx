import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CATEGORY_LABELS, COUNTRIES, LANGUAGES, LISTING_STATUS_LABELS, PLATFORM_LABELS } from '../../../shared/domain';
import { post } from '../lib/api';
import { accountAge, date, int, money, pct } from '../lib/format';
import { useSession } from '../lib/session';
import { Icon, PlatformBadge } from '../ui/icons';
import { Alert, Button, Loadable, Modal, TrustSeal, Turnstile, useAction, useFetch } from '../ui/kit';

export default function ListingDetail() {
  const { id } = useParams();
  const state = useFetch<any>(`/listings/${id}`);
  const { user, config } = useSession();
  const nav = useNavigate();
  const [buyOpen, setBuyOpen] = useState(false);
  const [accept, setAccept] = useState(false);
  const [token, setToken] = useState<string>();
  const [chatToken, setChatToken] = useState<string>();

  const [buy, buying] = useAction(async () => {
    const r = await post<{ dealId: string; checkoutUrl: string }>(`/listings/${id}/buy`, { acceptDisclaimer: true, turnstileToken: token });
    if (/^https?:\/\//.test(r.checkoutUrl)) window.location.assign(r.checkoutUrl);
    else nav(r.checkoutUrl);
  });
  const [ask, asking] = useAction(async () => {
    const r = await post<{ id: string }>(`/listings/${id}/conversations`, { turnstileToken: chatToken });
    nav(`/messages/${r.id}`);
  });

  return (
    <div className="container page">
      <Loadable state={state}>
        {({ listing: l, isOwner, myConversation }) => {
          const available = l.status === 'approved';
          return (
            <div className="split">
              <div className="stack">
                <Link to="/listings" className="row small" style={{ gap: 4 }}><Icon.ChevronBack size={16} /> كل الحسابات</Link>
                <div className="card pad-lg stack">
                  <div className="row" style={{ gap: 14 }}>
                    <PlatformBadge platform={l.platform} />
                    <div className="grow">
                      <div className="row" style={{ gap: 8 }}>
                        <strong style={{ fontSize: '1.1rem' }} className="ltr">@{l.handle}</strong>
                        {available ? <span className="badge vault"><Icon.Shield size={14} />ملكية موثّقة</span> : <span className="badge warn">{LISTING_STATUS_LABELS[l.status]}</span>}
                      </div>
                      <div className="small muted">{PLATFORM_LABELS[l.platform as keyof typeof PLATFORM_LABELS]} · منشور {date(l.approved_at)}</div>
                    </div>
                  </div>
                  <h1 style={{ fontSize: 'clamp(1.3rem, 3.5vw, 1.8rem)', margin: 0 }}>{l.title}</h1>
                  <div className="grid cols-4">
                    <div className="stat"><div className="v num">{int(l.followers)}</div><div className="k">متابع</div></div>
                    <div className="stat"><div className="v num">{pct(l.engagement_rate)}</div><div className="k">معدل التفاعل</div></div>
                    <div className="stat"><div className="v">{accountAge(l.account_created_year, l.account_created_month)}</div><div className="k">عمر الحساب</div></div>
                    <div className="stat"><div className="v">{CATEGORY_LABELS[l.category as keyof typeof CATEGORY_LABELS]}</div><div className="k">المجال</div></div>
                  </div>
                  <dl className="kv">
                    <dt>جمهور الحساب</dt><dd>{COUNTRIES[l.country] ?? l.country}</dd>
                    <dt>اللغة الأساسية</dt><dd>{LANGUAGES[l.language] ?? l.language}</dd>
                    <dt>تاريخ الإنشاء</dt><dd className="num">{int(l.account_created_month)}/{l.account_created_year}</dd>
                  </dl>
                  <div>
                    <h2 style={{ fontSize: '1.1rem' }}>وصف البائع</h2>
                    <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{l.description}</p>
                  </div>
                </div>
                <div className="card stack-sm">
                  <h2 style={{ fontSize: '1.1rem' }}>ما الذي تحقق منه فريقنا</h2>
                  <ul className="stack-sm" style={{ margin: 0, paddingInlineStart: 20 }}>
                    <li>وضع البائع رمز تحقق لمرة واحدة على الحساب نفسه، وتأكد منه مراجع بشري.</li>
                    <li>لقطات من إعدادات الحساب تثبت صلاحية المدير، ولقطات الإحصاءات تطابق الأرقام المعلنة (بهامش 10٪).</li>
                    <li>فحوص آلية لرصد المطالبات المكررة، وإعادة استخدام اللقطات، والحسابات الحديثة المريبة.</li>
                  </ul>
                  <p className="xs muted" style={{ margin: 0 }}>لقطات التحقق سرية ولا تُعرض علنًا؛ يطلع عليها فقط المراجع المكلّف بالإعلان.</p>
                </div>
              </div>

              <aside className="stack sticky">
                <div className="card pad-lg stack">
                  <div className="row between">
                    <span className="muted small">السعر الكامل</span>
                    <span className="price num" style={{ fontSize: '1.7rem' }}>{money(l.price_cents)}</span>
                  </div>
                  <div className="panel stack-sm small">
                    <div className="row" style={{ gap: 8 }}><Icon.Lock size={16} /> <span>يُحتجز المبلغ لدى الضمان ولا يُحرَّر قبل تأكيدك.</span></div>
                    <div className="row" style={{ gap: 8 }}><Icon.Clock size={16} /> <span>مهلة تأكيد {int(config?.escrow.confirmation_window_hours ?? 72)} ساعة بعد اكتمال النقل.</span></div>
                    <div className="row" style={{ gap: 8 }}><Icon.Key size={16} /> <span>حماية من استرداد الحساب {int(config?.escrow.reclaim_hold_days ?? 7)} أيام بعد التحرير.</span></div>
                  </div>
                  {isOwner ? (
                    <Link to={`/sell/${l.id}`} className="btn btn-secondary btn-block">إدارة إعلانك</Link>
                  ) : available ? (
                    <>
                      <Button block onClick={() => (user ? setBuyOpen(true) : nav(`/login?next=/listings/${l.id}`))}>اشترِ عبر الضمان</Button>
                      {myConversation ? (
                        <Link to={`/messages/${myConversation}`} className="btn btn-secondary btn-block"><Icon.Chat size={18} /> متابعة المحادثة</Link>
                      ) : (
                        <>
                          {user && <Turnstile siteKey={config?.turnstileSiteKey ?? null} action="chat" onToken={setChatToken} />}
                          <Button variant="secondary" block loading={asking} onClick={() => (user ? ask() : nav(`/login?next=/listings/${l.id}`))}><Icon.Chat size={18} /> اسأل البائع</Button>
                        </>
                      )}
                      <p className="xs muted" style={{ margin: 0 }}>التواصل داخل المنصة فقط. مشاركة أرقام أو روابط أو حسابات خارجية تُحجب تلقائيًا لحمايتك.</p>
                    </>
                  ) : (
                    <Alert kind="info">هذا الحساب {LISTING_STATUS_LABELS[l.status]} حاليًا.</Alert>
                  )}
                </div>
                <Link to={`/u/${l.seller_id}`} className="card row" style={{ color: 'var(--text)', gap: 14 }}>
                  <TrustSeal score={l.seller_trust} label="ثقة البائع" />
                  <div className="grow">
                    <div className="xs muted">البائع</div>
                    <strong>{l.seller_name}</strong>
                    <div className="xs muted">{int(l.seller_completed)} صفقة مكتملة · عضو منذ {date(l.seller_since)}</div>
                  </div>
                  <Icon.ChevronForward size={18} />
                </Link>
              </aside>

              <Modal open={buyOpen} onClose={() => setBuyOpen(false)} title="تأكيد الشراء عبر الضمان"
                footer={<><Button variant="ghost" onClick={() => setBuyOpen(false)}>إلغاء</Button><Button disabled={!accept} loading={buying} onClick={() => buy()}>المتابعة للدفع</Button></>}>
                <div className="escrow-banner">
                  <div className="lock"><Icon.Lock size={24} /></div>
                  <div><div className="state">المبلغ الذي سيُحتجز</div><div className="amount num">{money(l.price_cents, true)}</div></div>
                </div>
                <ol className="small stack-sm" style={{ margin: 0, paddingInlineStart: 20 }}>
                  <li>تدفع عبر بوابة دفع آمنة، ويُحجز الإعلان باسمك لمدة {int(config?.escrow.payment_timeout_minutes ?? 60)} دقيقة.</li>
                  <li>يبدأ البائع خطوات النقل، وتؤكد أنت كل خطوة تخصك.</li>
                  <li>لا يُحرَّر المبلغ إلا بعد تأكيدك أو انقضاء المهلة دون نزاع.</li>
                </ol>
                <label className="check">
                  <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
                  <span>أفهم أن نقل ملكية الحسابات قد يخالف شروط المنصة الأصلية وأن المنصة قد توقف الحساب أو تستعيده، وأن TrustTransfer وسيط ضمان لا يضمن موقف تلك المنصات. <Link to="/policies/disclaimer" target="_blank">إخلاء المسؤولية</Link>.</span>
                </label>
                <Turnstile siteKey={config?.turnstileSiteKey ?? null} action="buy" onToken={setToken} />
              </Modal>
            </div>
          );
        }}
      </Loadable>
    </div>
  );
}
