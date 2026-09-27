import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ESCROW_LABELS, LISTING_STATUS_LABELS, ROLES, ROLE_LABELS, ROLE_PERMISSIONS, type EscrowState, type Role } from '../../../../shared/domain';
import { post } from '../../lib/api';
import { dateTime, int, money } from '../../lib/format';
import { useSession } from '../../lib/session';
import { Icon } from '../../ui/icons';
import { Button, Field, Loadable, Modal, TrustSeal, useAction, useFetch } from '../../ui/kit';

const PART: Record<string, string> = { base: 'أساس', completed: 'صفقات مكتملة', tenure: 'أقدمية', disputes_lost: 'نزاعات خاسرة', disputes_against: 'نزاعات ضده', cancellations: 'إلغاءات', chat_violations: 'مخالفات محادثة', verification: 'نتائج التحقق', responsiveness: 'سرعة الرد' };

function Breakdown({ b }: { b: Record<string, any> | undefined }) {
  if (!b) return <p className="small muted">لم يُحسب بعد.</p>;
  return (
    <dl className="kv small">
      {Object.entries(b).filter(([k]) => k !== 'stats').map(([k, v]) => <><dt key={k}>{PART[k] ?? k}</dt><dd className="num" style={{ color: (v as number) < 0 ? 'var(--danger)' : undefined }}>{(v as number) > 0 ? '+' : ''}{int(v as number)}</dd></>)}
    </dl>
  );
}

export default function UserDetail() {
  const { id } = useParams();
  const s = useFetch<any>(`/admin/users/${id}`);
  const { user: me, can } = useSession();
  const [role, setRole] = useState<Role | ''>('');
  const [susp, setSusp] = useState<null | 'suspended' | 'active'>(null);
  const [note, setNote] = useState('');
  const [changeRole, changing] = useAction(async () => { await post(`/admin/users/${id}/role`, { role }); setRole(''); s.reload(); }, { success: 'تم تغيير الدور وإنهاء جلسات المستخدم' });
  const [setStatus, statusing] = useAction(async () => { await post(`/admin/users/${id}/status`, { status: susp, note }); setSusp(null); setNote(''); s.reload(); }, { success: 'تم التحديث' });
  const [recompute, recomputing] = useAction(async () => { await post(`/admin/users/${id}/recompute-trust`); s.reload(); }, { success: 'أُعيد احتساب الثقة' });

  return (
    <Loadable state={s}>
      {({ user: u, listings, deals, fraudCases, audit, blockedMessages }) => (
        <div className="stack">
          <Link to="/admin/users" className="row small" style={{ gap: 4 }}><Icon.ChevronBack size={16} /> المستخدمون</Link>
          <div className="card pad-lg stack">
            <div className="row between">
              <div><h1 style={{ fontSize: '1.4rem', margin: 0 }}>{u.display_name}</h1><div className="small muted ltr">{u.email}</div><div className="xs muted">سُجّل {dateTime(u.created_at)} · آخر ظهور {dateTime(u.last_seen_at)} · محاولات دخول فاشلة {int(u.failed_logins)}</div></div>
              <div className="row"><span className={`badge ${u.status === 'active' ? 'vault' : 'danger'}`}>{u.status === 'active' ? 'نشط' : 'موقوف'}</span><span className="badge seal">{ROLE_LABELS[u.role as Role]}</span></div>
            </div>
            <div className="grid cols-2">
              <div className="panel stack-sm"><div className="row" style={{ gap: 10 }}><TrustSeal score={u.trust_seller} size="sm" /><strong>ثقة البائع</strong></div><Breakdown b={u.trust_breakdown?.seller} /></div>
              <div className="panel stack-sm"><div className="row" style={{ gap: 10 }}><TrustSeal score={u.trust_buyer} size="sm" /><strong>ثقة المشتري</strong></div><Breakdown b={u.trust_breakdown?.buyer} /></div>
            </div>
            {u.id !== me?.id && (
              <div className="row">
                <select className="select" style={{ inlineSize: 'auto' }} value={role} onChange={(e) => setRole(e.target.value as Role)} aria-label="الدور الجديد">
                  <option value="">تغيير الدور…</option>
                  {ROLES.filter((r) => r !== u.role && (can('roles.assign') || (r !== 'admin' && r !== 'superadmin'))).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
                <Button size="sm" variant="secondary" disabled={!role} loading={changing} onClick={() => confirm(`منح دور «${ROLE_LABELS[role as Role]}»؟ الصلاحيات: ${ROLE_PERMISSIONS[role as Role].join(', ') || 'لا شيء'}`) && changeRole()}>تطبيق</Button>
                {u.status === 'active' ? <Button size="sm" variant="danger-outline" onClick={() => setSusp('suspended')}>إيقاف الحساب</Button> : <Button size="sm" onClick={() => setSusp('active')}>إعادة التفعيل</Button>}
                <Button size="sm" variant="ghost" loading={recomputing} onClick={() => recompute()}><Icon.Refresh size={16} /> إعادة احتساب الثقة</Button>
              </div>
            )}
          </div>
          <div className="grid cols-2">
            <div className="card stack-sm"><h3>الصفقات ({deals.length})</h3>{deals.map((d: any) => <Link key={d.id} to={`/admin/deals/${d.id}`} className="row between small"><span>{d.side === 'buyer' ? 'شراء' : 'بيع'} · {d.title}</span><span>{ESCROW_LABELS[d.escrow_state as EscrowState]} · <span className="num">{money(d.price_cents)}</span></span></Link>)}</div>
            <div className="card stack-sm"><h3>الإعلانات ({listings.length})</h3>{listings.map((l: any) => <Link key={l.id} to={`/admin/reviews/${l.id}`} className="row between small"><span>{l.title}</span><span>{LISTING_STATUS_LABELS[l.status]}</span></Link>)}</div>
            <div className="card stack-sm"><h3>حالات الاشتباه ({fraudCases.length})</h3>{fraudCases.map((f: any) => <div key={f.id} className="small"><span className={`badge ${f.status === 'open' ? 'danger' : ''}`}>{f.status}</span> {f.reason}</div>)}</div>
            <div className="card stack-sm"><h3>رسائل محجوبة ({blockedMessages.length})</h3>{blockedMessages.map((m: any, i: number) => <div key={i} className="small" style={{ borderInlineStart: '3px solid var(--danger)', paddingInlineStart: 8 }}>{m.body}<div className="xs muted">{JSON.parse(m.block_reasons || '[]').join('، ')} · {dateTime(m.created_at)}</div></div>)}</div>
          </div>
          <details className="card"><summary style={{ cursor: 'pointer', fontWeight: 600 }}>نشاط المستخدم في سجل التدقيق ({audit.length})</summary>
            <div className="table-wrap" style={{ marginBlockStart: 10 }}><table className="table"><tbody>{audit.map((a: any, i: number) => <tr key={i}><td className="ltr small">{a.action}</td><td className="small">{a.subject_type} {a.subject_id}</td><td className="small ltr">{a.ip}</td><td className="small">{dateTime(a.created_at)}</td></tr>)}</tbody></table></div>
          </details>
          <Modal open={!!susp} onClose={() => setSusp(null)} title={susp === 'suspended' ? 'إيقاف الحساب' : 'إعادة التفعيل'}
            footer={<><Button variant="ghost" onClick={() => setSusp(null)}>إلغاء</Button><Button variant={susp === 'suspended' ? 'danger' : 'primary'} loading={statusing} disabled={note.trim().length < 5} onClick={() => setStatus()}>تأكيد</Button></>}>
            {susp === 'suspended' && <p className="small">تُنهى جميع جلسات المستخدم فورًا ولا يمكنه تسجيل الدخول.</p>}
            <Field label="السبب (يُحفظ في التدقيق)" htmlFor="sn"><textarea id="sn" className="textarea" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          </Modal>
        </div>
      )}
    </Loadable>
  );
}
