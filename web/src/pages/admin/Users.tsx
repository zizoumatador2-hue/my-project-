import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROLES, ROLE_LABELS } from '../../../../shared/domain';
import { date, int } from '../../lib/format';
import { Icon } from '../../ui/icons';
import { Empty, Loadable, useFetch } from '../../ui/kit';

export default function Users() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const s = useFetch<{ items: any[] }>(`/admin/users?q=${encodeURIComponent(query)}${role ? `&role=${role}` : ''}`);
  const nav = useNavigate();
  return (
    <div className="stack">
      <h1 style={{ fontSize: '1.5rem' }}>المستخدمون والأدوار</h1>
      <form className="row" onSubmit={(e) => { e.preventDefault(); setQuery(q); }}>
        <input className="input grow" type="search" placeholder="بحث بالبريد أو الاسم أو المعرّف" value={q} onChange={(e) => setQ(e.target.value)} aria-label="بحث" style={{ inlineSize: 'auto', flex: 1 }} />
        <select className="select" style={{ inlineSize: 'auto' }} value={role} onChange={(e) => setRole(e.target.value)} aria-label="الدور"><option value="">كل الأدوار</option>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
      </form>
      <Loadable state={s}>
        {({ items }) => items.length === 0 ? <div className="card"><Empty icon={<Icon.Users size={26} />} title="لا نتائج" /></div> : (
          <div className="table-wrap"><table className="table responsive">
            <thead><tr><th>المستخدم</th><th>الدور</th><th>الحالة</th><th className="num">ثقة البائع</th><th className="num">ثقة المشتري</th><th className="num">مخالفات</th><th>التسجيل</th></tr></thead>
            <tbody>{items.map((u) => (
              <tr key={u.id} className="clickable" onClick={() => nav(`/admin/users/${u.id}`)}>
                <td data-label="المستخدم"><div>{u.display_name}</div><div className="xs muted ltr">{u.email}</div></td>
                <td data-label="الدور"><span className={`badge ${u.role !== 'user' ? 'seal' : ''}`}>{ROLE_LABELS[u.role as keyof typeof ROLE_LABELS]}</span></td>
                <td data-label="الحالة"><span className={`badge ${u.status === 'active' ? 'vault' : 'danger'}`}>{u.status === 'active' ? 'نشط' : 'موقوف'}</span></td>
                <td data-label="ثقة البائع" className="num">{int(u.trust_seller)}</td>
                <td data-label="ثقة المشتري" className="num">{int(u.trust_buyer)}</td>
                <td data-label="مخالفات" className="num">{int(u.chat_violations)}</td>
                <td data-label="التسجيل">{date(u.created_at)}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </Loadable>
    </div>
  );
}
