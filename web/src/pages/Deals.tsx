import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Platform } from '../../../shared/domain';
import { ago, money } from '../lib/format';
import { useSession } from '../lib/session';
import { Icon, PlatformBadge } from '../ui/icons';
import { EscrowBadge, Empty, Loadable, useFetch } from '../ui/kit';
import { PageHeader } from '../ui/Shell';

const ACTIVE = ['pending_payment', 'held', 'transfer_in_progress', 'buyer_confirmation_window', 'disputed'];

export default function Deals() {
  const state = useFetch<{ items: any[] }>('/deals');
  const { user } = useSession();
  const nav = useNavigate();
  const [tab, setTab] = useState<'active' | 'closed'>('active');
  return (
    <div className="container page">
      <PageHeader title="صفقاتي" sub="مشترياتك ومبيعاتك مع حالة الضمان لكل منها." />
      <Loadable state={state}>
        {({ items }) => {
          const shown = items.filter((d) => (tab === 'active') === ACTIVE.includes(d.escrow_state));
          return (
            <div className="stack">
              <div className="tabs" role="tablist">
                <button role="tab" aria-selected={tab === 'active'} onClick={() => setTab('active')}>جارية<span className="pill-count num">{items.filter((d) => ACTIVE.includes(d.escrow_state)).length}</span></button>
                <button role="tab" aria-selected={tab === 'closed'} onClick={() => setTab('closed')}>مغلقة<span className="pill-count num">{items.filter((d) => !ACTIVE.includes(d.escrow_state)).length}</span></button>
              </div>
              {shown.length === 0 ? (
                <div className="card"><Empty icon={<Icon.Deal size={26} />} title={tab === 'active' ? 'لا صفقات جارية' : 'لا صفقات مغلقة'} action={<Link to="/listings" className="btn btn-primary">تصفح الحسابات</Link>} /></div>
              ) : (
                <div className="stack-sm">
                  {shown.map((d) => (
                    <button key={d.id} className="card row" style={{ textAlign: 'start', cursor: 'pointer', gap: 12, flexWrap: 'nowrap' }} onClick={() => nav(`/deals/${d.id}`)}>
                      <PlatformBadge platform={d.platform as Platform} />
                      <div className="grow">
                        <div className="row" style={{ gap: 8 }}><strong className="ltr">@{d.handle}</strong><span className={`badge ${d.buyer_id === user?.id ? 'info' : 'seal'}`}>{d.buyer_id === user?.id ? 'شراء' : 'بيع'}</span></div>
                        <div className="xs muted">{d.buyer_id === user?.id ? `البائع: ${d.seller_name}` : `المشتري: ${d.buyer_name}`} · آخر تحديث {ago(d.updated_at)}</div>
                        <div style={{ marginBlockStart: 6 }}><EscrowBadge state={d.escrow_state} /></div>
                      </div>
                      <div style={{ textAlign: 'end' }}><div className="price num" style={{ fontSize: '1.05rem' }}>{money(d.price_cents)}</div><Icon.ChevronForward size={18} /></div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }}
      </Loadable>
    </div>
  );
}
