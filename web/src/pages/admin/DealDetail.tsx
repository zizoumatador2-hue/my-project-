import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ESCROW_LABELS, TRANSFER_STEPS, type EscrowState, type Platform } from '../../../../shared/domain';
import { post } from '../../lib/api';
import { dateTime, money } from '../../lib/format';
import { useSession } from '../../lib/session';
import { Icon, PlatformBadge } from '../../ui/icons';
import { Alert, Button, EscrowBadge, EscrowVault, Field, Loadable, useAction, useFetch } from '../../ui/kit';

export function Transcript({ messages, buyerId }: { messages: any[]; buyerId: string }) {
  if (!messages.length) return <p className="small muted">لا رسائل.</p>;
  return (
    <div className="chat-log" style={{ maxBlockSize: 480, borderRadius: 12, border: '1px solid var(--line)' }}>
      {messages.map((m) => (
        <div key={m.id} className={`msg ${m.sender_id === null ? 'system' : m.sender_id === buyerId ? 'theirs' : 'mine'} ${m.blocked ? 'blocked' : ''}`}>
          {m.sender_id && <strong className="xs" style={{ display: 'block' }}>{m.sender_name} ({m.sender_id === buyerId ? 'مشترٍ' : 'بائع'})</strong>}
          {m.body}
          <span className="meta">{m.blocked ? `محجوبة: ${JSON.parse(m.block_reasons || '[]').join(', ')} · ` : ''}{dateTime(m.created_at)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminDealDetail() {
  const { id } = useParams();
  const s = useFetch<any>(`/admin/deals/${id}`);
  const { can } = useSession();
  const [note, setNote] = useState('');
  const [verify, verifying] = useAction(async () => { await post(`/deals/${id}/steps/6/perform`, { note: note || undefined }); setNote(''); s.reload(); }, { success: 'اعتُمد النقل وبدأت مهلة تأكيد المشتري' });

  return (
    <Loadable state={s}>
      {(v) => {
        const { deal, listing, steps, events, stepLog, buyer, seller, chat, audit, platformLedger, sellerLedger, disputes, paymentRef } = v;
        const step6 = steps.find((x: any) => x.step_no === 6);
        return (
          <div className="stack">
            <Link to="/admin/deals" className="row small" style={{ gap: 4 }}><Icon.ChevronBack size={16} /> الصفقات</Link>
            <div className="row" style={{ gap: 12 }}>
              <PlatformBadge platform={listing.platform as Platform} />
              <div className="grow"><h1 style={{ fontSize: '1.4rem', margin: 0 }} className="ltr">@{listing.handle}</h1><div className="small muted">{seller.display_name} ← {buyer.display_name}</div></div>
              <EscrowBadge state={deal.escrow_state} />
            </div>
            <div className="card"><EscrowVault state={deal.escrow_state} prev={deal.prev_state} /></div>
            <div className="grid cols-4">
              <div className="card metric"><span className="k">المبلغ</span><span className="v num">{money(deal.price_cents, true)}</span></div>
              <div className="card metric"><span className="k">العمولة (<span className="num">{deal.commission_bp / 100}٪</span>)</span><span className="v num">{money(deal.commission_cents, true)}</span></div>
              <div className="card metric"><span className="k">صافي البائع</span><span className="v num">{money(deal.seller_net_cents, true)}</span></div>
              <div className="card metric"><span className="k">مرجع الدفع</span><span className="small ltr" style={{ wordBreak: 'break-all' }}>{paymentRef ?? '—'}</span></div>
            </div>
            {disputes.length > 0 && <Alert kind="danger" title="نزاعات">{disputes.map((d: any) => <div key={d.id}><Link to={`/admin/disputes/${d.id}`}>{d.reason_code} — {d.status}{d.resolution ? ` (${d.resolution})` : ''}</Link></div>)}</Alert>}

            {step6?.status === 'active' && deal.escrow_state === 'transfer_in_progress' && can('deals.transfer_verify') && (
              <div className="card pad-lg stack">
                <h2 style={{ fontSize: '1.1rem', margin: 0 }}>اعتماد اكتمال النقل (الخطوة 6)</h2>
                <p className="small muted" style={{ margin: 0 }}>راجع سجل الخطوات أدناه والمحادثة: هل أكّد المشتري كل خطوة تخصه؟ هل هناك مؤشرات تلاعب؟ الاعتماد يبدأ مهلة تأكيد المشتري.</p>
                <Field label="ملاحظة المراجعة" htmlFor="vn"><input id="vn" className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
                <div className="row"><Button loading={verifying} onClick={() => verify()}><Icon.Check size={16} /> اعتماد النقل</Button><Link to={`/deals/${id}`} className="btn btn-secondary">فتح غرفة الصفقة</Link></div>
              </div>
            )}

            <div className="grid cols-2">
              <div className="card stack-sm">
                <h3>خطوات النقل</h3>
                <ul className="timeline">
                  {steps.map((st: any) => (
                    <li key={st.step_no}><div><strong className="small">{st.step_no}. {TRANSFER_STEPS[st.step_no - 1].title}</strong> <span className={`badge ${st.status === 'done' ? 'vault' : ''}`}>{st.status}</span>
                      <div className="xs muted num">{st.performed_at && `نُفّذت ${dateTime(st.performed_at)}`}{st.confirmed_at && ` · أُكّدت ${dateTime(st.confirmed_at)}`}</div>{st.note && <div className="xs">{st.note}</div>}</div></li>
                  ))}
                </ul>
              </div>
              <div className="card stack-sm">
                <h3>سجل الضمان والخطوات</h3>
                <ul className="timeline">
                  {[...events.map((e: any) => ({ t: e.created_at, txt: `${ESCROW_LABELS[e.to_state as EscrowState]} — ${e.reason ?? ''}` })), ...stepLog.map((e: any) => ({ t: e.created_at, txt: `خطوة ${e.step_no}: ${e.action} (${e.actor_id === deal.buyer_id ? 'مشترٍ' : e.actor_id === deal.seller_id ? 'بائع' : 'عمليات'})` }))]
                    .sort((a, b) => a.t - b.t).map((e, i) => <li key={i}><div><div className="small">{e.txt}</div><div className="xs muted num">{dateTime(e.t)}</div></div></li>)}
                </ul>
              </div>
            </div>

            {chat && <div className="card stack-sm"><h3>المحادثة الكاملة (مع المحجوب)</h3><Transcript messages={chat.messages} buyerId={deal.buyer_id} /></div>}

            <div className="grid cols-2">
              <div className="card stack-sm"><h3>دفتر المنصة</h3>{platformLedger.length === 0 ? <p className="small muted">لا قيود.</p> : platformLedger.map((e: any, i: number) => <div key={i} className="row between small"><span>{e.kind}</span><span className="num ltr">{money(e.amount_cents, true)}</span></div>)}</div>
              <div className="card stack-sm"><h3>قيود محفظة البائع</h3>{sellerLedger.length === 0 ? <p className="small muted">لا قيود.</p> : sellerLedger.map((e: any, i: number) => <div key={i} className="row between small"><span>{e.kind}{e.frozen ? ' (مجمّد)' : ''}</span><span className="num ltr">{money(e.amount_cents, true)}</span></div>)}</div>
            </div>
            <details className="card"><summary style={{ cursor: 'pointer', fontWeight: 600 }}>سجل التدقيق للصفقة ({audit.length})</summary>
              <ul className="timeline" style={{ marginBlockStart: 10 }}>{audit.map((a: any, i: number) => <li key={i}><div className="small"><code className="ltr">{a.action}</code> — {a.actor ?? 'النظام'} <span className="xs muted">{dateTime(a.created_at)}</span></div></li>)}</ul>
            </details>
          </div>
        );
      }}
    </Loadable>
  );
}
