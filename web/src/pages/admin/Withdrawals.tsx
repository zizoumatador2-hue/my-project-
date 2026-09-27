import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { post } from '../../lib/api';
import { dateTime, int, money } from '../../lib/format';
import { Icon } from '../../ui/icons';
import { Alert, Button, Empty, Field, Loadable, Modal, useAction, useFetch } from '../../ui/kit';

const ST: Record<string, [string, string]> = { pending_review: ['قيد المراجعة', 'warn'], approved: ['معتمد', 'info'], paid: ['مدفوع', 'vault'], rejected: ['مرفوض', 'danger'] };

export default function Withdrawals() {
  const [p, setP] = useSearchParams();
  const status = p.get('status') || 'pending_review';
  const s = useFetch<{ items: any[] }>(`/admin/withdrawals?status=${status}`);
  const [cur, setCur] = useState<any>(null);
  const [mode, setMode] = useState<'approve' | 'reject' | 'mark_paid'>('approve');
  const [note, setNote] = useState('');
  const [ref, setRef] = useState('');
  const [payout, setPayout] = useState<any>(null);
  const [decide, busy] = useAction(async () => { await post(`/admin/withdrawals/${cur.id}/decision`, { action: mode, note: note || undefined, payoutRef: ref || undefined }); setCur(null); s.reload(); }, { success: 'تم تحديث الطلب' });
  const [reveal, revealing] = useAction(async (id: string) => setPayout(await post(`/admin/withdrawals/${id}/payout-details`)));
  const open = (w: any, m: typeof mode) => { setCur(w); setMode(m); setNote(''); setRef(''); setPayout(null); };

  return (
    <div className="stack">
      <h1 style={{ fontSize: '1.5rem' }}>السحوبات</h1>
      <p className="small muted" style={{ margin: 0 }}>قواعد الاعتماد التلقائي (الحد الأقصى والحد اليومي) قابلة للتعديل من <Link to="/admin/settings">الإعدادات</Link>.</p>
      <div className="tabs" role="tablist">{Object.entries({ pending_review: 'للمراجعة', approved: 'معتمدة — بانتظار التحويل', paid: 'مدفوعة', rejected: 'مرفوضة', all: 'الكل' }).map(([k, l]) => <button key={k} role="tab" aria-selected={status === k} onClick={() => setP({ status: k })}>{l}</button>)}</div>
      <Loadable state={s}>
        {({ items }) => items.length === 0 ? <div className="card"><Empty icon={<Icon.Wallet size={26} />} title="لا طلبات" /></div> : (
          <div className="table-wrap"><table className="table responsive">
            <thead><tr><th>المستخدم</th><th className="num">المبلغ</th><th>الوجهة</th><th>المخاطر</th><th>الحالة</th><th>التاريخ</th><th></th></tr></thead>
            <tbody>{items.map((w) => (
              <tr key={w.id}>
                <td data-label="المستخدم"><Link to={`/admin/users/${w.user_id}`}>{w.display_name}</Link></td>
                <td data-label="المبلغ" className="num">{money(w.amount_cents, true)}</td>
                <td data-label="الوجهة"><span className="ltr small">{w.payout_hint}</span></td>
                <td data-label="المخاطر"><span className="small num">ثقة {int(w.trust_seller)}</span>{w.open_cases > 0 && <span className="badge danger" style={{ marginInlineStart: 4 }}>اشتباه</span>}</td>
                <td data-label="الحالة"><span className={`badge ${ST[w.status][1]}`}>{ST[w.status][0]}</span>{w.auto_approved ? <span className="xs muted"> تلقائي</span> : null}</td>
                <td data-label="التاريخ">{dateTime(w.created_at)}</td>
                <td data-label="">
                  <div className="row" style={{ gap: 4 }}>
                    {w.status === 'pending_review' && <><Button size="sm" onClick={() => open(w, 'approve')}>اعتماد</Button><Button size="sm" variant="danger-outline" onClick={() => open(w, 'reject')}>رفض</Button></>}
                    {w.status === 'approved' && <><Button size="sm" onClick={() => open(w, 'mark_paid')}>تسجيل التحويل</Button><Button size="sm" variant="ghost" onClick={() => open(w, 'reject')}>رفض</Button></>}
                  </div>
                </td>
              </tr>))}</tbody>
          </table></div>
        )}
      </Loadable>
      <Modal open={!!cur} onClose={() => setCur(null)} title={mode === 'approve' ? 'اعتماد السحب' : mode === 'reject' ? 'رفض السحب' : 'تسجيل تنفيذ التحويل'}
        footer={<><Button variant="ghost" onClick={() => setCur(null)}>إلغاء</Button><Button variant={mode === 'reject' ? 'danger' : 'primary'} loading={busy} disabled={(mode === 'reject' && note.trim().length < 3) || (mode === 'mark_paid' && ref.trim().length < 3)} onClick={() => decide()}>تأكيد</Button></>}>
        {cur && <div className="panel row between"><span>{cur.display_name}</span><strong className="num">{money(cur.amount_cents, true)}</strong></div>}
        {mode === 'reject' && <Alert kind="info">يُعاد المبلغ إلى الرصيد المتاح للمستخدم.</Alert>}
        {mode === 'mark_paid' && (
          <>
            {payout ? (
              <div className="secret-box stack-sm"><dl className="kv"><dt>المستفيد</dt><dd>{payout.holder}</dd><dt>IBAN</dt><dd className="ltr">{payout.iban}</dd><dt>البنك</dt><dd>{payout.bank}</dd></dl></div>
            ) : <Button variant="secondary" size="sm" loading={revealing} onClick={() => reveal(cur.id)}><Icon.Eye size={16} /> عرض بيانات التحويل (يُسجَّل في التدقيق)</Button>}
            <Field label="مرجع التحويل البنكي" htmlFor="pref"><input id="pref" className="input ltr-input" value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
          </>
        )}
        <Field label={mode === 'reject' ? 'سبب الرفض (يظهر للمستخدم)' : 'ملاحظة (اختياري)'} htmlFor="wnote"><textarea id="wnote" className="textarea" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </Modal>
    </div>
  );
}
