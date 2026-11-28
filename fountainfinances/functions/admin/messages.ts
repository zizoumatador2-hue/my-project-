// Contact inbox: filter, search, read and triage messages from the contact form.
import type { Env } from '../_lib/http';
import { dbReady } from '../_lib/http';
import type { AdminData } from './_middleware';
import { layout, htmlResponse, badge, statusTone, statusLabel, fmtDate, fmtNum, esc, table, emptyState, flash, parseRange, rangeFrom, rangeForm, pager } from '../_lib/admin-ui';

const PAGE_SIZE = 25;
const STATUSES = ['all', 'new', 'answered', 'closed'] as const;

interface MessageRow {
  id: number;
  name: string;
  email: string;
  topic: string;
  message: string;
  status: string;
  created_at: number;
}

export const onRequestGet: PagesFunction<Env, string, AdminData> = async ({ request, env, data }) => {
  const url = new URL(request.url);
  const range = parseRange(url.searchParams.get('range'));
  const status = (STATUSES as readonly string[]).includes(url.searchParams.get('status') || '') ? (url.searchParams.get('status') as string) : 'all';
  const q = (url.searchParams.get('q') || '').replace(/[%_]/g, '').trim().slice(0, 80);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1) || 1);
  const saved = url.searchParams.get('saved');
  if (!dbReady(env)) return htmlResponse(layout({ title: 'Messages', active: 'messages', actor: data.admin, body: emptyState('Database not connected', 'Bind D1 as DB.') }), 503);

  const where: string[] = [];
  const params: (string | number)[] = [];
  const from = rangeFrom(range);
  if (from) {
    params.push(from);
    where.push(`created_at >= ?${params.length}`);
  }
  if (status !== 'all') {
    params.push(status);
    where.push(`status = ?${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    const n = params.length;
    where.push(`(name LIKE ?${n} OR email LIKE ?${n} OR message LIKE ?${n})`);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = await env.DB.prepare(`SELECT COUNT(*) AS n FROM contact_messages ${clause}`).bind(...params).first<{ n: number }>();
  const rows = await env.DB.prepare(
    `SELECT id, name, email, topic, message, status, created_at FROM contact_messages ${clause} ORDER BY created_at DESC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
  )
    .bind(...params)
    .all<MessageRow>();

  const statusOptions = (current: string) =>
    ['new', 'answered', 'closed'].map((s) => `<option value="${s}"${s === current ? ' selected' : ''}>${statusLabel(s)}</option>`).join('');

  const tableRows = rows.results.map((m) => [
    `<td style="white-space:nowrap">${fmtDate(m.created_at)}</td>`,
    `<td><strong>${esc(m.name)}</strong><br><a class="mono" href="mailto:${esc(m.email)}">${esc(m.email)}</a></td>`,
    `<td>${esc(m.topic)}<details style="margin-top:6px"><summary class="muted" style="cursor:pointer">Read message</summary><pre class="msg-body" style="margin-top:8px">${esc(m.message)}</pre></details></td>`,
    `<td>${badge(statusLabel(m.status), statusTone(m.status))}</td>`,
    `<td><form method="post" action="/admin/messages/${m.id}" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><label class="sr" for="s${m.id}">Status</label><select id="s${m.id}" name="status" style="font:inherit;padding:6px 8px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--ink)">${statusOptions(m.status)}</select><button class="btn btn-sm btn-ghost" type="submit">Save</button></form><a class="muted" style="font-size:.82rem" href="mailto:${esc(m.email)}?subject=${encodeURIComponent(`Re: ${m.topic}`)}">Reply by email ↗</a></td>`,
  ]);

  const tabs = STATUSES.map((s) => {
    const qs = new URLSearchParams({ status: s, range, ...(q ? { q } : {}) });
    return `<a href="/admin/messages?${qs.toString()}" class="${s === status ? 'btn btn-sm' : 'btn btn-sm btn-ghost'}" style="margin-right:6px">${statusLabel(s)}</a>`;
  }).join('');

  const body = `
  ${flash(saved ? `Message #${esc(saved)} updated and logged in the audit log.` : null)}
  <div class="page-head">
    <div><p>Messages from the contact form. Read, triage and reply. Replies are sent from your own email client.</p></div>
    ${rangeForm('/admin/messages', range, { status, ...(q ? { q } : {}) })}
  </div>
  <div class="toolbar" style="justify-content:space-between">
    <div>${tabs}</div>
    <form class="toolbar" method="get" action="/admin/messages" style="margin:0">
      <input type="hidden" name="status" value="${esc(status)}"><input type="hidden" name="range" value="${esc(range)}">
      <label class="sr" for="q">Search messages</label>
      <input id="q" type="search" name="q" value="${esc(q)}" placeholder="Search name, email or message">
      <button class="btn btn-ghost" type="submit">Search</button>
    </form>
  </div>
  <p class="muted" style="margin:0 0 12px">${fmtNum(total?.n ?? 0)} matching message${total?.n === 1 ? '' : 's'}</p>
  ${rows.results.length
    ? table(['Received', 'From', 'Topic and message', 'Status', 'Triage'], tableRows)
    : emptyState('No messages match these filters', 'Try another status or a wider date range.')}
  ${pager('/admin/messages', new URLSearchParams({ status, range, ...(q ? { q } : {}) }), page, total?.n ?? 0, PAGE_SIZE)}`;

  return htmlResponse(layout({ title: 'Messages', active: 'messages', actor: data.admin, body }));
};
