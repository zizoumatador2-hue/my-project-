import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '../../../../shared/domain';
import { post } from '../../lib/api';
import { dateTime, dzd, money } from '../../lib/format';
import { Icon } from '../../ui/icons';
import { Alert, Button, Empty, Field, Loadable, Modal, useAction, useFetch } from '../../ui/kit';

function Transfers() {
  const [p, setP] = useSearchParams();
  const status = p.get('status') || 'pending';
  const s = useFetch<{ items: any[]; platformRip: string }>(`/admin/payments?status=${status}`);
  const [cur, setCur] = useState<any>(null);
  const [mode, setMode] = useState<'confirm' | 'reject'>('confirm');
  const [note, setNote] = useState('');
  const [decide, busy] = useAction(async () => { await post(`/admin/payments/${cur.id}/decision`, { action: mode, note }); setCur(null); s.reload(); },
    { success: 'تم تسجيل القرار' });
  return (
    <div className="stack">
      <div className="tabs" role="tablist">{[['pending', 'بانتظار التحقق'], ['confirmed', 'مؤكَّدة'], ['rejected', 'مرفوضة'], ['all', 'الكل']].map(([k, l]) => <button key={k} role="tab" aria-selected={status === k} onClick={() => setP({ tab: 'transfers', status: k })}>{l}</button>)}</div>
      <Loadable state={s}>
        {({ items, platformRip }) => items.length === 0 ? <div className="card"><Empty icon={<Icon.Check size={26} />} title="لا توجد تحويلات" /></div> : (
          <div className="stack-sm">
            <p className="xs muted" style={{ margin: 0 }}>قارن كل وصل بكشف حساب المنصة (RIP <span className="ltr">{platformRip}</span>): المبلغ بالضبط، ورمز المرجع، والتاريخ. لا تؤكد إلا بعد ظهور المبلغ فعليًا في الحساب.</p>
            {items.map((x) => (
              <div key={x.id} className="card stack-sm">
                <div className="row between">
                  <div><strong>{x.title}</strong> <span className="xs muted">· <span className="ltr">@{x.handle}</span> · المشتري {x.buyer_name}</span></div>
                  <span className={`badge ${x.status === 'confirmed' ? 'vault' : x.status === 'rejected' ? 'danger' : 'warn'}`}>{x.status === 'confirmed' ? 'مؤكَّد' : x.status === 'rejected' ? 'مرفوض' : 'بانتظار التحقق'}</span>
                </div>
                <dl className="kv small">
                  <dt>المبلغ المطلوب</dt><dd className="num">{dzd(x.pay_amount)} <span className="muted">(= {money(x.price_cents, true)} بسعر {x.fx_rate})</span></dd>
                  <dt>رمز المرجع</dt><dd className="ltr">{x.reference}</dd>
                  <dt>مرجع الوصل</dt><dd className="ltr">{x.transfer_ref}</dd>
                  <dt>أُرسل</dt><dd>{dateTime(x.created_at)}</dd>
                  {x.review_note && <><dt>ملاحظة المراجعة</dt><dd>{x.review_note} — {x.reviewer_name}</dd></>}
                </dl>
                <div className="row">
                  <a className="btn btn-secondary btn-sm" href={x.receipt_url} target="_blank" rel="noopener noreferrer"><Icon.File size={16} /> عرض الوصل</a>
                  <Link className="btn btn-ghost btn-sm" to={`/admin/deals/${x.deal_id}`}>الصفقة</Link>
                  {x.status === 'pending' && <>
                    <Button size="sm" onClick={() => { setCur(x); setMode('confirm'); setNote(''); }}>تأكيد الاستلام</Button>
                    <Button size="sm" variant="danger-outline" onClick={() => { setCur(x); setMode('reject'); setNote(''); }}>رفض</Button>
                  </>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Loadable>
      <Modal open={!!cur} onClose={() => setCur(null)} title={mode === 'confirm' ? 'تأكيد استلام التحويل' : 'رفض الوصل'}
        footer={<><Button variant="ghost" onClick={() => setCur(null)}>إلغاء</Button><Button variant={mode === 'reject' ? 'danger' : 'primary'} loading={busy} disabled={note.trim().length < 3} onClick={() => decide()}>تأكيد</Button></>}>
        {cur && mode === 'confirm' && <Alert kind="warn">بالتأكيد يُحتجز {dzd(cur.pay_amount)} لدى الضمان وتبدأ خطوات النقل. تأكد من وصول المبلغ فعليًا إلى حساب المنصة.</Alert>}
        {cur && mode === 'reject' && <p className="small">يُبلَّغ المشتري بالسبب ويمكنه إرسال وصل جديد. يبقى الإعلان محجوزًا حتى انتهاء المهلة.</p>}
        <Field label={mode === 'confirm' ? 'ملاحظة (مثال: ظهر في كشف الحساب)' : 'سبب الرفض (يظهر للمشتري)'} htmlFor="pn"><textarea id="pn" className="textarea" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </Modal>
    </div>
  );
}

function Refunds() {
  const [p, setP] = useSearchParams();
  const status = p.get('status') || 'pending';
  const s = useFetch<{ items: any[] }>(`/admin/refunds?status=${status}`);
  const [cur, setCur] = useState<any>(null);
  const [dest, setDest] = useState<{ rip: string | null; note?: string } | null>(null);
  const [ref, setRef] = useState('');
  const [reveal, revealing] = useAction(async (id: string) => setDest(await post(`/admin/refunds/${id}/destination`)));
  const [done, doing] = useAction(async () => { await post(`/admin/refunds/${cur.id}/done`, { reference: ref }); setCur(null); s.reload(); }, { success: 'سُجّل تنفيذ الاسترداد وأُبلغ المشتري' });
  return (
    <div className="stack">
      <div className="tabs" role="tablist">{[['pending', 'بانتظار التنفيذ'], ['done', 'منفّذة'], ['all', 'الكل']].map(([k, l]) => <button key={k} role="tab" aria-selected={status === k} onClick={() => setP({ tab: 'refunds', status: k })}>{l}</button>)}</div>
      <Loadable state={s}>
        {({ items }) => items.length === 0 ? <div className="card"><Empty icon={<Icon.Check size={26} />} title="لا توجد استردادات" /></div> : (
          <div className="table-wrap"><table className="table responsive">
            <thead><tr><th>الصفقة</th><th>المشتري</th><th>الوسيلة</th><th className="num">المبلغ</th><th>السبب</th><th>الحالة</th><th></th></tr></thead>
            <tbody>{items.map((x) => (
              <tr key={x.id}>
                <td data-label="الصفقة"><Link to={`/admin/deals/${x.deal_id}`}>{x.title}</Link></td>
                <td data-label="المشتري">{x.buyer_name}</td>
                <td data-label="الوسيلة">{PAYMENT_METHOD_LABELS[x.method as PaymentMethod] ?? x.method}</td>
                <td data-label="المبلغ" className="num">{x.currency === 'DZD' ? dzd(x.amount) : money(x.amount, true)}</td>
                <td data-label="السبب" className="small">{x.reason}</td>
                <td data-label="الحالة">{x.status === 'done' ? <span className="badge vault">نُفّذ · <span className="ltr">{x.reference}</span></span> : <span className="badge warn">بانتظار التنفيذ</span>}</td>
                <td data-label="">{x.status === 'pending' && <Button size="sm" onClick={() => { setCur(x); setDest(null); setRef(''); }}>تنفيذ</Button>}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </Loadable>
      <Modal open={!!cur} onClose={() => setCur(null)} title="تنفيذ استرداد يدوي"
        footer={<><Button variant="ghost" onClick={() => setCur(null)}>إلغاء</Button><Button loading={doing} disabled={ref.trim().length < 3} onClick={() => done()}>سجّل التنفيذ</Button></>}>
        {cur && <div className="panel row between"><span>{cur.buyer_name}</span><strong className="num">{cur.currency === 'DZD' ? dzd(cur.amount) : money(cur.amount, true)}</strong></div>}
        {dest ? (dest.rip ? <div className="secret-box"><span className="small">RIP المشتري: </span><strong className="ltr num">{dest.rip}</strong></div> : <Alert kind="info">{dest.note}</Alert>)
          : <Button variant="secondary" size="sm" loading={revealing} onClick={() => reveal(cur.id)}><Icon.Eye size={16} /> عرض وجهة الاسترداد (يُسجَّل في التدقيق)</Button>}
        <Field label="مرجع عملية الاسترداد" htmlFor="rref"><input id="rref" className="input ltr-input" value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
      </Modal>
    </div>
  );
}

export default function LocalPayments() {
  const [p, setP] = useSearchParams();
  const tab = p.get('tab') || 'transfers';
  return (
    <div className="stack">
      <h1 style={{ fontSize: '1.5rem' }}>المدفوعات المحلية (الجزائر)</h1>
      <p className="small muted" style={{ margin: 0 }}>تحويلات BaridiMob / CCP تتطلب تحققًا يدويًا قبل حجز المبلغ لدى الضمان. بوابة Chargily لا توفّر استردادًا آليًا، فتظهر استرداداتها هنا لتنفيذها يدويًا.</p>
      <div className="seg" role="group">
        <button aria-pressed={tab === 'transfers'} onClick={() => setP({ tab: 'transfers' })}>التحقق من التحويلات</button>
        <button aria-pressed={tab === 'refunds'} onClick={() => setP({ tab: 'refunds' })}>الاستردادات اليدوية</button>
      </div>
      {tab === 'transfers' ? <Transfers /> : <Refunds />}
    </div>
  );
}
