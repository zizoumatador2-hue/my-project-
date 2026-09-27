import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DISPUTE_REASONS, ESCROW_LABELS, TRANSFER_STEPS, type EscrowState, type Platform } from '../../../../shared/domain';
import { ApiError, post } from '../../lib/api';
import { dateTime, int, money, parseMoney } from '../../lib/format';
import { useSession } from '../../lib/session';
import { Icon, PlatformBadge } from '../../ui/icons';
import { Alert, Button, EscrowBadge, EscrowVault, Field, Loadable, TrustSeal, useAction, useFetch } from '../../ui/kit';
import { EventList } from '../Dispute';
import { Transcript } from './DealDetail';

const ACTIONS = { refund: 'رد كامل المبلغ للمشتري', release: 'تحرير المبلغ للبائع', split: 'تقسيم المبلغ', resume: 'رفض النزاع واستئناف الصفقة' } as const;

export default function DisputeDetail() {
  const { id } = useParams();
  const s = useFetch<any>(`/admin/disputes/${id}`);
  const { user } = useSession();
  const [tab, setTab] = useState<'case' | 'chat' | 'transfer' | 'listing'>('case');
  const [action, setAction] = useState<keyof typeof ACTIONS>('refund');
  const [split, setSplit] = useState('');
  const [note, setNote] = useState('');
  const [req, setReq] = useState({ body: '', from: 'both' });
  const [err, setErr] = useState<string | null>(null);
  const [assign, assigning] = useAction(async () => { await post(`/admin/disputes/${id}/assign`); s.reload(); }, { success: 'تولّيت النزاع' });
  const [addNote, noting] = useAction(async () => { await post(`/admin/disputes/${id}/note`, { body: note }); setNote(''); s.reload(); }, { success: 'أُضيفت ملاحظة داخلية' });
  const [request, requesting] = useAction(async () => { await post(`/admin/disputes/${id}/request-evidence`, req); setReq({ body: '', from: 'both' }); s.reload(); }, { success: 'أُرسل طلب الأدلة' });
  const [resolve, resolving] = useAction(async () => {
    setErr(null);
    await post(`/admin/disputes/${id}/resolve`, { action, note, buyerRefundCents: action === 'split' ? parseMoney(split) ?? undefined : undefined });
    setNote(''); s.reload();
  }, { success: 'صدر القرار ونُفّذ على الضمان', onError: (e: ApiError) => { setErr(e.message); return true; } });

  return (
    <Loadable state={s}>
      {(v) => {
        const { dispute: d, assignee, assignedToMe, disputeEvents, deal, listing, steps, stepLog, events, buyer, seller, chat, listingHistory, listingEvidence, listingVerification: lv } = v;
        const open = d.status !== 'resolved';
        const postRelease = d.opened_in_state === 'released';
        return (
          <div className="stack">
            <Link to="/admin/disputes" className="row small" style={{ gap: 4 }}><Icon.ChevronBack size={16} /> النزاعات</Link>
            <div className="row" style={{ gap: 12 }}>
              <PlatformBadge platform={listing.platform as Platform} />
              <div className="grow"><h1 style={{ fontSize: '1.4rem', margin: 0 }}>{DISPUTE_REASONS[d.reason_code]}</h1><div className="small muted"><span className="ltr">@{listing.handle}</span> · فُتح {dateTime(d.created_at)} في مرحلة «{ESCROW_LABELS[d.opened_in_state as EscrowState]}»</div></div>
              <EscrowBadge state={deal.escrow_state} />
            </div>
            {postRelease && <Alert kind="danger" title="نزاع استرداد بعد التحرير">عائد البائع مجمّد داخل فترة الحماية. القرار: رد (يعكس العائد والعمولة) أو تحرير (يفك التجميد).</Alert>}
            {open && !assignedToMe && (
              <Alert kind="info" title={assignee ? `مسند إلى ${assignee}` : 'غير مسند'}>
                يجب أن تتولى النزاع لإصدار قرار أو طلب أدلة ولفتح لقطات التحقق. <Button size="sm" loading={assigning} disabled={user?.id === deal.buyer_id || user?.id === deal.seller_id} onClick={() => assign()}>تولّي النزاع</Button>
              </Alert>
            )}

            <div className="grid cols-4">
              <div className="card metric"><span className="k">المبلغ المحتجز</span><span className="v num">{money(deal.price_cents, true)}</span></div>
              <div className="card row" style={{ gap: 10 }}><TrustSeal score={buyer.trust_buyer} size="sm" /><div><div className="xs muted">المشتري</div><Link to={`/admin/users/${buyer.id}`}>{buyer.display_name}</Link></div></div>
              <div className="card row" style={{ gap: 10 }}><TrustSeal score={seller.trust_seller} size="sm" /><div><div className="xs muted">البائع</div><Link to={`/admin/users/${seller.id}`}>{seller.display_name}</Link></div></div>
              <div className="card metric"><span className="k">خطوات مكتملة</span><span className="v num">{steps.filter((x: any) => x.status === 'done').length}/6</span></div>
            </div>
            <div className="card"><EscrowVault state={deal.escrow_state} prev={deal.prev_state} /></div>

            <div className="tabs" role="tablist">
              {[['case', 'الملف والأدلة'], ['chat', `المحادثة (${chat.messages.length})`], ['transfer', 'سجل النقل'], ['listing', 'تحقق الإعلان']].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k as typeof tab)}>{l}</button>)}
            </div>

            {tab === 'case' && <div className="card"><EventList events={disputeEvents} /></div>}
            {tab === 'chat' && <div className="card"><Transcript messages={chat.messages} buyerId={deal.buyer_id} /></div>}
            {tab === 'transfer' && (
              <div className="grid cols-2">
                <div className="card"><h3>الخطوات</h3><ul className="timeline">{steps.map((st: any) => <li key={st.step_no}><div><strong className="small">{st.step_no}. {TRANSFER_STEPS[st.step_no - 1].title}</strong> <span className={`badge ${st.status === 'done' ? 'vault' : ''}`}>{st.status}</span><div className="xs muted">{st.performed_at && `نُفّذت ${dateTime(st.performed_at)}`}{st.confirmed_at && ` · أُكّدت ${dateTime(st.confirmed_at)}`}</div>{st.note && <div className="xs">«{st.note}»</div>}</div></li>)}</ul></div>
                <div className="card"><h3>التسلسل الزمني</h3><ul className="timeline">{[...events.map((e: any) => ({ t: e.created_at, x: `${ESCROW_LABELS[e.to_state as EscrowState]} — ${e.reason ?? ''}` })), ...stepLog.map((e: any) => ({ t: e.created_at, x: `خطوة ${e.step_no}: ${e.action} (${e.actor_id === deal.buyer_id ? 'مشترٍ' : e.actor_id === deal.seller_id ? 'بائع' : 'عمليات'})` }))].sort((a, b) => a.t - b.t).map((e, i) => <li key={i}><div><div className="small">{e.x}</div><div className="xs muted">{dateTime(e.t)}</div></div></li>)}</ul></div>
              </div>
            )}
            {tab === 'listing' && (
              <div className="grid cols-2">
                <div className="card stack-sm">
                  <h3>بيانات التحقق</h3>
                  <dl className="kv"><dt>الرمز</dt><dd className="ltr">{lv.verification_code}</dd><dt>الفحص الآلي</dt><dd>{lv.code_check_status}</dd><dt>المتابعون المعلنون / المرصودون</dt><dd className="num">{int(lv.followers)} / {lv.reviewer_observed_followers ? int(lv.reviewer_observed_followers) : '—'}</dd><dt>درجة المخاطر</dt><dd className="num">{int(lv.fraud_score)}</dd></dl>
                  {lv.fraud_flags.length > 0 && <ul className="xs" style={{ margin: 0, paddingInlineStart: 18 }}>{lv.fraud_flags.map((f: any) => <li key={f.code}>{f.detail}</li>)}</ul>}
                  <div className="evidence-grid">{listingEvidence.map((e: any) => <figure key={e.id}>{e.url ? <a href={e.url} target="_blank" rel="noopener noreferrer"><img src={e.url} alt={e.kind} loading="lazy" /></a> : <div style={{ aspectRatio: '4/3', display: 'grid', placeItems: 'center', color: 'var(--faint)' }}><Icon.Lock size={24} /></div>}<figcaption>{e.kind}</figcaption></figure>)}</div>
                  {!assignedToMe && <p className="xs muted">تولَّ النزاع لفتح اللقطات.</p>}
                </div>
                <div className="card"><h3>سجل مراجعة الإعلان</h3><ul className="timeline">{listingHistory.map((h: any, i: number) => <li key={i}><div className="small"><strong>{h.action}</strong> — {h.actor ?? 'النظام'} <span className="xs muted">{dateTime(h.created_at)}</span>{h.note && <div className="xs">{h.note}</div>}</div></li>)}</ul></div>
              </div>
            )}

            {open && assignedToMe && (
              <div className="grid cols-2">
                <div className="card pad-lg stack">
                  <h2 style={{ fontSize: '1.1rem', margin: 0 }}>إصدار القرار</h2>
                  {err && <Alert kind="danger">{err}</Alert>}
                  <div className="stack-sm" role="radiogroup">
                    {(Object.keys(ACTIONS) as Array<keyof typeof ACTIONS>).filter((k) => !postRelease || k === 'refund' || k === 'release').map((k) => (
                      <label key={k} className="check"><input type="radio" name="act" checked={action === k} onChange={() => setAction(k)} /><span>{ACTIONS[k]}</span></label>
                    ))}
                  </div>
                  {action === 'split' && <Field label="المبلغ المردود للمشتري ($)" htmlFor="sp" hint={`من أصل ${money(deal.price_cents, true)}. يُطبّق نسبة العمولة على حصة البائع فقط.`}><input id="sp" className="input" inputMode="decimal" value={split} onChange={(e) => setSplit(e.target.value)} /></Field>}
                  <Field label="مسوغات القرار (تظهر للطرفين)" htmlFor="rn"><textarea id="rn" className="textarea" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
                  <Button variant="dark" loading={resolving} disabled={note.trim().length < 10} onClick={() => confirm(`تأكيد: ${ACTIONS[action]}؟ هذا الإجراء ينفّذ حركة مالية.`) && resolve()}><Icon.Gavel size={16} /> تنفيذ القرار</Button>
                  <Button variant="ghost" size="sm" loading={noting} disabled={note.trim().length < 3} onClick={() => addNote()}>حفظ كملاحظة داخلية فقط</Button>
                </div>
                <div className="card pad-lg stack">
                  <h2 style={{ fontSize: '1.1rem', margin: 0 }}>طلب أدلة إضافية</h2>
                  <div className="seg" role="group">{[['both', 'الطرفان'], ['buyer', 'المشتري'], ['seller', 'البائع']].map(([k, l]) => <button key={k} aria-pressed={req.from === k} onClick={() => setReq((r) => ({ ...r, from: k }))}>{l}</button>)}</div>
                  <Field label="المطلوب" htmlFor="rq"><textarea id="rq" className="textarea" value={req.body} onChange={(e) => setReq((r) => ({ ...r, body: e.target.value }))} placeholder="مثال: لقطة لسجل تسجيل الدخول في إعدادات الأمان تُظهر آخر الأجهزة" /></Field>
                  <Button variant="secondary" loading={requesting} disabled={req.body.trim().length < 10} onClick={() => request()}>إرسال الطلب</Button>
                </div>
              </div>
            )}
            {!open && <Alert kind="vault" title={`القرار: ${ACTIONS[d.resolution as keyof typeof ACTIONS]}`}>{d.resolution_note}<div className="xs muted">{dateTime(d.resolved_at)}</div></Alert>}
          </div>
        );
      }}
    </Loadable>
  );
}
