import { useState } from 'react';
import { dateTime, int } from '../../lib/format';
import { Button, Loadable, useFetch } from '../../ui/kit';

export default function Audit() {
  const [f, setF] = useState({ action: '', subject: '', actor: '' });
  const [applied, setApplied] = useState(f);
  const [offset, setOffset] = useState(0);
  const qs = new URLSearchParams({ ...Object.fromEntries(Object.entries(applied).filter(([, v]) => v)), offset: String(offset), limit: '50' }).toString();
  const s = useFetch<any>(`/admin/audit?${qs}`);
  return (
    <div className="stack">
      <h1 style={{ fontSize: '1.5rem' }}>سجل التدقيق</h1>
      <p className="small muted" style={{ margin: 0 }}>سجل إلحاقي لكل إجراء حساس: من فعل ماذا ومتى ومن أي عنوان. لا يتضمن أي أسرار أو كلمات مرور.</p>
      <form className="grid cols-4" onSubmit={(e) => { e.preventDefault(); setOffset(0); setApplied(f); }}>
        <input className="input ltr-input" placeholder="الإجراء (مثال: escrow.)" value={f.action} onChange={(e) => setF((x) => ({ ...x, action: e.target.value }))} aria-label="الإجراء" />
        <input className="input ltr-input" placeholder="معرّف الكيان" value={f.subject} onChange={(e) => setF((x) => ({ ...x, subject: e.target.value }))} aria-label="الكيان" />
        <input className="input ltr-input" placeholder="معرّف المنفّذ" value={f.actor} onChange={(e) => setF((x) => ({ ...x, actor: e.target.value }))} aria-label="المنفّذ" />
        <Button type="submit" variant="secondary">تصفية</Button>
      </form>
      <Loadable state={s}>
        {({ items }) => (
          <>
            <div className="table-wrap"><table className="table responsive">
              <thead><tr><th>الوقت</th><th>المنفّذ</th><th>الإجراء</th><th>الكيان</th><th>التفاصيل</th><th>IP</th></tr></thead>
              <tbody>{items.map((a: any) => (
                <tr key={a.id}>
                  <td data-label="الوقت" className="nowrap">{dateTime(a.created_at)}</td>
                  <td data-label="المنفّذ">{a.actor_name ?? 'النظام'}{a.actor_role && a.actor_role !== 'user' ? <span className="xs muted"> ({a.actor_role})</span> : null}</td>
                  <td data-label="الإجراء"><code className="ltr small">{a.action}</code></td>
                  <td data-label="الكيان"><span className="xs ltr">{a.subject_type} {a.subject_id}</span></td>
                  <td data-label="التفاصيل"><code className="xs ltr" style={{ display: 'block', maxInlineSize: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.details ? JSON.stringify(a.details) : ''}>{a.details ? JSON.stringify(a.details) : ''}</code></td>
                  <td data-label="IP"><span className="xs ltr">{a.ip}</span></td>
                </tr>))}</tbody>
            </table></div>
            <div className="row" style={{ justifyContent: 'center' }}>
              <Button size="sm" variant="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>الأحدث</Button>
              <span className="small muted num">{int(offset + 1)}–{int(offset + items.length)}</span>
              <Button size="sm" variant="secondary" disabled={items.length < 50} onClick={() => setOffset(offset + 50)}>الأقدم</Button>
            </div>
          </>
        )}
      </Loadable>
    </div>
  );
}
