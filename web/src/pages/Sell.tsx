import { Link, useNavigate } from 'react-router-dom';
import { LISTING_STATUS_LABELS, type Platform } from '../../../shared/domain';
import { ago, int, money } from '../lib/format';
import { Icon, PlatformBadge } from '../ui/icons';
import { Button, Empty, Loadable, useFetch } from '../ui/kit';
import { PageHeader } from '../ui/Shell';

export const STATUS_TONE: Record<string, string> = {
  draft: '', pending_review: 'info', needs_evidence: 'warn', approved: 'vault', rejected: 'danger', reserved: 'seal', sold: 'vault', withdrawn: '',
};

export default function Sell() {
  const state = useFetch<{ items: any[] }>('/me/listings');
  const nav = useNavigate();
  return (
    <div className="container page">
      <PageHeader title="إعلاناتي" sub="كل إعلان يمر بتحقق ملكية ومراجعة بشرية قبل النشر." actions={<Button onClick={() => nav('/sell/new')}><Icon.Plus size={18} /> إعلان جديد</Button>} />
      <div className="card flat stack-sm" style={{ marginBlockEnd: 16 }}>
        <strong>ما تحتاجه قبل البدء</strong>
        <ul className="small muted" style={{ margin: 0, paddingInlineStart: 20 }}>
          <li>إمكانية تعديل النبذة أو الاسم الظاهر للحساب مؤقتًا لوضع رمز التحقق.</li>
          <li>لقطة شاشة من إعدادات الحساب (تُظهر صلاحية المالك)، ولقطة من الإحصاءات (المتابعون والتفاعل والجمهور).</li>
          <li>تُشفَّر اللقطات فور رفعها ولا يراها إلا المراجع المكلّف بإعلانك.</li>
        </ul>
      </div>
      <Loadable state={state}>
        {({ items }) => items.length === 0 ? (
          <div className="card"><Empty icon={<Icon.Plus size={26} />} title="لا توجد إعلانات بعد" action={<Link to="/sell/new" className="btn btn-primary">أنشئ إعلانك الأول</Link>}>ابدأ بإضافة بيانات الحساب، ثم أثبت ملكيته.</Empty></div>
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead><tr><th>الحساب</th><th>الحالة</th><th className="num">السعر</th><th>الأدلة</th><th>آخر تحديث</th><th></th></tr></thead>
              <tbody>
                {items.map((l) => (
                  <tr key={l.id} className="clickable" onClick={() => nav(`/sell/${l.id}`)}>
                    <td data-label="الحساب"><div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}><PlatformBadge platform={l.platform as Platform} small /><div><div className="ltr">@{l.handle}</div><div className="xs muted">{l.title}</div></div></div></td>
                    <td data-label="الحالة"><span className={`badge ${STATUS_TONE[l.status]}`}>{LISTING_STATUS_LABELS[l.status]}</span></td>
                    <td data-label="السعر" className="num">{money(l.price_cents)}</td>
                    <td data-label="الأدلة" className="num">{int(l.evidence_count)} ملف</td>
                    <td data-label="آخر تحديث">{ago(l.submitted_at ?? l.created_at)}</td>
                    <td data-label=""><Link to={`/sell/${l.id}`} onClick={(e) => e.stopPropagation()} className="btn btn-ghost btn-sm">فتح <Icon.ChevronForward size={16} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Loadable>
    </div>
  );
}
