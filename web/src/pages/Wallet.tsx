import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, post } from '../lib/api';
import { dateTime, money, parseMoney } from '../lib/format';
import { Icon } from '../ui/icons';
import { Alert, Button, Empty, Field, Loadable, Modal, useFetch, useToast } from '../ui/kit';
import { PageHeader } from '../ui/Shell';

const KIND: Record<string, string> = { sale_proceeds: 'عائد بيع', dispute_split: 'حصة تسوية نزاع', reclaim_reversal: 'عكس بقرار تحكيم', withdrawal: 'سحب', withdrawal_reversal: 'إعادة سحب مرفوض' };
const WSTATUS: Record<string, [string, string]> = { pending_review: ['قيد المراجعة', 'warn'], approved: ['معتمد — قيد التحويل', 'info'], paid: ['تم التحويل', 'vault'], rejected: ['مرفوض', 'danger'] };

export default function Wallet() {
  const state = useFetch<any>('/wallet');
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ amount: '', accountHolder: '', iban: '', bankName: '', password: '' });
  const [err, setErr] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  async function submit() {
    setErr(null); setFields({});
    const cents = parseMoney(f.amount);
    if (!cents) { setFields({ amountCents: 'أدخل مبلغًا صحيحًا' }); return; }
    setBusy(true);
    try {
      const r = await post<{ status: string }>('/wallet/withdrawals', { amountCents: cents, accountHolder: f.accountHolder, iban: f.iban, bankName: f.bankName, password: f.password });
      toast('success', r.status === 'approved' ? 'تمت الموافقة تلقائيًا — التحويل قيد التنفيذ' : 'أُرسل الطلب للمراجعة المالية');
      setOpen(false); setF({ amount: '', accountHolder: '', iban: '', bankName: '', password: '' }); state.reload();
    } catch (e) { if (e instanceof ApiError) { setErr(e.message); setFields(e.fields); } }
    finally { setBusy(false); }
  }

  return (
    <div className="container page">
      <PageHeader title="المحفظة" sub="أرصدتك من المبيعات، وسجل الحركات، وطلبات السحب." actions={<Button onClick={() => setOpen(true)}>طلب سحب</Button>} />
      <Loadable state={state}>
        {(w) => (
          <div className="stack">
            <div className="grid cols-4">
              <div className="card metric"><span className="k">المتاح للسحب</span><span className="v num" style={{ color: 'var(--vault)' }}>{money(w.balances.available, true)}</span></div>
              <div className="card metric"><span className="k">معلّق (حماية الاسترداد)</span><span className="v num">{money(w.balances.on_hold, true)}</span>{w.balances.next_release_at && <span className="xs muted">يُتاح التالي {dateTime(w.balances.next_release_at)}</span>}</div>
              <div className="card metric"><span className="k">في الضمان (صفقات جارية)</span><span className="v num">{money(w.balances.in_escrow, true)}</span></div>
              <div className="card metric"><span className="k">مجمّد (نزاعات)</span><span className="v num" style={{ color: w.balances.frozen ? 'var(--danger)' : undefined }}>{money(w.balances.frozen, true)}</span></div>
            </div>
            <Alert kind="info">بعد تحرير أي صفقة يبقى صافي العائد معلّقًا {w.rules.reclaim_hold_days} أيام لحماية المشتري من استرداد الحساب، ثم يصبح متاحًا للسحب تلقائيًا.</Alert>

            <div className="card">
              <div className="card-title"><h2 style={{ fontSize: '1.1rem' }}>طلبات السحب</h2></div>
              {w.withdrawals.length === 0 ? <p className="muted small">لا توجد طلبات.</p> : (
                <div className="table-wrap"><table className="table responsive">
                  <thead><tr><th>التاريخ</th><th className="num">المبلغ</th><th>الوجهة</th><th>الحالة</th><th>المرجع / الملاحظة</th></tr></thead>
                  <tbody>{w.withdrawals.map((x: any) => (
                    <tr key={x.id}>
                      <td data-label="التاريخ">{dateTime(x.created_at)}</td>
                      <td data-label="المبلغ" className="num">{money(x.amount_cents, true)}</td>
                      <td data-label="الوجهة"><span className="ltr small">{x.payout_hint}</span></td>
                      <td data-label="الحالة"><span className={`badge ${WSTATUS[x.status][1]}`}>{WSTATUS[x.status][0]}</span>{x.auto_approved ? <span className="xs muted"> · تلقائي</span> : null}</td>
                      <td data-label="المرجع">{x.payout_ref ? <span className="ltr small">{x.payout_ref}</span> : x.note ?? '—'}</td>
                    </tr>))}</tbody>
                </table></div>
              )}
            </div>

            <div className="card">
              <div className="card-title"><h2 style={{ fontSize: '1.1rem' }}>سجل الحركات</h2></div>
              {w.ledger.length === 0 ? <Empty icon={<Icon.Wallet size={26} />} title="لا حركات بعد">تظهر هنا عائدات مبيعاتك بعد تحرير الضمان.</Empty> : (
                <div className="table-wrap"><table className="table responsive">
                  <thead><tr><th>التاريخ</th><th>النوع</th><th>البيان</th><th className="num">المبلغ</th><th>الإتاحة</th></tr></thead>
                  <tbody>{w.ledger.map((e: any) => (
                    <tr key={e.id}>
                      <td data-label="التاريخ">{dateTime(e.created_at)}</td>
                      <td data-label="النوع">{KIND[e.kind] ?? e.kind}</td>
                      <td data-label="البيان">{e.deal_id ? <Link to={`/deals/${e.deal_id}`}>{e.title ?? e.memo}</Link> : e.memo}</td>
                      <td data-label="المبلغ" className="num" style={{ color: e.amount_cents < 0 ? 'var(--danger)' : 'var(--vault)', fontWeight: 600 }}><span className="ltr">{e.amount_cents > 0 ? '+' : ''}{money(e.amount_cents, true)}</span></td>
                      <td data-label="الإتاحة">{e.frozen ? <span className="badge danger">مجمّد</span> : e.available_at > Date.now() ? <span className="badge seal">{dateTime(e.available_at)}</span> : <span className="badge vault">متاح</span>}</td>
                    </tr>))}</tbody>
                </table></div>
              )}
            </div>

            <Modal open={open} onClose={() => setOpen(false)} title="طلب سحب"
              footer={<><Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button><Button loading={busy} onClick={submit}>إرسال الطلب</Button></>}>
              <div className="panel row between"><span className="small muted">المتاح</span><strong className="num">{money(w.balances.available, true)}</strong></div>
              {err && <Alert kind="danger">{err}</Alert>}
              <Field label="المبلغ ($)" htmlFor="wa" error={fields.amountCents} hint={`الحد الأدنى ${money(w.rules.min_cents)}`}>
                <input id="wa" className="input" inputMode="decimal" value={f.amount} onChange={(e) => set('amount', e.target.value)} />
              </Field>
              <Field label="اسم صاحب الحساب البنكي" htmlFor="wh" error={fields.accountHolder}><input id="wh" className="input" value={f.accountHolder} onChange={(e) => set('accountHolder', e.target.value)} /></Field>
              <Field label="رقم الآيبان (IBAN)" htmlFor="wi" error={fields.iban}><input id="wi" className="input ltr-input" autoCapitalize="characters" value={f.iban} onChange={(e) => set('iban', e.target.value)} /></Field>
              <Field label="اسم البنك" htmlFor="wb" error={fields.bankName}><input id="wb" className="input" value={f.bankName} onChange={(e) => set('bankName', e.target.value)} /></Field>
              <Field label="كلمة مرور حسابك (للتأكيد)" htmlFor="wp" error={fields.password}><input id="wp" className="input ltr-input" type="password" autoComplete="current-password" value={f.password} onChange={(e) => set('password', e.target.value)} /></Field>
              <p className="xs muted" style={{ margin: 0 }}>تُشفَّر بيانات التحويل ولا يطلع عليها إلا الفريق المالي عند التنفيذ. الطلبات الصغيرة قد تُعتمد تلقائيًا وفق سياسة المنصة.</p>
            </Modal>
          </div>
        )}
      </Loadable>
    </div>
  );
}
