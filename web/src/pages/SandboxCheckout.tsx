import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ApiError, post } from '../lib/api';
import { dzd, money } from '../lib/format';
import { useSession } from '../lib/session';
import { Icon } from '../ui/icons';
import { Alert, Button, Loadable, useFetch } from '../ui/kit';

/**
 * Local/dev payment page. Stands in for Stripe Checkout when PAYMENT_PROVIDER=sandbox: it emits a *signed*
 * Stripe-format webhook through the same verification path. It is refused by the server in production.
 */
export default function SandboxCheckout() {
  const { dealId } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { config } = useSession();
  const state = useFetch<any>(`/deals/${dealId}`);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(outcome: 'success' | 'decline' | 'expire') {
    setErr(null);
    setBusy(outcome);
    try {
      await post(`/payments/sandbox/${dealId}`, { sessionId: params.get('session'), outcome });
      nav(`/deals/${dealId}${outcome === 'success' ? '?paid=1' : outcome === 'expire' ? '' : ''}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'فشل الدفع');
    } finally {
      setBusy(null);
    }
  }

  if (config && config.paymentProvider !== 'sandbox') return <div className="container page narrow"><Alert kind="danger">صفحة الدفع التجريبية غير متاحة.</Alert></div>;
  return (
    <div className="container page narrow" style={{ maxInlineSize: 520 }}>
      <Loadable state={state}>
        {({ deal, listing }) => (
          <div className="card pad-lg stack">
            <Alert kind="warn" title="بيئة تطوير — مزوّد دفع تجريبي">لا تُحصَّل أموال حقيقية. في الإنتاج تُستبدل هذه الصفحة بصفحة Stripe Checkout المستضافة.</Alert>
            <div className="escrow-banner">
              <div className="lock"><Icon.Lock size={24} /></div>
              <div><div className="state">{deal.payment_provider === 'chargily' ? `Chargily Pay · ${deal.payment_method === 'cib' ? 'CIB' : 'Edahabia'}` : 'الدفع إلى الضمان'} · <span className="ltr">@{listing.handle}</span></div><div className="amount num">{deal.pay_currency === 'DZD' ? dzd(deal.pay_amount) : money(deal.price_cents, true)}</div></div>
            </div>
            {deal.escrow_state !== 'pending_payment' ? <Alert kind="info">هذه الصفقة لم تعد بانتظار الدفع.</Alert> : (
              <>
                <div className="panel stack-sm small">
                  <div className="row between"><span>بطاقة اختبار</span><span className="ltr num">{deal.payment_provider === 'chargily' ? '6280 5800 0000 0000' : '4242 4242 4242 4242'}</span></div>
                  <div className="row between"><span>الصلاحية / CVC</span><span className="ltr num">12/34 · 123</span></div>
                </div>
                {err && <Alert kind="danger">{err}</Alert>}
                <Button block loading={busy === 'success'} disabled={!!busy} onClick={() => run('success')}>ادفع {deal.pay_currency === 'DZD' ? dzd(deal.pay_amount) : money(deal.price_cents, true)}</Button>
                <div className="row">
                  <Button variant="secondary" size="sm" disabled={!!busy} loading={busy === 'decline'} onClick={() => run('decline')}>محاكاة رفض البطاقة</Button>
                  <Button variant="ghost" size="sm" disabled={!!busy} loading={busy === 'expire'} onClick={() => run('expire')}>محاكاة انتهاء الجلسة</Button>
                </div>
              </>
            )}
          </div>
        )}
      </Loadable>
    </div>
  );
}
