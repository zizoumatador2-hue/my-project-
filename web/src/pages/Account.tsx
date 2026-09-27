import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ROLE_LABELS } from '../../../shared/domain';
import { ApiError, post } from '../lib/api';
import { useSession } from '../lib/session';
import { Alert, Button, Field, useToast } from '../ui/kit';
import { PageHeader } from '../ui/Shell';

export default function Account() {
  const { user } = useSession();
  const toast = useToast();
  const [f, setF] = useState({ current: '', next: '' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('theme') ?? 'auto'; } catch { return 'auto'; } });

  function applyTheme(t: string) {
    setTheme(t);
    try { localStorage.setItem('theme', t); } catch { /* storage unavailable */ }
    if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
  }

  async function change() {
    setErr(null); setBusy(true);
    try { await post('/auth/password', f); toast('success', 'تم تغيير كلمة المرور وتسجيل الخروج من الأجهزة الأخرى'); setF({ current: '', next: '' }); }
    catch (e) { setErr(e instanceof ApiError ? Object.values(e.fields)[0] ?? e.message : 'تعذّر التغيير'); }
    finally { setBusy(false); }
  }

  return (
    <div className="container page narrow">
      <PageHeader title="حسابي" />
      <div className="stack">
        <div className="card stack-sm">
          <dl className="kv">
            <dt>الاسم</dt><dd>{user?.display_name}</dd>
            <dt>البريد</dt><dd className="ltr">{user?.email}</dd>
            <dt>الدور</dt><dd>{user && ROLE_LABELS[user.role]}</dd>
          </dl>
          <div className="row"><Link to={`/u/${user?.id}`} className="btn btn-secondary btn-sm">ملفي العام ومؤشر الثقة</Link><Link to="/sell" className="btn btn-secondary btn-sm">إعلاناتي</Link></div>
        </div>
        <div className="card stack">
          <h2 style={{ fontSize: '1.1rem', margin: 0 }}>المظهر</h2>
          <div className="seg" role="group" aria-label="المظهر">
            {[['auto', 'تلقائي'], ['light', 'فاتح'], ['dark', 'داكن']].map(([k, l]) => <button key={k} aria-pressed={theme === k} onClick={() => applyTheme(k)}>{l}</button>)}
          </div>
        </div>
        <div className="card stack">
          <h2 style={{ fontSize: '1.1rem', margin: 0 }}>تغيير كلمة المرور</h2>
          {err && <Alert kind="danger">{err}</Alert>}
          <Field label="كلمة المرور الحالية" htmlFor="cur"><input id="cur" className="input ltr-input" type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF((x) => ({ ...x, current: e.target.value }))} /></Field>
          <Field label="كلمة المرور الجديدة" htmlFor="nxt" hint="10 أحرف على الأقل، حروف وأرقام."><input id="nxt" className="input ltr-input" type="password" autoComplete="new-password" value={f.next} onChange={(e) => setF((x) => ({ ...x, next: e.target.value }))} /></Field>
          <div className="row end"><Button loading={busy} disabled={!f.current || f.next.length < 10} onClick={change}>تغيير</Button></div>
        </div>
      </div>
    </div>
  );
}
