import { useNavigate, useSearchParams } from 'react-router-dom';
import { LISTING_STATUS_LABELS, type Platform } from '../../../../shared/domain';
import { ago, int, money } from '../../lib/format';
import { Icon, PlatformBadge } from '../../ui/icons';
import { Empty, Loadable, useFetch } from '../../ui/kit';

const CODE: Record<string, [string, string]> = { pending: ['قيد الفحص', ''], found: ['وُجد آليًا', 'vault'], not_found: ['لم يُعثر عليه', 'warn'], unavailable: ['تعذّر الفحص', ''] };

export default function Reviews() {
  const [p, setP] = useSearchParams();
  const status = p.get('status') || 'pending_review';
  const s = useFetch<{ items: any[] }>(`/admin/listings?status=${status}`);
  const nav = useNavigate();
  return (
    <div className="stack">
      <h1 style={{ fontSize: '1.5rem' }}>قائمة مراجعة الإعلانات</h1>
      <p className="small muted" style={{ margin: 0 }}>لا يُنشر أي إعلان دون اعتماد بشري. مرتبة حسب درجة المخاطر ثم الأقدم.</p>
      <div className="tabs" role="tablist">
        {['pending_review', 'needs_evidence', 'approved', 'rejected', 'all'].map((k) => (
          <button key={k} role="tab" aria-selected={status === k} onClick={() => setP({ status: k })}>{k === 'all' ? 'الكل' : LISTING_STATUS_LABELS[k]}</button>
        ))}
      </div>
      <Loadable state={s}>
        {({ items }) => items.length === 0 ? <div className="card"><Empty icon={<Icon.Check size={26} />} title="القائمة فارغة" /></div> : (
          <div className="table-wrap"><table className="table responsive">
            <thead><tr><th>الحساب</th><th>البائع</th><th className="num">المتابعون</th><th className="num">السعر</th><th>المخاطر</th><th>رمز التحقق</th><th>المراجع</th><th>أُرسل</th></tr></thead>
            <tbody>{items.map((l) => (
              <tr key={l.id} className="clickable" onClick={() => nav(`/admin/reviews/${l.id}`)}>
                <td data-label="الحساب"><div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}><PlatformBadge platform={l.platform as Platform} small /><span className="ltr">@{l.handle}</span></div></td>
                <td data-label="البائع">{l.seller_name} <span className="xs muted num">({int(l.trust_seller)})</span></td>
                <td data-label="المتابعون" className="num">{int(l.followers)}</td>
                <td data-label="السعر" className="num">{money(l.price_cents)}</td>
                <td data-label="المخاطر"><span className={`badge ${l.fraud_score >= 50 ? 'danger' : l.fraud_score >= 25 ? 'warn' : 'vault'} num`}>{int(l.fraud_score)}</span>{l.open_cases > 0 && <span className="badge danger" style={{ marginInlineStart: 4 }}>اشتباه مفتوح</span>}</td>
                <td data-label="رمز التحقق"><span className={`badge ${CODE[l.code_check_status]?.[1]}`}>{CODE[l.code_check_status]?.[0]}</span></td>
                <td data-label="المراجع">{l.reviewer_name ?? <span className="muted">غير محجوز</span>}</td>
                <td data-label="أُرسل">{ago(l.submitted_at)}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </Loadable>
    </div>
  );
}
