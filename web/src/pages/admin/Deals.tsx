import { useNavigate, useSearchParams } from 'react-router-dom';
import { ESCROW_LABELS, ESCROW_STATES, type Platform } from '../../../../shared/domain';
import { ago, int, money } from '../../lib/format';
import { Icon, PlatformBadge } from '../../ui/icons';
import { EscrowBadge, Empty, Loadable, useFetch } from '../../ui/kit';

export default function AdminDeals() {
  const [p, setP] = useSearchParams();
  const state = p.get('state') || '';
  const s = useFetch<{ items: any[] }>(`/admin/deals${state ? `?state=${state}` : ''}`);
  const nav = useNavigate();
  return (
    <div className="stack">
      <h1 style={{ fontSize: '1.5rem' }}>صفقات الضمان</h1>
      <label className="row small" style={{ gap: 8 }}>
        <span className="muted">الحالة:</span>
        <select className="select" style={{ inlineSize: 'auto' }} value={state} onChange={(e) => setP(e.target.value ? { state: e.target.value } : {})}>
          <option value="">الكل</option>
          <option value="needs_verify">بانتظار اعتماد النقل</option>
          {ESCROW_STATES.map((k) => <option key={k} value={k}>{ESCROW_LABELS[k]}</option>)}
        </select>
      </label>
      <Loadable state={s}>
        {({ items }) => items.length === 0 ? <div className="card"><Empty icon={<Icon.Lock size={26} />} title="لا صفقات" /></div> : (
          <div className="table-wrap"><table className="table responsive">
            <thead><tr><th>الحساب</th><th>الأطراف</th><th className="num">المبلغ</th><th className="num">العمولة</th><th>الحالة</th><th>الخطوات</th><th>آخر تحديث</th></tr></thead>
            <tbody>{items.map((d) => (
              <tr key={d.id} className="clickable" onClick={() => nav(`/admin/deals/${d.id}`)}>
                <td data-label="الحساب"><div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}><PlatformBadge platform={d.platform as Platform} small /><span className="ltr">@{d.handle}</span></div></td>
                <td data-label="الأطراف" className="small">{d.seller_name} ← {d.buyer_name}</td>
                <td data-label="المبلغ" className="num">{money(d.price_cents)}</td>
                <td data-label="العمولة" className="num">{money(d.commission_cents)}</td>
                <td data-label="الحالة"><EscrowBadge state={d.escrow_state} /></td>
                <td data-label="الخطوات" className="num">{int(d.steps_done ?? 0)}/6</td>
                <td data-label="آخر تحديث">{ago(d.updated_at)}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </Loadable>
    </div>
  );
}
