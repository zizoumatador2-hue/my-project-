import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DISPUTE_REASONS, ESCROW_LABELS, TRANSFER_STEPS, type EscrowState, type Platform, type StepDef } from '../../../shared/domain';
import { ApiError, post } from '../lib/api';
import { countdown, dateTime, money } from '../lib/format';
import { useSession } from '../lib/session';
import { ChatThread } from '../ui/ChatThread';
import { Icon, PlatformBadge } from '../ui/icons';
import { Alert, Button, EscrowBadge, EscrowVault, Field, Loadable, Modal, TrustSeal, Turnstile, useAction, useFetch, useToast } from '../ui/kit';

const ROLE_LABEL = { seller: 'البائع', buyer: 'المشتري', admin: 'فريق العمليات' } as const;
const STEP_STATUS: Record<string, string> = { locked: 'مقفلة', active: 'قيد التنفيذ', awaiting_confirmation: 'بانتظار التأكيد', done: 'مكتملة' };
const LOG_ACTIONS: Record<string, string> = { perform: 'نفّذ الخطوة', confirm: 'أكّد الخطوة', reject: 'رفض التأكيد', provide_secret: 'أرسل بيانات آمنة', reveal_secret: 'كشف البيانات الآمنة' };

function useTick(ms = 30000) {
  const [, set] = useState(0);
  useEffect(() => { const t = setInterval(() => set((x) => x + 1), ms); return () => clearInterval(t); }, [ms]);
}

function SecretReveal({ dealId, secret, onDone }: { dealId: string; secret: any; onDone: () => void }) {
  const [value, setValue] = useState<string | null>(null);
  const toast = useToast();
  const [reveal, busy] = useAction(async () => {
    const r = await post<{ value: string }>(`/deals/${dealId}/secrets/${secret.id}/reveal`);
    setValue(r.value);
  });
  if (value !== null) {
    return (
      <div className="secret-box stack-sm enter">
        <strong className="small">احفظها الآن — لن تظهر مرة أخرى</strong>
        <div className="secret-value">{value}</div>
        <div className="row">
          <Button size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(value).then(() => toast('success', 'نُسخت'), () => toast('error', 'تعذّر النسخ'))}>نسخ</Button>
          <Button size="sm" variant="ghost" onClick={() => { setValue(null); onDone(); }}>أخفِ وتابع</Button>
        </div>
      </div>
    );
  }
  if (secret.revealed_at) return <div className="xs muted row" style={{ gap: 6 }}><Icon.Eye size={14} /> كُشفت {dateTime(secret.revealed_at)} ثم حُذفت نهائيًا من خوادمنا.</div>;
  if (secret.destroyed_at || secret.expires_at < Date.now()) return <Alert kind="warn">انتهت صلاحية البيانات الآمنة. اطلب من الطرف الآخر إرسالها من جديد.</Alert>;
  return (
    <div className="secret-box stack-sm">
      <div className="row small" style={{ gap: 6 }}><Icon.Lock size={16} /> بيانات مشفّرة بانتظارك — تنتهي خلال {countdown(secret.expires_at)}</div>
      <Button size="sm" variant="dark" loading={busy} onClick={() => confirm('ستُعرض البيانات مرة واحدة فقط ثم تُحذف. هل أنت مستعد لحفظها؟') && reveal()}><Icon.Eye size={16} /> كشف لمرة واحدة</Button>
    </div>
  );
}

function StepCard({ def, step, deal, role, secrets, reload, canVerify }: { def: StepDef; step: any; deal: any; role: string; secrets: any[]; reload: () => void; canVerify: boolean }) {
  const [note, setNote] = useState('');
  const [secretVal, setSecretVal] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const transferOpen = ['held', 'transfer_in_progress'].includes(deal.escrow_state);
  const mySecret = secrets.filter((s) => s.step_key === def.key).pop();
  const iPerform = role === def.performer || (def.performer === 'admin' && canVerify);
  const iConfirm = def.confirmer && role === def.confirmer;
  const iProvide = def.secret?.from === 'buyer' && role === 'buyer';

  const [perform, performing] = useAction(async () => {
    await post(`/deals/${deal.id}/steps/${def.no}/perform`, { note: note || undefined, secret: def.secret?.from === 'seller' ? secretVal : undefined });
    setNote(''); setSecretVal(''); reload();
  }, { success: 'تم تسجيل تنفيذ الخطوة' });
  const [confirmStep, confirming] = useAction(async () => { await post(`/deals/${deal.id}/steps/${def.no}/confirm`); reload(); }, { success: 'تم التأكيد' });
  const [reject, rejectingBusy] = useAction(async () => { await post(`/deals/${deal.id}/steps/${def.no}/reject`, { note }); setNote(''); setRejecting(false); reload(); }, { success: 'أُعيدت الخطوة للطرف الآخر' });
  const [provide, providing] = useAction(async () => { await post(`/deals/${deal.id}/steps/${def.no}/secret`, { value: secretVal }); setSecretVal(''); reload(); }, { success: 'أُرسلت البيانات مشفّرة للبائع' });

  const secretForMe = mySecret && mySecret.recipient_id === (role === 'buyer' ? deal.buyer_id : deal.seller_id) ? mySecret : null;
  const status = step.status as string;

  return (
    <li className={`step ${status}`}>
      <span className="n num" aria-hidden>{status === 'done' ? <Icon.Check size={18} /> : def.no}</span>
      <div className="body">
        <div className="row between">
          <h4>{def.title}</h4>
          <span className={`badge ${status === 'done' ? 'vault' : status === 'locked' ? '' : 'seal'}`}>{STEP_STATUS[status]}</span>
        </div>
        <div className="xs muted">المسؤول: {ROLE_LABEL[def.performer]}{def.confirmer ? ` · يؤكد: ${ROLE_LABEL[def.confirmer]}` : ''}</div>
        {status !== 'locked' && status !== 'done' && transferOpen && (
          <div className="actions enter">
            {status === 'active' && iPerform && <p className="small" style={{ margin: 0 }}>{def.performerHint}</p>}
            {status === 'awaiting_confirmation' && iConfirm && <p className="small" style={{ margin: 0 }}>{def.confirmerHint}</p>}
            {step.note && status === 'active' && <Alert kind="warn" title="ملاحظة من الطرف الآخر">{step.note}</Alert>}

            {/* Buyer provides recovery email/phone through the secure channel */}
            {status === 'active' && iProvide && (
              mySecret && !mySecret.destroyed_at && !mySecret.revealed_at ? (
                <div className="xs muted row" style={{ gap: 6 }}><Icon.Lock size={14} /> أُرسلت {def.secret!.label} مشفّرة — بانتظار كشف البائع لها.</div>
              ) : mySecret?.revealed_at ? (
                <div className="xs muted row" style={{ gap: 6 }}><Icon.Check size={14} /> كشف البائع البيانات {dateTime(mySecret.revealed_at)} — بانتظار تنفيذه للتغيير.</div>
              ) : (
                <div className="stack-sm">
                  <Field label={def.secret!.label} htmlFor={`s${def.no}`} hint="تُرسل مشفّرة، يكشفها البائع مرة واحدة، ثم تُحذف. لا تكتبها في المحادثة.">
                    <input id={`s${def.no}`} className="input ltr-input" type={def.no === 2 ? 'email' : 'tel'} inputMode={def.no === 2 ? 'email' : 'tel'} value={secretVal} onChange={(e) => setSecretVal(e.target.value)} />
                  </Field>
                  <Button size="sm" loading={providing} disabled={!secretVal.trim()} onClick={() => provide()}><Icon.Lock size={16} /> إرسال آمن للبائع</Button>
                </div>
              )
            )}

            {/* Seller reveals buyer-provided data before performing */}
            {status === 'active' && role === 'seller' && def.secret?.from === 'buyer' && (
              secretForMe ? <SecretReveal dealId={deal.id} secret={secretForMe} onDone={reload} /> : <div className="xs muted">بانتظار أن يرسل المشتري {def.secret.label} عبر القناة الآمنة.</div>
            )}

            {status === 'active' && iPerform && (def.secret?.from !== 'buyer' || secretForMe?.revealed_at) && (
              <div className="stack-sm">
                {def.secret?.from === 'seller' && (
                  <Field label={def.secret.label} htmlFor={`pw${def.no}`} hint="تُشفَّر فورًا ويكشفها المشتري مرة واحدة. استخدم كلمة جديدة لم تُستخدم من قبل.">
                    <div className="input-affix">
                      <input id={`pw${def.no}`} className="input ltr-input" type={showPw ? 'text' : 'password'} autoComplete="new-password" value={secretVal} onChange={(e) => setSecretVal(e.target.value)} />
                      <button type="button" className="affix" style={{ pointerEvents: 'auto', background: 'none', border: 0, cursor: 'pointer' }} onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'إخفاء' : 'إظهار'}><Icon.Eye size={18} /></button>
                    </div>
                  </Field>
                )}
                <Field label="ملاحظة (اختياري)" htmlFor={`n${def.no}`}>
                  <input id={`n${def.no}`} className="input" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
                </Field>
                <Button size="sm" loading={performing} disabled={def.secret?.from === 'seller' && secretVal.length < 6} onClick={() => perform()}>
                  <Icon.Check size={16} /> {def.performer === 'admin' ? 'اعتماد اكتمال النقل' : 'أكّدت التنفيذ'}
                </Button>
              </div>
            )}
            {status === 'active' && !iPerform && !iProvide && !(role === 'seller' && def.secret?.from === 'buyer') && (
              <div className="xs muted row" style={{ gap: 6 }}><Icon.Clock size={14} /> بانتظار {ROLE_LABEL[def.performer]}.</div>
            )}

            {status === 'awaiting_confirmation' && iConfirm && (
              <div className="stack-sm">
                {def.secret?.from === 'seller' && (secretForMe ? <SecretReveal dealId={deal.id} secret={secretForMe} onDone={reload} /> : <Alert kind="warn">لا توجد بيانات صالحة. اطلب إعادة الإرسال.</Alert>)}
                {rejecting ? (
                  <div className="stack-sm">
                    <Field label="ما المشكلة؟" htmlFor={`r${def.no}`}><textarea id={`r${def.no}`} className="textarea" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
                    <div className="row"><Button size="sm" variant="danger" loading={rejectingBusy} disabled={note.trim().length < 5} onClick={() => reject()}>إعادة الخطوة للبائع</Button><Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>إلغاء</Button></div>
                  </div>
                ) : (
                  <div className="row">
                    <Button size="sm" loading={confirming} disabled={def.secret?.from === 'seller' && !secretForMe?.revealed_at} onClick={() => confirmStep()}><Icon.Check size={16} /> أؤكد</Button>
                    <Button size="sm" variant="secondary" onClick={() => setRejecting(true)}>لم يتم بشكل صحيح</Button>
                  </div>
                )}
              </div>
            )}
            {status === 'awaiting_confirmation' && !iConfirm && <div className="xs muted row" style={{ gap: 6 }}><Icon.Clock size={14} /> بانتظار تأكيد {ROLE_LABEL[def.confirmer!]}.</div>}
          </div>
        )}
        {(step.performed_at || step.confirmed_at) && (
          <div className="log num">
            {step.performed_at && <>نُفّذت {dateTime(step.performed_at)}</>}
            {step.confirmed_at && <> · أُكّدت {dateTime(step.confirmed_at)}</>}
          </div>
        )}
      </div>
    </li>
  );
}

export default function DealRoom() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { config, can } = useSession();
  const state = useFetch<any>(`/deals/${id}`);
  useTick();
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [dForm, setDForm] = useState({ reason: 'not_as_described', description: '' });
  const [cancelReason, setCancelReason] = useState('');
  const [token, setToken] = useState<string>();
  const [dErr, setDErr] = useState<string | null>(null);
  const paidReturn = params.get('paid') === '1';

  // Both parties act concurrently: refresh quietly while visible so the other side's steps appear without reload.
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && !document.querySelector('.modal') && state.reload(), 10000);
    return () => clearInterval(t);
  }, [state.reload]);

  // After returning from checkout the webhook may lag (slow networks, provider retries): poll until held.
  useEffect(() => {
    if (!paidReturn || state.data?.deal?.escrow_state !== 'pending_payment') return;
    const t = setTimeout(state.reload, 3000);
    return () => clearTimeout(t);
  }, [paidReturn, state.data, state.reload]);

  const [pay, paying] = useAction(async () => {
    const r = await post<{ checkoutUrl: string }>(`/deals/${id}/checkout`);
    if (/^https?:\/\//.test(r.checkoutUrl)) window.location.assign(r.checkoutUrl); else nav(r.checkoutUrl);
  });
  const [release, releasing] = useAction(async () => { await post(`/deals/${id}/confirm-release`, { satisfied: true }); setReleaseOpen(false); state.reload(); }, { success: 'تم تأكيد الاستلام وتحرير المبلغ' });
  const [cancel, cancelling] = useAction(async () => { await post(`/deals/${id}/cancel`, { reason: cancelReason || 'إلغاء من المستخدم' }); setCancelOpen(false); state.reload(); }, { success: 'تم الإلغاء' });
  const [openDispute, disputing] = useAction(async () => {
    setDErr(null);
    const r = await post<{ disputeId: string }>(`/deals/${id}/disputes`, { ...dForm, turnstileToken: token });
    nav(`/disputes/${r.disputeId}`);
  }, { onError: (e: ApiError) => { setDErr(Object.values(e.fields)[0] ?? e.message); return true; } });

  return (
    <div className="container page">
      <Loadable state={state}>
        {(v) => {
          const { deal, listing, steps, secrets, role, dispute, conversationId, buyer, seller, events, stepLog, reclaimOpenUntil } = v;
          const s: EscrowState = deal.escrow_state;
          const counterpart = role === 'buyer' ? seller : buyer;
          const disputable = ['held', 'transfer_in_progress', 'buyer_confirmation_window'].includes(s) || (s === 'released' && role === 'buyer' && reclaimOpenUntil > Date.now());
          const activeStep = steps.find((x: any) => x.status === 'active' || x.status === 'awaiting_confirmation');
          const log = [
            ...events.map((e: any) => ({ t: e.created_at, text: e.reason || ESCROW_LABELS[e.to_state as EscrowState] })),
            ...stepLog.map((e: any) => ({ t: e.created_at, text: `الخطوة ${e.step_no}: ${LOG_ACTIONS[e.action] ?? e.action}${e.actor_id === deal.buyer_id ? ' (المشتري)' : e.actor_id === deal.seller_id ? ' (البائع)' : ' (العمليات)'}` })),
          ].sort((a, b) => b.t - a.t);

          return (
            <div className="split">
              <div className="stack">
                <div className="row" style={{ gap: 12 }}>
                  <Link to="/deals" className="icon-btn" aria-label="رجوع"><Icon.ChevronBack /></Link>
                  <PlatformBadge platform={listing.platform as Platform} />
                  <div className="grow">
                    <h1 style={{ fontSize: '1.3rem', margin: 0 }} className="ltr">@{listing.handle}</h1>
                    <div className="small muted">{listing.title}</div>
                  </div>
                  <EscrowBadge state={s} />
                </div>

                <div className="escrow-banner">
                  <div className="lock"><Icon.Lock size={24} /></div>
                  <div className="grow">
                    <div className="state">{ESCROW_LABELS[s]}</div>
                    <div className="amount num">{money(deal.price_cents, true)}</div>
                    {role === 'seller' && <div className="xs" style={{ opacity: 0.8 }}>صافيك بعد العمولة: <span className="num">{money(deal.seller_net_cents, true)}</span></div>}
                  </div>
                </div>
                <div className="card"><EscrowVault state={s} prev={deal.prev_state} /></div>

                {s === 'pending_payment' && (role === 'buyer' ? (
                  <div className="card stack">
                    {paidReturn ? <Alert kind="info" title="جارٍ تأكيد الدفع">نتلقى التأكيد من بوابة الدفع. قد يستغرق ذلك بضع ثوانٍ؛ تتحدث الصفحة تلقائيًا.</Alert>
                      : params.get('cancelled') ? <Alert kind="warn">لم يكتمل الدفع. يمكنك المحاولة مجددًا قبل انتهاء مهلة الحجز.</Alert> : null}
                    <p className="small" style={{ margin: 0 }}>الإعلان محجوز لك حتى {dateTime(deal.payment_expires_at)}. بعد ذلك يُلغى الحجز تلقائيًا.</p>
                    <div className="row"><Button loading={paying} onClick={() => pay()}>إكمال الدفع</Button><Button variant="ghost" onClick={() => setCancelOpen(true)}>إلغاء الطلب</Button></div>
                  </div>
                ) : <Alert kind="info">بانتظار دفع المشتري. لا تبدأ أي خطوة قبل أن تظهر حالة «محتجز».</Alert>)}

                {s === 'buyer_confirmation_window' && (
                  <div className="card stack">
                    <div className="row between"><strong>مهلة تأكيد المشتري</strong><span className="badge seal num"><Icon.Clock size={14} /> تبقّى {countdown(deal.confirm_deadline)}</span></div>
                    {role === 'buyer' ? (
                      <>
                        <p className="small" style={{ margin: 0 }}>اكتمل النقل واعتمده فريق العمليات. تأكد أنك تتحكم بالحساب بالكامل ثم أكّد. إن لم تؤكد أو تفتح نزاعًا قبل انتهاء المهلة يُحرَّر المبلغ تلقائيًا.</p>
                        <div className="row"><Button onClick={() => setReleaseOpen(true)}><Icon.Check size={18} /> استلمت الحساب — حرّر المبلغ</Button><Button variant="danger-outline" onClick={() => setDisputeOpen(true)}>هناك مشكلة</Button></div>
                      </>
                    ) : <p className="small muted" style={{ margin: 0 }}>بانتظار تأكيد المشتري أو انتهاء المهلة.</p>}
                  </div>
                )}

                {s === 'released' && (
                  <Alert kind="vault" title="اكتملت الصفقة">
                    {role === 'seller' ? <>أُضيف صافي المبلغ إلى <Link to="/wallet">محفظتك</Link> كرصيد معلّق حتى {dateTime(reclaimOpenUntil)} (فترة حماية الاسترداد).</>
                      : <>إن استعاد البائع الحساب بطريقة ما، يمكنك فتح نزاع استرداد حتى {dateTime(reclaimOpenUntil)} بينما عائده مجمّد.</>}
                  </Alert>
                )}
                {s === 'disputed' && dispute && <Alert kind="danger" title="نزاع مفتوح — الضمان مجمّد">لا تحرير ولا رد حتى يفصل المحكّم. <Link to={`/disputes/${dispute.id}`}>افتح ملف النزاع</Link> لإضافة الإفادات والأدلة.</Alert>}
                {s === 'refunded' && <Alert kind="info" title="تم رد المبلغ للمشتري">يصل المبلغ إلى وسيلة الدفع الأصلية خلال 5–10 أيام عمل حسب البنك.</Alert>}
                {s === 'split' && <Alert kind="info" title="تسوية بالتقسيم">فُصل النزاع بتقسيم المبلغ. {dispute && <Link to={`/disputes/${dispute.id}`}>تفاصيل القرار</Link>}</Alert>}
                {s === 'cancelled' && <Alert kind="info">أُلغيت الصفقة قبل الدفع.</Alert>}

                {steps.length > 0 && (
                  <div className="card pad-lg">
                    <div className="card-title"><h2 style={{ fontSize: '1.15rem' }}>خطوات نقل الملكية</h2><span className="small muted num">{steps.filter((x: any) => x.status === 'done').length} / {steps.length}</span></div>
                    {activeStep && ['held', 'transfer_in_progress'].includes(s) && <div className="xs muted" style={{ marginBlockEnd: 12 }}>كل خطوة مؤرّخة ومسجّلة، ويُحتج بها عند أي نزاع.</div>}
                    <ol className="steps">
                      {TRANSFER_STEPS.map((def) => {
                        const st = steps.find((x: any) => x.step_no === def.no);
                        return st ? <StepCard key={def.no} def={def} step={st} deal={deal} role={role} secrets={secrets} reload={state.reload} canVerify={can('deals.transfer_verify') && role === 'admin'} /> : null;
                      })}
                    </ol>
                  </div>
                )}

                <div className="row">
                  {disputable && role !== 'admin' && s !== 'buyer_confirmation_window' && <Button variant="danger-outline" onClick={() => setDisputeOpen(true)}><Icon.Flag size={16} /> فتح نزاع</Button>}
                  {role === 'seller' && ['held', 'transfer_in_progress'].includes(s) && <Button variant="ghost" onClick={() => setCancelOpen(true)}>الانسحاب ورد المبلغ</Button>}
                </div>
              </div>

              <aside className="stack sticky">
                {role !== 'admin' && (
                  <Link to={`/u/${counterpart.id}`} className="card row" style={{ color: 'var(--text)', gap: 12 }}>
                    <TrustSeal score={role === 'buyer' ? counterpart.trust_seller : counterpart.trust_buyer} size="sm" />
                    <div className="grow"><div className="xs muted">{role === 'buyer' ? 'البائع' : 'المشتري'}</div><strong>{counterpart.display_name}</strong></div>
                    <Icon.ChevronForward size={18} />
                  </Link>
                )}
                {conversationId && <ChatThread conversationId={conversationId} handle={listing.handle} readOnly={role === 'admin'} adminView={role === 'admin'} />}
                <details className="card">
                  <summary style={{ cursor: 'pointer', fontWeight: 600 }}>سجل الصفقة ({log.length})</summary>
                  <ul className="timeline" style={{ marginBlockStart: 12 }}>
                    {log.map((e, i) => <li key={i}><div><div className="small">{e.text}</div><div className="xs muted num">{dateTime(e.t)}</div></div></li>)}
                  </ul>
                </details>
              </aside>

              <Modal open={releaseOpen} onClose={() => setReleaseOpen(false)} title="تأكيد الاستلام"
                footer={<><Button variant="ghost" onClick={() => setReleaseOpen(false)}>ليس بعد</Button><Button loading={releasing} onClick={() => release()}>أؤكد وأحرر المبلغ</Button></>}>
                <p>بتأكيدك يُحرَّر المبلغ للبائع. تأكد أولًا من:</p>
                <ul className="small stack-sm" style={{ margin: 0, paddingInlineStart: 20 }}>
                  <li>أن بريد الاسترداد ورقم الهاتف أصبحا باسمك.</li>
                  <li>أنك غيّرت كلمة المرور وفعّلت المصادقة الثنائية.</li>
                  <li>أن الأجهزة والجلسات القديمة سُجّل خروجها.</li>
                </ul>
                <Alert kind="info">تبقى لديك حماية استرداد لمدة {config?.escrow.reclaim_hold_days ?? 7} أيام بعد التحرير.</Alert>
              </Modal>

              <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title={role === 'seller' ? 'الانسحاب من الصفقة' : 'إلغاء الطلب'}
                footer={<><Button variant="ghost" onClick={() => setCancelOpen(false)}>تراجع</Button><Button variant="danger" loading={cancelling} disabled={cancelReason.trim().length < 3} onClick={() => cancel()}>تأكيد</Button></>}>
                {role === 'seller' && <Alert kind="warn">سيُرد كامل المبلغ للمشتري، ويُحتسب الانسحاب في مؤشر ثقتك كبائع.</Alert>}
                <Field label="السبب" htmlFor="creason"><textarea id="creason" className="textarea" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} /></Field>
              </Modal>

              <Modal open={disputeOpen} onClose={() => setDisputeOpen(false)} title="فتح نزاع"
                footer={<><Button variant="ghost" onClick={() => setDisputeOpen(false)}>إلغاء</Button><Button variant="danger" loading={disputing} disabled={dForm.description.trim().length < 20} onClick={() => openDispute()}>فتح النزاع وتجميد الضمان</Button></>}>
                <Alert kind="warn">يتجمّد الضمان فورًا: لا تحرير ولا رد حتى يفصل محكّم بشري بعد مراجعة المحادثة وسجل الخطوات والأدلة.</Alert>
                {dErr && <Alert kind="danger">{dErr}</Alert>}
                <Field label="السبب" htmlFor="dreason">
                  <select id="dreason" className="select" value={dForm.reason} onChange={(e) => setDForm((f) => ({ ...f, reason: e.target.value }))}>
                    {Object.entries(DISPUTE_REASONS).filter(([k]) => s === 'released' ? ['reclaimed', 'access_lost', 'other'].includes(k) : k !== 'reclaimed').map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </Field>
                <Field label="اشرح ما حدث" htmlFor="ddesc" hint="الوقائع والتوقيتات. يمكنك إضافة لقطات بعد فتح النزاع.">
                  <textarea id="ddesc" className="textarea" value={dForm.description} onChange={(e) => setDForm((f) => ({ ...f, description: e.target.value }))} />
                </Field>
                <Turnstile siteKey={config?.turnstileSiteKey ?? null} action="dispute" onToken={setToken} />
              </Modal>
            </div>
          );
        }}
      </Loadable>
    </div>
  );
}
