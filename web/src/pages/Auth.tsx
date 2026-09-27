import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, post } from '../lib/api';
import { useSession } from '../lib/session';
import { Alert, Button, Field, Turnstile } from '../ui/kit';

function safeNext(n: string | null) {
  return n && n.startsWith('/') && !n.startsWith('//') ? n : '/';
}

export function Login() {
  const { setSession, config } = useSession();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string>();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const d = await post('/auth/login', { email, password, turnstileToken: token });
      setSession(d);
      nav(safeNext(params.get('next')), { replace: true });
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'تعذّر تسجيل الدخول.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container page narrow" style={{ maxInlineSize: 460 }}>
      <form className="card pad-lg stack" onSubmit={submit} noValidate>
        <div>
          <h1 style={{ fontSize: '1.6rem' }}>تسجيل الدخول</h1>
          <p className="muted small">مرحبًا بعودتك. جلستك محمية ومشفّرة.</p>
        </div>
        {err && <Alert kind="danger">{err}</Alert>}
        <Field label="البريد الإلكتروني" htmlFor="email">
          <input id="email" className="input ltr-input" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="كلمة المرور" htmlFor="password">
          <input id="password" className="input ltr-input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Turnstile siteKey={config?.turnstileSiteKey ?? null} action="login" onToken={setToken} />
        <Button type="submit" block loading={busy}>دخول</Button>
        <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>ليس لديك حساب؟ <Link to={`/signup${params.get('next') ? `?next=${encodeURIComponent(params.get('next')!)}` : ''}`}>أنشئ حسابًا</Link></p>
      </form>
    </div>
  );
}

export function Signup() {
  const { setSession, config } = useSession();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [f, setF] = useState({ displayName: '', email: '', password: '', acceptTerms: false, confirmAdult: false });
  const [token, setToken] = useState<string>();
  const [err, setErr] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setFields({});
    const local: Record<string, string> = {};
    if (f.displayName.trim().length < 2) local.displayName = 'الاسم قصير جدًا';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) local.email = 'بريد إلكتروني غير صالح';
    if (f.password.length < 10 || !/\d/.test(f.password)) local.password = '10 أحرف على الأقل وتتضمن أرقامًا وحروفًا';
    if (!f.acceptTerms) local.acceptTerms = 'يجب الموافقة على السياسات';
    if (!f.confirmAdult) local.confirmAdult = 'يجب أن يكون عمرك 18 عامًا أو أكثر';
    if (Object.keys(local).length) { setFields(local); return; }
    setBusy(true);
    try {
      const d = await post('/auth/signup', { ...f, turnstileToken: token });
      setSession(d);
      nav(safeNext(params.get('next')), { replace: true });
    } catch (e2) {
      if (e2 instanceof ApiError) { setErr(e2.message); setFields(e2.fields); } else setErr('تعذّر إنشاء الحساب.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container page narrow" style={{ maxInlineSize: 520 }}>
      <form className="card pad-lg stack" onSubmit={submit} noValidate>
        <div>
          <h1 style={{ fontSize: '1.6rem' }}>إنشاء حساب</h1>
          <p className="muted small">حساب واحد للبيع والشراء. مؤشر ثقتك يُبنى من معاملاتك الفعلية.</p>
        </div>
        {config && !config.flags.signups_enabled && <Alert kind="warn">التسجيل متوقف مؤقتًا.</Alert>}
        {err && <Alert kind="danger">{err}</Alert>}
        <Field label="الاسم الظاهر" htmlFor="dn" error={fields.displayName} hint="يظهر للطرف الآخر في الصفقات.">
          <input id="dn" className="input" autoComplete="nickname" value={f.displayName} onChange={(e) => set('displayName', e.target.value)} aria-invalid={!!fields.displayName} />
        </Field>
        <Field label="البريد الإلكتروني" htmlFor="em" error={fields.email}>
          <input id="em" className="input ltr-input" type="email" autoComplete="email" inputMode="email" value={f.email} onChange={(e) => set('email', e.target.value)} aria-invalid={!!fields.email} />
        </Field>
        <Field label="كلمة المرور" htmlFor="pw" error={fields.password} hint="10 أحرف على الأقل، حروف وأرقام.">
          <input id="pw" className="input ltr-input" type="password" autoComplete="new-password" value={f.password} onChange={(e) => set('password', e.target.value)} aria-invalid={!!fields.password} />
        </Field>
        <label className="check">
          <input type="checkbox" checked={f.acceptTerms} onChange={(e) => set('acceptTerms', e.target.checked)} />
          <span>أوافق على <Link to="/policies/terms" target="_blank">الشروط</Link> و<Link to="/policies/prohibited" target="_blank">سياسة المحظورات</Link>، وقرأت <Link to="/policies/disclaimer" target="_blank">إخلاء المسؤولية</Link>.</span>
        </label>
        {fields.acceptTerms && <span className="error small">{fields.acceptTerms}</span>}
        <label className="check">
          <input type="checkbox" checked={f.confirmAdult} onChange={(e) => set('confirmAdult', e.target.checked)} />
          <span>أؤكد أن عمري 18 عامًا أو أكثر.</span>
        </label>
        {fields.confirmAdult && <span className="error small">{fields.confirmAdult}</span>}
        <Turnstile siteKey={config?.turnstileSiteKey ?? null} action="signup" onToken={setToken} />
        <Button type="submit" block loading={busy}>إنشاء الحساب</Button>
        <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>لديك حساب؟ <Link to="/login">سجّل الدخول</Link></p>
      </form>
    </div>
  );
}
