import { Component, lazy, Suspense, type ReactNode } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { RequireAuth, Shell } from './ui/Shell';
import { Spinner } from './ui/kit';
import Home from './pages/Home';
import Browse from './pages/Browse';
import ListingDetail from './pages/ListingDetail';
import { Login, Signup } from './pages/Auth';

const Sell = lazy(() => import('./pages/Sell'));
const SellEditor = lazy(() => import('./pages/SellEditor'));
const Deals = lazy(() => import('./pages/Deals'));
const DealRoom = lazy(() => import('./pages/DealRoom'));
const Messages = lazy(() => import('./pages/Messages'));
const DisputePage = lazy(() => import('./pages/Dispute'));
const Wallet = lazy(() => import('./pages/Wallet'));
const Profile = lazy(() => import('./pages/Profile'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Account = lazy(() => import('./pages/Account'));
const Policies = lazy(() => import('./pages/Policies'));
const SandboxCheckout = lazy(() => import('./pages/SandboxCheckout'));
const Admin = lazy(() => import('./pages/admin/Admin'));

/** Catches failed lazy-chunk loads (flaky/offline networks) and render errors, offering a retry instead of a blank screen. */
class PageBoundary extends Component<{ children: ReactNode; resetKey: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(prev: { resetKey: string }) { if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false }); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="container page narrow">
        <div className="card empty" role="alert">
          <h2>تعذّر تحميل الصفحة</h2>
          <p>قد يكون الاتصال ضعيفًا أو منقطعًا. لم تُنفَّذ أي عملية.</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>إعادة المحاولة</button>
        </div>
      </div>
    );
  }
}

function NotFound() {
  return (
    <div className="container page narrow">
      <div className="card empty">
        <h1>الصفحة غير موجودة</h1>
        <p>ربما نُقل الرابط أو حُذف.</p>
        <Link className="btn btn-primary" to="/">العودة للرئيسية</Link>
      </div>
    </div>
  );
}

export default function App() {
  const loc = useLocation();
  return (
    <Shell>
      <PageBoundary resetKey={loc.pathname}>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/listings" element={<Browse />} />
          <Route path="/listings/:id" element={<ListingDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/u/:id" element={<Profile />} />
          <Route path="/policies/:page" element={<Policies />} />
          <Route path="/sell" element={<RequireAuth><Sell /></RequireAuth>} />
          <Route path="/sell/new" element={<RequireAuth><SellEditor /></RequireAuth>} />
          <Route path="/sell/:id" element={<RequireAuth><SellEditor /></RequireAuth>} />
          <Route path="/deals" element={<RequireAuth><Deals /></RequireAuth>} />
          <Route path="/deals/:id" element={<RequireAuth><DealRoom /></RequireAuth>} />
          <Route path="/messages" element={<RequireAuth><Messages /></RequireAuth>} />
          <Route path="/messages/:id" element={<RequireAuth><Messages /></RequireAuth>} />
          <Route path="/disputes/:id" element={<RequireAuth><DisputePage /></RequireAuth>} />
          <Route path="/wallet" element={<RequireAuth><Wallet /></RequireAuth>} />
          <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
          <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
          <Route path="/checkout/sandbox/:dealId" element={<RequireAuth><SandboxCheckout /></RequireAuth>} />
          <Route path="/admin/*" element={<RequireAuth perm="admin.access"><Admin /></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </PageBoundary>
    </Shell>
  );
}
