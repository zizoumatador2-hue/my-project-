import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { scanMessage, VIOLATION_LABELS } from '../../../shared/chatFilter';
import { ApiError, get, post } from '../lib/api';
import { dateTime } from '../lib/format';
import { useSession } from '../lib/session';
import { Icon } from './icons';
import { Button, Turnstile } from './kit';

interface Msg { id: string; sender_id: string | null; body: string; blocked: number; block_reasons: string | null; created_at: number; _state?: 'pending' | 'failed' }

export function ChatThread({ conversationId, handle, readOnly, adminView }: { conversationId: string; handle?: string; readOnly?: boolean; adminView?: boolean }) {
  const { user, config } = useSession();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [text, setText] = useState('');
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [blockNote, setBlockNote] = useState<string | null>(null);
  const [token, setToken] = useState<string>();
  const cursor = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);
  const delay = useRef(4000);

  const merge = useCallback((incoming: Msg[]) => {
    if (!incoming.length) return;
    cursor.current = Math.max(cursor.current, ...incoming.map((m) => m.created_at));
    setMsgs((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      return [...prev, ...incoming.filter((m) => !seen.has(m.id))].sort((a, b) => a.created_at - b.created_at);
    });
  }, []);

  // Poll with exponential backoff on failure; pause while the tab is hidden (saves battery and data on mobile).
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    cursor.current = 0;
    setMsgs([]);
    const tick = async () => {
      if (stop) return;
      if (document.visibilityState === 'visible') {
        try {
          const r = await get<{ messages: Msg[]; conversation: any }>(`/conversations/${conversationId}/messages?after=${cursor.current}`);
          setMeta(r.conversation);
          merge(r.messages);
          setLoadErr(null);
          delay.current = 4000;
        } catch (e) {
          setLoadErr(e instanceof ApiError ? e.message : 'تعذّر تحديث المحادثة.');
          delay.current = Math.min(30000, delay.current * 2);
        }
      }
      timer = setTimeout(tick, delay.current);
    };
    tick();
    const onVis = () => { if (document.visibilityState === 'visible') { clearTimeout(timer); tick(); } };
    document.addEventListener('visibilitychange', onVis);
    return () => { stop = true; clearTimeout(timer); document.removeEventListener('visibilitychange', onVis); };
  }, [conversationId, merge]);

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' }); }, [msgs.length]);

  const warning = useMemo(() => {
    const v = scanMessage(text, handle ? [handle] : []);
    return v.length ? v.map((x) => VIOLATION_LABELS[x]).join('، ') : null;
  }, [text, handle]);

  async function send(body: string, retryId?: string) {
    const tempId = retryId ?? `tmp-${Date.now()}`;
    const temp: Msg = { id: tempId, sender_id: user!.id, body, blocked: 0, block_reasons: null, created_at: Date.now(), _state: 'pending' };
    setMsgs((m) => (retryId ? m.map((x) => (x.id === retryId ? temp : x)) : [...m, temp]));
    setBlockNote(null);
    try {
      const r = await post<{ id: string; created_at: number }>(`/conversations/${conversationId}/messages`, { body, turnstileToken: token });
      setMsgs((m) => m.map((x) => (x.id === tempId ? { ...temp, id: r.id, created_at: r.created_at, _state: undefined } : x)));
      cursor.current = Math.max(cursor.current, r.created_at);
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 422) {
        const labels = (err.details?.violations ?? []).map((v: any) => v.label).join('، ');
        setMsgs((m) => m.map((x) => (x.id === tempId ? { ...temp, blocked: 1, _state: undefined, block_reasons: JSON.stringify(err.details?.violations?.map((v: any) => v.code) ?? []) } : x)));
        setBlockNote(`حُجبت الرسالة لاحتوائها على: ${labels}. التواصل خارج المنصة يُسقط حماية الضمان${err.details?.flagged ? '، وتكرار المحاولة أحال حسابك للمراجعة' : ''}.`);
      } else {
        setMsgs((m) => m.map((x) => (x.id === tempId ? { ...temp, _state: 'failed' } : x)));
      }
    }
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText('');
    send(body);
  }

  const name = (id: string | null) => (id === meta?.buyer_id ? meta?.buyer_name : id === meta?.seller_id ? meta?.seller_name : '');
  const needToken = !adminView && config?.turnstileSiteKey && !msgs.some((m) => m.sender_id === user?.id && !m._state);

  return (
    <div className="chat">
      {loadErr && <div className="alert warn" style={{ borderRadius: 0 }}><Icon.Alert size={16} /><span className="small">{loadErr} — نعيد المحاولة تلقائيًا.</span></div>}
      <div className="chat-log" ref={logRef} aria-live="polite" aria-label="الرسائل">
        {msgs.length === 0 && !loadErr && <p className="muted small" style={{ textAlign: 'center', margin: 'auto' }}>ابدأ المحادثة. اسأل عن الجمهور، ومصادر النمو، وأي قيود على الحساب.</p>}
        {msgs.map((m) => {
          const mine = !adminView && m.sender_id === user?.id;
          const cls = m.sender_id === null ? 'system' : mine ? 'mine' : 'theirs';
          const reasons: string[] = m.block_reasons ? JSON.parse(m.block_reasons) : [];
          return (
            <div key={m.id} className={`msg ${cls} ${m.blocked ? 'blocked' : ''} ${m._state === 'pending' ? 'pending' : ''} enter`}>
              {adminView && m.sender_id && <strong className="xs" style={{ display: 'block' }}>{name(m.sender_id) || 'مستخدم'}</strong>}
              {m.body}
              <span className="meta">
                {m.blocked ? `محجوبة · ${reasons.map((r) => VIOLATION_LABELS[r as keyof typeof VIOLATION_LABELS] ?? r).join('، ')} · ` : ''}
                {m._state === 'pending' ? 'جارٍ الإرسال…' : m._state === 'failed' ? '' : dateTime(m.created_at)}
              </span>
              {m._state === 'failed' && <button className="btn btn-sm btn-secondary" style={{ marginBlockStart: 4 }} onClick={() => send(m.body, m.id)}>فشل الإرسال — أعد المحاولة</button>}
            </div>
          );
        })}
      </div>
      {!readOnly && (
        <>
          {blockNote ? (
            <div className="alert danger" style={{ borderRadius: 0 }}><Icon.Shield size={16} /><span className="small">{blockNote}</span></div>
          ) : warning ? (
            <div className="alert warn" style={{ borderRadius: 0 }}><Icon.Alert size={16} /><span className="small">يبدو أن رسالتك تتضمن {warning}. ستُحجب وتُسجَّل.</span></div>
          ) : (
            <div className="chat-guard"><Icon.Shield size={14} /> المحادثة مراقبة لحمايتك. لا تشارك أرقامًا أو روابط أو حسابات خارجية.</div>
          )}
          {needToken && <div style={{ padding: '6px 10px' }}><Turnstile siteKey={config!.turnstileSiteKey} action="chat" onToken={setToken} /></div>}
          <form className="chat-compose" onSubmit={submit}>
            <textarea className="textarea grow" rows={1} placeholder="اكتب رسالتك…" value={text} maxLength={2000} aria-label="نص الرسالة"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }} />
            <Button type="submit" aria-label="إرسال" disabled={!text.trim()}><Icon.Send size={18} /></Button>
          </form>
        </>
      )}
    </div>
  );
}
