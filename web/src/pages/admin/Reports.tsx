import { useState } from 'react';
import { PLATFORM_LABELS, type Platform } from '../../../../shared/domain';
import { int, money } from '../../lib/format';
import { ColumnChart } from '../../ui/ColumnChart';
import { Loadable, useFetch } from '../../ui/kit';

const W: Record<string, string> = { pending_review: 'قيد المراجعة', approved: 'معتمدة', paid: 'مدفوعة', rejected: 'مرفوضة' };

export default function Reports() {
  const [days, setDays] = useState(30);
  const s = useFetch<any>(`/admin/reports?days=${days}`);
  return (
    <div className="stack">
      <div className="row between">
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>المبيعات والعمولات</h1>
        <div className="seg" role="group" aria-label="الفترة">{[7, 30, 90, 365].map((d) => <button key={d} aria-pressed={days === d} onClick={() => setDays(d)}>{d === 365 ? 'سنة' : `${d} يومًا`}</button>)}</div>
      </div>
      <Loadable state={s}>
        {(r) => {
          const maxP = Math.max(1, ...r.byPlatform.map((p: any) => p.gmv));
          return (
            <>
              <div className="grid cols-4">
                <div className="card metric"><span className="k">حجم المبيعات المكتملة</span><span className="v num">{money(r.totals.gmv)}</span></div>
                <div className="card metric"><span className="k">صافي العمولات</span><span className="v num" style={{ color: 'var(--vault)' }}>{money(r.totals.commission)}</span></div>
                <div className="card metric"><span className="k">صفقات مكتملة</span><span className="v num">{int(r.totals.deals)}</span></div>
                <div className="card metric"><span className="k">مبالغ مردودة</span><span className="v num">{money(r.refunds?.amount)}</span><span className="xs muted">{int(r.refunds?.n)} عملية</span></div>
              </div>
              <div className="card"><h2 style={{ fontSize: '1.05rem' }}>صافي العمولة اليومي</h2><ColumnChart label="العمولة" data={r.daily.map((d: any) => ({ day: d.day, value: d.commission / 100 }))} /></div>
              <div className="card"><h2 style={{ fontSize: '1.05rem' }}>المبالغ المردودة يوميًا</h2><ColumnChart label="المردود" data={r.daily.map((d: any) => ({ day: d.day, value: d.refunds / 100 }))} /></div>
              <div className="grid cols-2">
                <div className="card stack-sm">
                  <h2 style={{ fontSize: '1.05rem' }}>حسب المنصة</h2>
                  {r.byPlatform.length === 0 ? <p className="small muted">لا بيانات.</p> : r.byPlatform.map((p: any) => (
                    <div key={p.platform} className="stack-sm" style={{ gap: 4 }}>
                      <div className="row between small"><span>{PLATFORM_LABELS[p.platform as Platform]} · <span className="num">{int(p.n)}</span> صفقة</span><strong className="num">{money(p.gmv)}</strong></div>
                      <div className="bar-track"><div className="bar-fill" style={{ inlineSize: `${(p.gmv / maxP) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
                <div className="card stack-sm">
                  <h2 style={{ fontSize: '1.05rem' }}>السحوبات</h2>
                  {r.withdrawals.length === 0 ? <p className="small muted">لا بيانات.</p> : r.withdrawals.map((w: any) => <div key={w.status} className="row between small"><span>{W[w.status]} ({int(w.n)})</span><strong className="num">{money(w.amount)}</strong></div>)}
                </div>
              </div>
            </>
          );
        }}
      </Loadable>
    </div>
  );
}
