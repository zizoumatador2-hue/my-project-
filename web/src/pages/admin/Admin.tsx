import { lazy, type ReactNode } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { ESCROW_LABELS, type EscrowState } from '../../../../shared/domain';
import { int, money } from '../../lib/format';
import { useSession } from '../../lib/session';
import { Icon } from '../../ui/icons';
import { Loadable, useFetch } from '../../ui/kit';

const Reviews = lazy(() => import('./Reviews'));
const ReviewDetail = lazy(() => import('./ReviewDetail'));
const Fraud = lazy(() => import('./Fraud'));
const AdminDeals = lazy(() => import('./Deals'));
const AdminDealDetail = lazy(() => import('./DealDetail'));
const Disputes = lazy(() => import('./Disputes'));
const DisputeDetail = lazy(() => import('./DisputeDetail'));
const Withdrawals = lazy(() => import('./Withdrawals'));
const LocalPayments = lazy(() => import('./LocalPayments'));
const Users = lazy(() => import('./Users'));
const UserDetail = lazy(() => import('./UserDetail'));
const Reports = lazy(() => import('./Reports'));
const Audit = lazy(() => import('./Audit'));
const SettingsPage = lazy(() => import('./Settings'));

function Overview() {
  const s = useFetch<any>('/admin/overview');
  const { can } = useSession();
  return (
    <Loadable state={s}>
      {(o) => (
        <div className="stack">
          <h1 style={{ fontSize: '1.5rem' }}>نظرة عامة على العمليات</h1>
          <div className="grid cols-4">
            {can('listings.review') && <Link to="/admin/reviews" className="card metric metric-card"><span className="k">إعلانات بانتظار المراجعة</span><span className="v num">{int(o.pendingReviews)}</span><span className="xs muted">+{int(o.needsEvidence)} بانتظار أدلة</span></Link>}
            {can('fraud.manage') && <Link to="/admin/fraud" className="card metric metric-card"><span className="k">حالات اشتباه مفتوحة</span><span className="v num" style={{ color: o.openFraud ? 'var(--danger)' : undefined }}>{int(o.openFraud)}</span></Link>}
            {can('disputes.manage') && <Link to="/admin/disputes" className="card metric metric-card"><span className="k">نزاعات نشطة</span><span className="v num">{int(o.openDisputes)}</span></Link>}
            {can('deals.transfer_verify') && <Link to="/admin/deals?state=needs_verify" className="card metric metric-card"><span className="k">صفقات تنتظر اعتماد النقل</span><span className="v num">{int(o.awaitingVerify)}</span></Link>}
 {can('withdrawals.manage') && <Link to="/admin/local-payments" className="card metric metric-card"><span className="k">تحويلات BaridiMob / CCP للتحقق</span><span className="v num">{int(o.pendingProofs)}</span><span className="xs muted">{int(o.pendingRefunds)} استرداد يدوي بانتظار التنفيذ</span></Link>}
            {can('withdrawals.manage') && <Link to="/admin/withdrawals" className="card metric metric-card"><span className="k">سحوبات للمراجعة</span><span className="v num">{int(o.pendingWithdrawals)}</span><span className="xs muted">{int(o.approvedWithdrawals)} معتمدة بانتظار التحويل</span></Link>}
            {can('reports.view') && <Link to="/admin/reports" className="card metric metric-card"><span className="k">حجم المبيعات (30 يومًا)</span><span className="v num">{money(o.gmv30)}</span><span className="xs muted">عمولة {money(o.commission30)}</span></Link>}
          </div>
          {can('deals.view') && (
            <div className="card">
              <h2 style={{ fontSize: '1.1rem' }}>الصفقات حسب حالة الضمان</h2>
              <div className="table-wrap"><table className="table responsive">
                <thead><tr><th>الحالة</th><th className="num">العدد</th><th className="num">القيمة</th></tr></thead>
                <tbody>{o.byState.map((r: any) => (
                  <tr key={r.escrow_state}><td data-label="الحالة"><Link to={`/admin/deals?state=${r.escrow_state}`}>{ESCROW_LABELS[r.escrow_state as EscrowState]}</Link></td><td data-label="العدد" className="num">{int(r.n)}</td><td data-label="القيمة" className="num">{money(r.amount)}</td></tr>
                ))}</tbody>
              </table></div>
            </div>
          )}
        </div>
      )}
    </Loadable>
  );
}

export default function Admin() {
  const { can } = useSession();
  const items: Array<[string, string, ReactNode, boolean]> = [
    ['/admin', 'نظرة عامة', <Icon.Chart size={18} />, true],
    ['/admin/reviews', 'مراجعة الإعلانات', <Icon.Shield size={18} />, can('listings.review')],
    ['/admin/fraud', 'الاشتباه والاحتيال', <Icon.Flag size={18} />, can('fraud.manage')],
    ['/admin/deals', 'صفقات الضمان', <Icon.Lock size={18} />, can('deals.view')],
    ['/admin/disputes', 'النزاعات', <Icon.Gavel size={18} />, can('disputes.manage')],
    ['/admin/local-payments', 'المدفوعات المحلية', <Icon.Deal size={18} />, can('withdrawals.manage')],
    ['/admin/withdrawals', 'السحوبات', <Icon.Wallet size={18} />, can('withdrawals.manage')],
    ['/admin/reports', 'التقارير', <Icon.Chart size={18} />, can('reports.view')],
    ['/admin/users', 'المستخدمون والأدوار', <Icon.Users size={18} />, can('users.manage')],
    ['/admin/audit', 'سجل التدقيق', <Icon.List size={18} />, can('audit.view')],
    ['/admin/settings', 'الإعدادات', <Icon.Settings size={18} />, can('settings.edit')],
  ];
  return (
    <div className="container page">
      <div className="admin-shell">
        <nav className="admin-nav" aria-label="لوحة العمليات">
          {items.filter((i) => i[3]).map(([to, label, icon]) => <NavLink key={to} to={to} end={to === '/admin'}>{icon}{label}</NavLink>)}
        </nav>
        <div style={{ minInlineSize: 0 }}>
          <Routes>
            <Route index element={<Overview />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="reviews/:id" element={<ReviewDetail />} />
            <Route path="fraud" element={<Fraud />} />
            <Route path="deals" element={<AdminDeals />} />
            <Route path="deals/:id" element={<AdminDealDetail />} />
            <Route path="disputes" element={<Disputes />} />
            <Route path="disputes/:id" element={<DisputeDetail />} />
            <Route path="withdrawals" element={<Withdrawals />} />
            <Route path="local-payments" element={<LocalPayments />} />
            <Route path="reports" element={<Reports />} />
            <Route path="users" element={<Users />} />
            <Route path="users/:id" element={<UserDetail />} />
            <Route path="audit" element={<Audit />} />
            <Route path="settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
