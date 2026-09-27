import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { post } from '../../lib/api';
import { dateTime } from '../../lib/format';
import { useSession } from '../../lib/session';
import { Icon } from '../../ui/icons';
import { Button, Empty, Field, Loadable, Modal, useAction, useFetch } from '../../ui/kit';

const SUBJ: Record<string, string> = { listing: 'إعلان', user: 'مستخدم', deal: 'صفقة' };
const link = (f: any) => (f.subject_type === 'listing' ? `/admin/reviews/${f.subject_id}` : f.subject_type === 'user' ? `/admin/users/${f.subject_id}` : `/admin/deals/${f.subject_id}`);

export default function Fraud() {
  const [p, setP] = useSearchParams();
  const status = p.get('status') || 'open';
  const s = useFetch<{ items: any[] }>(`/admin/fraud?status=${status}`);
  const { can } = useSession();
  const [cur, setCur] = useState<any>(null);
  const [f, setF] = useState({ outcome: 'cleared', note: '', rejectListing: false, suspendUser: false });
  const [resolve, busy] = useAction(async () => { await post(`/admin/fraud/${cur.id}/resolve`, f); setCur(null); s.reload(); }, { success: 'أُغلقت الحالة' });
  return (
    <div className="stack">
      <h1 style={{ fontSize: '1.5rem' }}>الاشتباه والاحتيال</h1>
      <p className="small muted" style={{ margin: 0 }}>حالات تفتحها الفحوص الآلية (مطالبات مكررة، لقطات معاد استخدامها، أرقام غير متطابقة)، ومحاولات التواصل الخارجي المتكررة، والاعتراضات البنكية، والصفقات المتوقفة.</p>
      <div className="tabs" role="tablist">
        {[['open', 'مفتوحة'], ['cleared', 'مُبرّأة'], ['actioned', 'اتُّخذ إجراء'], ['all', 'الكل']].map(([k, l]) => <button key={k} role="tab" aria-selected={status === k} onClick={() => setP({ status: k })}>{l}</button>)}
      </div>
      <Loadable state={s}>
        {({ items }) => items.length === 0 ? <div className="card"><Empty icon={<Icon.Shield size={26} />} title="لا حالات" /></div> : (
          <div className="stack-sm">
            {items.map((x) => (
              <div key={x.id} className="card stack-sm">
                <div className="row between">
                  <div className="row" style={{ gap: 8 }}>
                    <span className={`badge ${x.severity === 'high' ? 'danger' : x.severity === 'medium' ? 'warn' : ''}`}>{x.severity === 'high' ? 'عالية' : x.severity === 'medium' ? 'متوسطة' : 'منخفضة'}</span>
                    <span className="badge">{SUBJ[x.subject_type]}</span>
                    <Link to={link(x)} className="small">{x.subject_label ?? x.subject_id}</Link>
                  </div>
                  <span className="xs muted">{dateTime(x.created_at)}</span>
                </div>
                <div className="small">{x.reason}</div>
                {x.status !== 'open' ? <div className="xs muted">{x.status === 'cleared' ? 'بُرّئت' : 'اتُّخذ إجراء'} بواسطة {x.resolver_name} · {x.resolution_note}</div>
                  : <div className="row"><Button size="sm" variant="secondary" onClick={() => { setCur(x); setF({ outcome: 'cleared', note: '', rejectListing: false, suspendUser: false }); }}>معالجة</Button></div>}
              </div>
            ))}
          </div>
        )}
      </Loadable>
      <Modal open={!!cur} onClose={() => setCur(null)} title="معالجة حالة اشتباه"
        footer={<><Button variant="ghost" onClick={() => setCur(null)}>إلغاء</Button><Button loading={busy} disabled={f.note.trim().length < 5} onClick={() => resolve()}>حفظ القرار</Button></>}>
        {cur && <p className="small">{cur.reason}</p>}
        <div className="seg" role="group">
          <button aria-pressed={f.outcome === 'cleared'} onClick={() => setF((x) => ({ ...x, outcome: 'cleared' }))}>تبرئة (إنذار كاذب)</button>
          <button aria-pressed={f.outcome === 'actioned'} onClick={() => setF((x) => ({ ...x, outcome: 'actioned' }))}>اتخاذ إجراء</button>
        </div>
        {f.outcome === 'actioned' && (
          <>
            {cur?.subject_type === 'listing' && <label className="check"><input type="checkbox" checked={f.rejectListing} onChange={(e) => setF((x) => ({ ...x, rejectListing: e.target.checked }))} /><span>رفض الإعلان</span></label>}
            {can('users.manage') && cur?.subject_type !== 'deal' && <label className="check"><input type="checkbox" checked={f.suspendUser} onChange={(e) => setF((x) => ({ ...x, suspendUser: e.target.checked }))} /><span>إيقاف حساب المستخدم وإنهاء جلساته</span></label>}
          </>
        )}
        <Field label="المسوغات (تُحفظ في التدقيق)" htmlFor="fnote"><textarea id="fnote" className="textarea" value={f.note} onChange={(e) => setF((x) => ({ ...x, note: e.target.value }))} /></Field>
      </Modal>
    </div>
  );
}
