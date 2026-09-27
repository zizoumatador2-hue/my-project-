import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { post } from '../lib/api';
import { ago } from '../lib/format';
import { useSession } from '../lib/session';
import { Icon } from '../ui/icons';
import { Empty, Loadable, useFetch } from '../ui/kit';
import { PageHeader } from '../ui/Shell';

export default function Notifications() {
  const state = useFetch<{ items: any[] }>('/notifications');
  const { refresh } = useSession();
  useEffect(() => {
    if (state.data?.items.some((n) => !n.read_at)) post('/notifications/read').then(refresh).catch(() => {});
  }, [state.data, refresh]);
  return (
    <div className="container page narrow">
      <PageHeader title="الإشعارات" />
      <Loadable state={state}>
        {({ items }) => items.length === 0 ? <div className="card"><Empty icon={<Icon.Bell size={26} />} title="لا إشعارات" /></div> : (
          <div className="card" style={{ padding: 6 }}>
            {items.map((n) => {
              const inner = (
                <div className="row" style={{ padding: 12, gap: 12, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                  <span style={{ inlineSize: 8, blockSize: 8, borderRadius: 99, background: n.read_at ? 'transparent' : 'var(--seal)', marginBlockStart: 9, flex: 'none' }} />
                  <div className="grow"><strong className="small">{n.title}</strong><div className="small muted">{n.body}</div><div className="xs faint">{ago(n.created_at)}</div></div>
                </div>
              );
              return n.link ? <Link key={n.id} to={n.link} style={{ color: 'var(--text)', display: 'block', borderRadius: 10 }}>{inner}</Link> : <div key={n.id}>{inner}</div>;
            })}
          </div>
        )}
      </Loadable>
    </div>
  );
}
