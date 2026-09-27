import { useNavigate, useSearchParams } from 'react-router-dom';
import { DISPUTE_REASONS } from '../../../../shared/domain';
import { ago, money } from '../../lib/format';
import { Icon } from '../../ui/icons';
import { Empty, Loadable, useFetch } from '../../ui/kit';

export default function Disputes() {
  const [p, setP] = useSearchParams();
  const status = p.get('status') || 'active';
  const s = useFetch<{ items: any[] }>(`/admin/disputes?status=${status}`);
  const nav = useNavigate();
  return (
    <div className="stack">
      <h1 style={{ fontSize: '1.5rem' }}>النزاعات</h1>
      <div className="tabs" role="tablist">{[['active', 'نشطة'], ['awaiting_evidence', 'بانتظار أدلة'], ['resolved', 'مغلقة'], ['all', 'الكل']].map(([k, l]) => <button key={k} role="tab" aria-selected={status === k} onClick={() => setP({ status: k })}>{l}</button>)}</div>
      <Loadable state={s}>
        {({ items }) => items.length === 0 ? <div className="card"><Empty icon={<Icon.Gavel size={26} />} title="لا نزاعات" /></div> : (
          <div className="table-wrap"><table className="table responsive">
            <thead><tr><th>الإعلان</th><th>السبب</th><th>فتحه</th><th className="num">المبلغ</th><th>المرحلة</th><th>المحكّم</th><th>الحالة</th><th>العمر</th></tr></thead>
            <tbody>{items.map((d) => (
              <tr key={d.id} className="clickable" onClick={() => nav(`/admin/disputes/${d.id}`)}>
                <td data-label="الإعلان">{d.title}</td>
                <td data-label="السبب">{DISPUTE_REASONS[d.reason_code]}</td>
                <td data-label="فتحه">{d.opened_by_name}</td>
                <td data-label="المبلغ" className="num">{money(d.price_cents)}</td>
                <td data-label="المرحلة">{d.opened_in_state === 'released' ? <span className="badge danger">بعد التحرير</span> : <span className="badge">{d.opened_in_state}</span>}</td>
                <td data-label="المحكّم">{d.assignee_name ?? <span className="badge warn">غير مسند</span>}</td>
                <td data-label="الحالة"><span className={`badge ${d.status === 'resolved' ? 'vault' : d.status === 'awaiting_evidence' ? 'warn' : 'danger'}`}>{d.status === 'resolved' ? d.resolution : d.status === 'awaiting_evidence' ? 'بانتظار أدلة' : 'مفتوح'}</span></td>
                <td data-label="العمر">{ago(d.created_at)}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </Loadable>
    </div>
  );
}
