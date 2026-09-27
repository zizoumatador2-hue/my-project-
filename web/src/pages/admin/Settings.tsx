import { useEffect, useState } from 'react';
import { computeCommission, type Settings } from '../../../../shared/domain';
import { ApiError, put } from '../../lib/api';
import { dateTime, money } from '../../lib/format';
import { useSession } from '../../lib/session';
import { Icon } from '../../ui/icons';
import { Alert, Button, Field, Loadable, useFetch, useToast } from '../../ui/kit';

type NumPath = [keyof Settings, string];
const FLAG_LABELS: Record<keyof Settings['flags'], string> = {
  signups_enabled: 'السماح بالتسجيل', new_listings_enabled: 'السماح بإعلانات جديدة', purchases_enabled: 'السماح بالشراء', withdrawals_enabled: 'السماح بالسحب', chat_enabled: 'تفعيل المحادثات',
};

function Editor({ initial, history, onSaved }: { initial: Settings; history: any[]; onSaved: () => void }) {
  const [s, setS] = useState<Settings>(initial);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { refresh } = useSession();
  useEffect(() => setS(initial), [initial]);

  const setNum = ([g, k]: NumPath, v: number) => setS((x) => ({ ...x, [g]: { ...(x[g] as object), [k]: v } }));
  const numField = (path: NumPath, label: string, hint: string, scale = 1, suffix?: string) => {
    const raw = (s[path[0]] as Record<string, number>)[path[1]];
    return (
      <Field label={label} htmlFor={path.join('.')} hint={hint}>
        <div className="input-affix">
          <input id={path.join('.')} className="input" inputMode="decimal" value={String(raw / scale)} onChange={(e) => { const n = Number(e.target.value.replace(/[^\d.]/g, '')); if (Number.isFinite(n)) setNum(path, Math.round(n * scale)); }} />
          {suffix && <span className="affix">{suffix}</span>}
        </div>
      </Field>
    );
  };

  async function save() {
    setErr(null); setBusy(true);
    try { await put('/admin/settings', s); toast('success', 'حُفظت الإعدادات وتسري فورًا على العمليات الجديدة'); onSaved(); refresh(); }
    catch (e) { setErr(e instanceof ApiError ? `${e.message} ${Object.entries(e.fields).map(([k, v]) => `${k}: ${v}`).join(' — ')}` : 'تعذّر الحفظ'); }
    finally { setBusy(false); }
  }

  const tiers = s.commission.tiers;
  const setTier = (i: number, k: 'min_cents' | 'bp', v: number) => setS((x) => ({ ...x, commission: { ...x.commission, tiers: x.commission.tiers.map((t, j) => (j === i ? { ...t, [k]: v } : t)) } }));

  return (
    <div className="stack">
      {err && <Alert kind="danger">{err}</Alert>}
      <div className="card pad-lg stack">
        <h2 style={{ fontSize: '1.1rem', margin: 0 }}>العمولة (تُثبَّت على الصفقة عند إنشائها)</h2>
        <div className="table-wrap"><table className="table">
          <thead><tr><th>من سعر ($)</th><th>النسبة (%)</th><th></th></tr></thead>
          <tbody>{tiers.map((t, i) => (
            <tr key={i}>
              <td><input className="input" aria-label="من سعر" inputMode="decimal" value={t.min_cents / 100} disabled={i === 0} onChange={(e) => setTier(i, 'min_cents', Math.round(Number(e.target.value.replace(/[^\d.]/g, '')) * 100) || 0)} /></td>
              <td><input className="input" aria-label="النسبة" inputMode="decimal" value={t.bp / 100} onChange={(e) => setTier(i, 'bp', Math.round(Number(e.target.value.replace(/[^\d.]/g, '')) * 100) || 0)} /></td>
              <td>{i > 0 && <Button size="sm" variant="ghost" onClick={() => setS((x) => ({ ...x, commission: { ...x.commission, tiers: x.commission.tiers.filter((_, j) => j !== i) } }))}>حذف</Button>}</td>
            </tr>))}</tbody>
        </table></div>
        <div className="row"><Button size="sm" variant="secondary" disabled={tiers.length >= 10} onClick={() => setS((x) => ({ ...x, commission: { ...x.commission, tiers: [...x.commission.tiers, { min_cents: (x.commission.tiers.at(-1)?.min_cents ?? 0) + 100000, bp: 500 }] } }))}><Icon.Plus size={16} /> شريحة</Button></div>
        {numField(['commission', 'min_fee_cents'], 'الحد الأدنى للعمولة', 'بالدولار', 100, '$')}
        <div className="panel small">معاينة: {[20000, 150000, 800000].map((p) => { const c = computeCommission(p, s.commission); return <span key={p} style={{ marginInlineEnd: 16 }}>{money(p)} ← <span className="num">{money(c.cents, true)}</span></span>; })}</div>
      </div>
      <div className="card pad-lg stack">
        <h2 style={{ fontSize: '1.1rem', margin: 0 }}>السحب</h2>
        <div className="form-grid two">
          {numField(['withdrawal', 'min_cents'], 'الحد الأدنى للسحب', '', 100, '$')}
          {numField(['withdrawal', 'auto_approve_max_cents'], 'اعتماد تلقائي حتى', 'الطلبات الأكبر تذهب للمراجعة اليدوية. 0 = تعطيل الاعتماد التلقائي.', 100, '$')}
          {numField(['withdrawal', 'daily_auto_limit_cents'], 'سقف الاعتماد التلقائي اليومي (للمنصة)', 'إجمالي ما يُعتمد تلقائيًا خلال 24 ساعة.', 100, '$')}
        </div>
      </div>
      <div className="card pad-lg stack">
        <h2 style={{ fontSize: '1.1rem', margin: 0 }}>الضمان والنقل</h2>
        <div className="form-grid two">
          {numField(['escrow', 'confirmation_window_hours'], 'مهلة تأكيد المشتري', 'يُحرَّر المبلغ تلقائيًا بعدها إن لم يُفتح نزاع.', 1, 'ساعة')}
          {numField(['escrow', 'reclaim_hold_days'], 'فترة حماية الاسترداد', 'مدة تعليق عائد البائع بعد التحرير.', 1, 'يوم')}
          {numField(['escrow', 'payment_timeout_minutes'], 'مهلة الدفع', 'حجز الإعلان بانتظار الدفع (30 دقيقة على الأقل).', 1, 'دقيقة')}
          {numField(['transfer', 'secret_ttl_hours'], 'صلاحية البيانات الآمنة', 'تُحذف البيانات غير المكشوفة بعدها.', 1, 'ساعة')}
        </div>
      </div>
      <div className="card pad-lg stack">
        <h2 style={{ fontSize: '1.1rem', margin: 0 }}>المحادثة وكشف الاحتيال</h2>
        <div className="form-grid two">
          {numField(['chat', 'violation_flag_threshold'], 'عتبة الإحالة للمراجعة', 'عدد محاولات مشاركة بيانات التواصل قبل فتح حالة اشتباه.', 1)}
          {numField(['fraud', 'min_account_age_months'], 'أقل عمر حساب دون اشتباه', '', 1, 'شهر')}
          {numField(['fraud', 'max_engagement_rate'], 'أعلى معدل تفاعل واقعي', '', 1, '%')}
          {numField(['fraud', 'min_price_per_1k_followers_cents'], 'أقل سعر لكل 1000 متابع', 'أقل من ذلك يُعد مؤشرًا لحساب مسروق.', 100, '$')}
          {numField(['fraud', 'new_seller_hours'], 'البائع يُعد جديدًا خلال', '', 1, 'ساعة')}
          {numField(['fraud', 'new_seller_high_price_cents'], 'سعر مرتفع لبائع جديد', '', 100, '$')}
        </div>
        <label className="check"><input type="checkbox" checked={s.chat.allow_contact_after_complete} onChange={(e) => setS((x) => ({ ...x, chat: { ...x.chat, allow_contact_after_complete: e.target.checked } }))} /><span>السماح بتبادل بيانات التواصل بعد إغلاق الصفقة</span></label>
      </div>
      <div className="card pad-lg stack">
        <h2 style={{ fontSize: '1.1rem', margin: 0 }}>مفاتيح التشغيل</h2>
        {(Object.keys(FLAG_LABELS) as Array<keyof Settings['flags']>).map((k) => (
          <label key={k} className="check"><input type="checkbox" checked={s.flags[k]} onChange={(e) => setS((x) => ({ ...x, flags: { ...x.flags, [k]: e.target.checked } }))} /><span>{FLAG_LABELS[k]}</span></label>
        ))}
      </div>
      <div className="row end" style={{ position: 'sticky', insetBlockEnd: 'calc(var(--tabbar) + 12px)', zIndex: 5 }}>
        <Button variant="ghost" onClick={() => setS(initial)}>تراجع عن التغييرات</Button>
        <Button loading={busy} onClick={save}>حفظ الإعدادات</Button>
      </div>
      <div className="card"><h3>سجل التغييرات</h3>{history.map((h) => <div key={h.id} className="small row between"><span>{h.changed_by}</span><span className="muted">{dateTime(h.created_at)}</span></div>)}{history.length === 0 && <p className="small muted">لم تُعدّل الإعدادات بعد (القيم الافتراضية سارية).</p>}</div>
    </div>
  );
}

export default function SettingsPage() {
  const s = useFetch<any>('/admin/settings');
  return (
    <div className="stack">
      <h1 style={{ fontSize: '1.5rem' }}>الإعدادات العامة</h1>
      <p className="small muted" style={{ margin: 0 }}>تُخزَّن في Cloudflare KV وتُقرأ لحظة تنفيذ كل عملية — لا حاجة لأي نشر. كل تغيير يُحفظ بنسخة في D1 وفي سجل التدقيق.</p>
      <Loadable state={s}>{(d) => <Editor initial={d.settings} history={d.history} onSaved={s.reload} />}</Loadable>
    </div>
  );
}
