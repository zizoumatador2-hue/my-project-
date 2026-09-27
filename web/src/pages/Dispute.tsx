import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DISPUTE_REASONS } from '../../../shared/domain';
import { ApiError, post } from '../lib/api';
import { dateTime, int, money } from '../lib/format';
import { Icon } from '../ui/icons';
import { Alert, Button, Field, Loadable, useAction, useFetch, useToast } from '../ui/kit';
import { PageHeader } from '../ui/Shell';

const KIND_LABEL: Record<string, string> = { statement: 'إفادة', request_evidence: 'طلب أدلة من المحكّم', evidence: 'دليل مرفق', note: 'ملاحظة', assign: 'إسناد', resolve: 'القرار' };
const RES_LABEL: Record<string, string> = { refund: 'رد كامل المبلغ للمشتري', release: 'تحرير المبلغ للبائع', split: 'تقسيم المبلغ', resume: 'رفض النزاع واستئناف الصفقة' };

export function EventList({ events, meId }: { events: any[]; meId?: string }) {
  return (
    <ul className="timeline">
      {events.map((e) => (
        <li key={e.id}>
          <div className="stack-sm" style={{ gap: 4 }}>
            <div className="row" style={{ gap: 6 }}>
              <strong className="small">{e.actor_id === meId ? 'أنت' : e.actor_name ?? 'النظام'}</strong>
              <span className={`badge ${e.kind === 'request_evidence' ? 'warn' : e.kind === 'resolve' ? 'vault' : ''}`}>{KIND_LABEL[e.kind] ?? e.kind}</span>
              <span className="xs muted num">{dateTime(e.created_at)}</span>
            </div>
            {e.body && <div className="small" style={{ whiteSpace: 'pre-wrap' }}>{e.body}</div>}
            {e.has_file && e.file_url && (
              <a href={e.file_url} target="_blank" rel="noopener noreferrer" className="row small" style={{ gap: 6 }}>
                <Icon.File size={16} /> عرض الملف ({e.evidence_mime?.split('/')[1]?.toUpperCase()} · {int(Math.round((e.evidence_size ?? 0) / 1024))} KB)
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function DisputePage() {
  const { id } = useParams();
  const state = useFetch<any>(`/disputes/${id}`);
  const toast = useToast();
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [statement, sending] = useAction(async () => { await post(`/disputes/${id}/statements`, { body: text }); setText(''); state.reload(); }, { success: 'أُضيفت إفادتك' });

  async function upload() {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('note', note);
    setUploading(true);
    try { await post(`/disputes/${id}/evidence`, fd); setFile(null); setNote(''); toast('success', 'تم رفع الدليل وتشفيره'); state.reload(); }
    catch (e) { toast('error', e instanceof ApiError ? e.message : 'فشل الرفع'); }
    finally { setUploading(false); }
  }

  return (
    <div className="container page narrow">
      <Loadable state={state}>
        {({ dispute: d, events, role }) => (
          <div className="stack">
            <PageHeader back={`/deals/${d.deal_id}`} title="ملف النزاع" sub={DISPUTE_REASONS[d.reason_code] ?? d.reason_code}
              actions={<span className={`badge ${d.status === 'resolved' ? 'vault' : d.status === 'awaiting_evidence' ? 'warn' : 'danger'}`}>{d.status === 'resolved' ? 'مغلق' : d.status === 'awaiting_evidence' ? 'بانتظار أدلة' : 'قيد التحكيم'}</span>} />
            {d.status === 'resolved' ? (
              <Alert kind="vault" title={`القرار: ${RES_LABEL[d.resolution] ?? d.resolution}`}>
                {d.resolution === 'split' && d.buyer_refund_cents ? <div>المبلغ المردود للمشتري: <span className="num">{money(d.buyer_refund_cents, true)}</span></div> : null}
                <div style={{ whiteSpace: 'pre-wrap' }}>{d.resolution_note}</div>
                <div className="xs muted">{dateTime(d.resolved_at)}</div>
              </Alert>
            ) : d.status === 'awaiting_evidence' ? (
              <Alert kind="warn" title="المحكّم يطلب أدلة إضافية">راجع طلب المحكّم أدناه وأضف الأدلة أو الإفادة المطلوبة.</Alert>
            ) : (
              <Alert kind="info" title="الضمان مجمّد">يراجع المحكّم المحادثة كاملة وسجل خطوات النقل وأدلة الطرفين. أضف كل ما يدعم موقفك.</Alert>
            )}
            <div className="card pad-lg"><h2 style={{ fontSize: '1.1rem' }}>مجريات النزاع</h2><EventList events={events} meId={role === 'buyer' ? d.buyer_id : d.seller_id} /></div>
            {d.status !== 'resolved' && role !== 'admin' && (
              <div className="grid cols-2">
                <div className="card stack">
                  <h3>إضافة إفادة</h3>
                  <Field label="إفادتك" htmlFor="st"><textarea id="st" className="textarea" value={text} maxLength={4000} onChange={(e) => setText(e.target.value)} /></Field>
                  <Button loading={sending} disabled={text.trim().length < 5} onClick={() => statement()}>إرسال الإفادة</Button>
                </div>
                <div className="card stack">
                  <h3>إرفاق دليل</h3>
                  <label className="upload-zone">
                    <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                    <span className="row small" style={{ justifyContent: 'center' }}><Icon.Upload size={18} /> {file ? file.name : 'صورة أو PDF (حتى 8 ميغابايت)'}</span>
                  </label>
                  <Field label="وصف الدليل" htmlFor="en"><input id="en" className="input" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} /></Field>
                  <Button variant="secondary" loading={uploading} disabled={!file} onClick={upload}>رفع مشفّر</Button>
                </div>
              </div>
            )}
            <Link to={`/deals/${d.deal_id}`} className="small">العودة إلى غرفة الصفقة</Link>
          </div>
        )}
      </Loadable>
    </div>
  );
}
