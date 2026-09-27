import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { ESCROW_LABELS, type EscrowState } from '../../../shared/domain';
import { ApiError, get } from '../lib/api';
import { Icon } from './icons';

// ---------- Buttons ----------
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline' | 'dark'; size?: 'sm'; block?: boolean; loading?: boolean };
export function Button({ variant = 'primary', size, block, loading, children, className = '', disabled, ...rest }: BtnProps) {
  return (
    <button className={`btn btn-${variant}${size ? ' btn-' + size : ''}${block ? ' btn-block' : ''} ${className}`} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <span className="spinner" aria-hidden />}
      {children}
    </button>
  );
}

export const Spinner = ({ label = 'جارٍ التحميل' }: { label?: string }) => (
  <div className="row" role="status" style={{ justifyContent: 'center', padding: 32, color: 'var(--muted)' }}>
    <span className="spinner" aria-hidden /> <span className="small">{label}…</span>
  </div>
);

export function Alert({ kind = 'info', title, children }: { kind?: 'info' | 'warn' | 'danger' | 'vault'; title?: ReactNode; children?: ReactNode }) {
  const I = kind === 'danger' || kind === 'warn' ? Icon.Alert : kind === 'vault' ? Icon.Shield : Icon.Info;
  return (
    <div className={`alert ${kind}`} role={kind === 'danger' ? 'alert' : undefined}>
      <I size={18} />
      <div>
        {title && <strong>{title}</strong>}
        {children && <div className="body">{children}</div>}
      </div>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof ApiError ? error.message : 'حدث خطأ غير متوقع.';
  const notFound = error instanceof ApiError && error.status === 404;
  return (
    <div className="card flat empty" role="alert">
      <div className="ico"><Icon.Alert size={26} /></div>
      <h3>{notFound ? 'غير موجود' : 'تعذّر التحميل'}</h3>
      <p>{msg}</p>
      {onRetry && !notFound && <Button variant="secondary" onClick={onRetry}><Icon.Refresh size={16} /> إعادة المحاولة</Button>}
    </div>
  );
}

export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="ico">{icon ?? <Icon.List size={26} />}</div>
      <h3 style={{ color: 'var(--text)' }}>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

// ---------- Data loading ----------
export function useFetch<T = any>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(!!path);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    if (!path) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    get<T>(path, ctrl.signal)
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { if ((e as ApiError).code !== 'cancelled') { setError(e); setLoading(false); } });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, ...deps]);
  return { data, error, loading, reload, setData };
}

export function Loadable<T>({ state, children, skeleton }: { state: { data: T | null; error: unknown; loading: boolean; reload: () => void }; children: (d: T) => ReactNode; skeleton?: ReactNode }) {
  if (state.error && !state.data) return <ErrorState error={state.error} onRetry={state.reload} />;
  if (!state.data) return <>{skeleton ?? <Spinner />}</>;
  return <>{children(state.data)}</>;
}

// ---------- Toasts ----------
interface Toast { id: number; kind: 'success' | 'error' | 'info'; text: string }
const ToastCtx = createContext<(kind: Toast['kind'], text: string) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x.slice(-2), { id, kind, text }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), kind === 'error' ? 6000 : 3800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-host" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
            <span className="ico">{t.kind === 'success' ? <Icon.Check size={18} /> : t.kind === 'error' ? <Icon.Alert size={18} /> : <Icon.Info size={18} />}</span>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/** Wraps an async action with loading state and error toast. Returns [run, busy]. */
export function useAction<A extends unknown[]>(fn: (...a: A) => Promise<unknown>, opts: { success?: string; onError?: (e: ApiError) => boolean | void } = {}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (...a: A) => {
    setBusy(true);
    try {
      const r = await fn(...a);
      if (opts.success) toast('success', opts.success);
      return r;
    } catch (e) {
      const handled = opts.onError?.(e as ApiError);
      if (!handled) toast('error', e instanceof ApiError ? e.message : 'حدث خطأ غير متوقع.');
      return undefined;
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fn]);
  return [run, busy] as const;
}

// ---------- Modal ----------
export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  // Keep the latest onClose without re-running the focus effect on every render (callers pass inline arrows).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      if (ref.current && !ref.current.contains(document.activeElement)) ref.current.querySelector<HTMLElement>('input, textarea, select, button:not([data-close])')?.focus();
    }, 30);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus?.(); };
  }, [open]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="row between" style={{ marginBlockEnd: 12 }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="إغلاق" data-close><Icon.X size={18} /></button>
        </div>
        <div className="stack">{children}</div>
        {footer && <div className="row end" style={{ marginBlockStart: 18 }}>{footer}</div>}
      </div>
    </div>
  );
}

// ---------- Forms ----------
export function Field({ label, hint, error, children, htmlFor, className }: { label: ReactNode; hint?: ReactNode; error?: string; children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <div className={`field ${className ?? ''}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? <span className="error" role="alert">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

// ---------- Trust ----------
export function TrustSeal({ score, size, label }: { score: number; size?: 'sm'; label?: string }) {
  const tone = score < 40 ? 'low' : score < 65 ? 'mid' : '';
  return (
    <div className={`tseal ${size ?? ''} ${tone}`} style={{ ['--p' as string]: score }} role="img" aria-label={`${label ?? 'مؤشر الثقة'}: ${score} من 100`}>
      <span className="num">{score}</span>
    </div>
  );
}

// ---------- Escrow vault timeline ----------
const VAULT_ORDER: EscrowState[] = ['pending_payment', 'held', 'transfer_in_progress', 'buyer_confirmation_window', 'released'];
const VAULT_LABELS = ['الدفع', 'الحجز', 'النقل', 'التأكيد', 'التحرير'];
export function EscrowVault({ state, prev }: { state: EscrowState; prev?: string | null }) {
  const terminalAlt = state === 'refunded' || state === 'cancelled' || state === 'split';
  const effective = state === 'disputed' ? ((prev as EscrowState) ?? 'held') : state;
  const idx = terminalAlt ? -1 : VAULT_ORDER.indexOf(effective);
  return (
    <div className="stack-sm">
      <ol className="vault-track" aria-label={`حالة الضمان: ${ESCROW_LABELS[state]}`}>
        {VAULT_LABELS.map((l, i) => {
          const done = state === 'released' ? true : i < idx;
          const current = !done && i === idx;
          return (
            <li key={l} className={`vault-step ${done ? 'done' : ''} ${current ? 'current' : ''} ${current && state === 'disputed' ? 'is-alert' : ''}`} aria-current={current ? 'step' : undefined}>
              <span className="node">{done && <Icon.Check size={16} />}</span>
              <span>{l}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function EscrowBadge({ state }: { state: EscrowState }) {
  const kind: Record<EscrowState, string> = {
    pending_payment: 'warn', held: 'vault', transfer_in_progress: 'info', buyer_confirmation_window: 'seal', released: 'vault',
    disputed: 'danger', refunded: '', split: 'seal', cancelled: '',
  };
  return <span className={`badge ${kind[state]}`}><span className="dot" />{ESCROW_LABELS[state]}</span>;
}

// ---------- Turnstile ----------
declare global {
  interface Window { turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void; remove: (id: string) => void } }
}
let scriptPromise: Promise<void> | null = null;
function loadTurnstile() {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { scriptPromise = null; reject(new Error('turnstile')); };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

/** Renders the Cloudflare Turnstile widget when a site key is configured; in local dev (no key) renders nothing. */
export function Turnstile({ siteKey, action, onToken }: { siteKey: string | null; action: string; onToken: (t: string | undefined) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let id: string | undefined;
    let cancelled = false;
    loadTurnstile().then(() => {
      if (cancelled || !ref.current || !window.turnstile) return;
      id = window.turnstile.render(ref.current, {
        sitekey: siteKey, action, language: 'ar', theme: 'auto',
        callback: (t: string) => onToken(t), 'expired-callback': () => onToken(undefined), 'error-callback': () => onToken(undefined),
      });
    }).catch(() => setFailed(true));
    return () => { cancelled = true; if (id && window.turnstile) window.turnstile.remove(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, action]);
  if (!siteKey) return null;
  return (
    <div>
      <div ref={ref} />
      {failed && <p className="error small">تعذّر تحميل التحقق من الحماية. تحقق من الاتصال وأعد تحميل الصفحة.</p>}
    </div>
  );
}
