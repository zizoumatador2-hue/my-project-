import { Link, useParams } from 'react-router-dom';
import { ESCROW_LABELS, type EscrowState, type Platform } from '../../../shared/domain';
import { ago, int } from '../lib/format';
import { useSession } from '../lib/session';
import { ChatThread } from '../ui/ChatThread';
import { Icon, PlatformBadge } from '../ui/icons';
import { Empty, Loadable, useFetch } from '../ui/kit';
import { PageHeader } from '../ui/Shell';

export default function Messages() {
  const { id } = useParams();
  const list = useFetch<{ items: any[] }>('/conversations', [id]);
  const { user } = useSession();
  const current = list.data?.items.find((c) => c.id === id);

  return (
    <div className="container page">
      <PageHeader title="الرسائل" sub="كل المحادثات مرتبطة بإعلان أو صفقة، ومحفوظة لأغراض التحكيم." />
      <div className={id ? 'split' : ''}>
        {id && (
            <div className="stack">
              <div className="row between">
                <Link to="/messages" className="row small" style={{ gap: 4 }}><Icon.ChevronBack size={16} /> كل المحادثات</Link>
                {current?.deal_id ? <Link to={`/deals/${current.deal_id}`} className="btn btn-secondary btn-sm">غرفة الصفقة</Link> : current && <Link to={`/listings/${current.listing_id}`} className="btn btn-secondary btn-sm">عرض الإعلان</Link>}
              </div>
              {current && (
                <div className="row" style={{ gap: 10 }}>
                  <PlatformBadge platform={current.platform as Platform} small />
                  <div><strong>{current.counterpart}</strong><div className="xs muted">{current.title}</div></div>
                </div>
              )}
              <ChatThread conversationId={id} handle={current?.handle} />
            </div>
        )}
        <aside className={id ? 'sticky hide-mobile' : ''}>
          <Loadable state={list}>
            {({ items }) => items.length === 0 ? (
              <div className="card"><Empty icon={<Icon.Chat size={26} />} title="لا توجد محادثات" action={<Link to="/listings" className="btn btn-primary">تصفح الحسابات</Link>}>ابدأ محادثة من صفحة أي إعلان.</Empty></div>
            ) : (
              <div className="card" style={{ padding: 6 }}>
                {items.map((c) => (
                  <Link key={c.id} to={`/messages/${c.id}`} className="row" aria-current={c.id === id ? 'page' : undefined}
                    style={{ padding: 10, borderRadius: 10, color: 'var(--text)', background: c.id === id ? 'var(--surface-2)' : undefined, flexWrap: 'nowrap' }}>
                    <PlatformBadge platform={c.platform as Platform} small />
                    <div className="grow">
                      <div className="row between" style={{ flexWrap: 'nowrap' }}><strong className="small">{c.counterpart}</strong><span className="xs muted nowrap">{ago(c.last_message_at)}</span></div>
                      <div className="xs muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.buyer_id === user?.id ? 'تشتري' : 'تبيع'} · {c.title}</div>
                      <div className="xs" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.last_body ?? '—'}</div>
                    </div>
                    {c.unread > 0 && <span className="dot-badge num" style={{ position: 'static' }}>{int(c.unread)}</span>}
                    {c.deal_state && <span className="badge">{ESCROW_LABELS[c.deal_state as EscrowState]}</span>}
                  </Link>
                ))}
              </div>
            )}
          </Loadable>
        </aside>
      </div>
    </div>
  );
}
