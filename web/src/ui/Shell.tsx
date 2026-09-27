import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../lib/session';
import { BrandMark, Icon } from './icons';
import { Spinner } from './kit';

function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

export function Shell({ children }: { children: ReactNode }) {
  const { user, unread, logout, can } = useSession();
  const online = useOnline();
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);

  return (
    <>
      <a href="#main" className="visually-hidden">تخطَّ إلى المحتوى</a>
      <header className="topbar">
        <div className="container">
          <Link to="/" className="brand" aria-label="TrustTransfer — الرئيسية">
            <BrandMark />
            <span>TrustTransfer<small>سوق الحسابات الموثّق</small></span>
          </Link>
          <nav className="nav-desktop" aria-label="التنقل الرئيسي">
            <NavLink to="/listings">تصفح الحسابات</NavLink>
            <NavLink to="/sell">بيع حساب</NavLink>
            {user && <NavLink to="/deals">صفقاتي</NavLink>}
            {user && <NavLink to="/messages">الرسائل</NavLink>}
            {user && <NavLink to="/wallet">المحفظة</NavLink>}
            {can('admin.access') && <NavLink to="/admin">لوحة العمليات</NavLink>}
          </nav>
          <div className="topbar-actions">
            {user ? (
              <>
                <Link to="/notifications" className="icon-btn" aria-label={`الإشعارات${unread ? ` (${unread} غير مقروء)` : ''}`}>
                  <Icon.Bell />
                  {unread > 0 && <span className="dot-badge num">{unread > 9 ? '9+' : unread}</span>}
                </Link>
                <Link to="/account" className="icon-btn" aria-label="حسابي"><Icon.User /></Link>
                <button className="icon-btn" aria-label="تسجيل الخروج" onClick={async () => { await logout(); nav('/'); }}><Icon.Logout /></button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">دخول</Link>
                <Link to="/signup" className="btn btn-primary btn-sm">إنشاء حساب</Link>
              </>
            )}
          </div>
        </div>
      </header>
      {!online && <div className="offline-bar" role="status">أنت غير متصل بالإنترنت — ستُستأنف العمليات تلقائيًا عند عودة الاتصال.</div>}
      <main id="main">{children}</main>
      <footer className="footer">
        <div className="container row between">
          <span>© {new Date().getFullYear()} TrustTransfer — منصة وساطة وضمان، ولسنا جهة تابعة لأي منصة تواصل اجتماعي.</span>
          <nav className="row" aria-label="السياسات">
            <Link to="/policies/disclaimer">إخلاء المسؤولية</Link>
            <Link to="/policies/terms">الشروط</Link>
            <Link to="/policies/prohibited">المحظورات</Link>
            <Link to="/policies/escrow">كيف يعمل الضمان</Link>
            <Link to="/policies/privacy">الخصوصية</Link>
          </nav>
        </div>
      </footer>
      <nav className="tabbar" aria-label="التنقل السفلي">
        <NavLink to="/" end><Icon.Home size={22} />الرئيسية</NavLink>
        <NavLink to="/listings"><Icon.Search size={22} />تصفح</NavLink>
        {user ? (
          <>
            <NavLink to="/deals"><Icon.Deal size={22} />صفقاتي</NavLink>
            <NavLink to="/messages"><Icon.Chat size={22} />الرسائل</NavLink>
            {can('admin.access') ? <NavLink to="/admin"><Icon.Settings size={22} />العمليات</NavLink> : <NavLink to="/wallet"><Icon.Wallet size={22} />المحفظة</NavLink>}
          </>
        ) : (
          <>
            <NavLink to="/sell"><Icon.Plus size={22} />بيع</NavLink>
            <NavLink to="/policies/escrow"><Icon.Shield size={22} />الضمان</NavLink>
            <NavLink to="/login"><Icon.User size={22} />دخول</NavLink>
          </>
        )}
      </nav>
    </>
  );
}

export function RequireAuth({ children, perm }: { children: ReactNode; perm?: Parameters<ReturnType<typeof useSession>['can']>[0] }) {
  const { user, ready, can } = useSession();
  const loc = useLocation();
  if (!ready) return <Spinner />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (perm && !can(perm)) return <div className="container page"><div className="card empty"><h2>غير مصرح</h2><p>ليست لديك صلاحية للوصول إلى هذه الصفحة.</p></div></div>;
  return <>{children}</>;
}

export function PageHeader({ title, sub, back, actions }: { title: ReactNode; sub?: ReactNode; back?: string; actions?: ReactNode }) {
  return (
    <div className="row between" style={{ marginBlockEnd: 16, alignItems: 'flex-end' }}>
      <div className="grow">
        {back && <Link to={back} className="row small" style={{ gap: 4, marginBlockEnd: 6 }}><Icon.ChevronBack size={16} /> رجوع</Link>}
        <h1 style={{ marginBlockEnd: sub ? 4 : 0 }}>{title}</h1>
        {sub && <p className="muted" style={{ margin: 0 }}>{sub}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}
