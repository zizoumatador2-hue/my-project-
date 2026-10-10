// Newsletter list: filter, search, export, and unsubscribe on request. Exports are logged.
import type { Env } from '../_lib/http';
import { dbReady, now } from '../_lib/http';
import type { AdminData } from './_middleware';
import { logAudit } from '../_lib/audit';
import { layout, htmlResponse, csvText, csvResponse, kpi, badge, statusTone, statusLabel, fmtDate, fmtNum, esc, table, emptyState, flash, parseRange, rangeFrom, rangeForm, pager } from '../_lib/admin-ui';

const PAGE_SIZE = 25;
const STATUSES = ['all', 'pending', 'confirmed', 'unsubscribed'] as const;

interface SubRow {
  id: number;
  email: string;
  status: string;
  source_path: string | null;
  created_at: number;
  confirmed_at: number | null;
}

export const onRequestGet: PagesFunction<Env, string, AdminData> = async ({ request, env, data }) => {
  const url = new URL(request.url);
  const range = parseRange(url.searchParams.get('range'));
  const status = (STATUSES as readonly string[]).includes(url.searchParams.get('status') || '') ? (url.searchParams.get('status') as string) : 'all';
  const q = (url.searchParams.get('q') || '').replace(/[%_]/g, '').trim().slice(0, 80);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1) || 1);
  const done = url.searchParams.get('done');
  const error = url.searchParams.get('error');
  const format = url.searchParams.get('format');
  if (!dbReady(env)) return htmlResponse(layout({ title: 'Subscribers', active: 'subscribers', actor: data.admin, body: emptyState('Database not connected', 'Bind D1 as DB.') }), 503);

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
    where.push(`email LIKE ?${params.length}`);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  if (format === 'csv') {
    const rows = await env.DB.prepare(
      `SELECT id, email, status, source_path, created_at, confirmed_at FROM subscribers ${clause} ORDER BY created_at DESC LIMIT 5000`,
    )
      .bind(...params)
      .all<SubRow>();
    await logAudit(env, request, data.admin, 'subscribers.export', {
      target: { type: 'export', id: 'subscribers' },
      after: { rows: rows.results.length, status, range, q: q || null },
    });
    const body = csvText([
      ['id', 'email', 'status', 'source_path', 'created_utc', 'confirmed_utc'],
      ...rows.results.map((r) => [r.id, r.email, r.status, r.source_path ?? '', new Date(r.created_at * 1000).toISOString(), r.confirmed_at ? new Date(r.confirmed_at * 1000).toISOString() : '']),
    ]);
    return csvResponse(body, `subscribers-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  const [counts, total, rows] = await Promise.all([
    env.DB.prepare('SELECT status, COUNT(*) AS n FROM subscribers GROUP BY status').all<{ status: string; n: number }>(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM subscribers ${clause}`).bind(...params).first<{ n: number }>(),
    env.DB.prepare(`SELECT id, email, status, source_path, created_at, confirmed_at FROM subscribers ${clause} ORDER BY created_at DESC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`)
      .bind(...params)
      .all<SubRow>(),
  ]);
  const count = (s: string) => counts.results.find((c) => c.status === s)?.n ?? 0;
  const all = counts.results.reduce((sum, c) => sum + c.n, 0);

  const tableRows = rows.results.map((s) => [
    `<td class="mono">${esc(s.email)}</td>`,
    `<td>${badge(statusLabel(s.status), statusTone(s.status))}</td>`,
    `<td class="mono muted">${esc(s.source_path ?? '—')}</td>`,
    `<td style="white-space:nowrap">${fmtDate(s.created_at)}</td>`,
    `<td style="white-space:nowrap">${fmtDate(s.confirmed_at)}</td>`,
    s.status === 'unsubscribed'
      ? '<td class="muted">—</td>'
      : `<td><details><summary class="btn btn-sm btn-ghost" style="display:inline-flex;cursor:pointer;list-style:none">Unsubscribe…</summary>
          <form method="post" action="/admin/subscribers/${s.id}" class="danger-zone card" style="margin-top:10px;padding:14px;max-width:340px">
            <p style="margin:0 0 10px;font-size:.85rem">This removes <strong>${esc(s.email)}</strong> from every newsletter. Type the address to confirm.</p>
            <div class="field"><label for="c${s.id}">Confirm address</label><input id="c${s.id}" name="confirm" required autocomplete="off" placeholder="${esc(s.email)}"></div>
            <div class="field"><label for="r${s.id}">Reason (optional)</label><input id="r${s.id}" name="reason" maxlength="300" placeholder="e.g. requested by email"></div>
            <button class="btn btn-danger btn-sm" type="submit">Unsubscribe</button>
          </form></details></td>`,
  ]);

  const tabs = STATUSES.map((s) => {
    const qs = new URLSearchParams({ status: s, range, ...(q ? { q } : {}) });
    return `<a href="/admin/subscribers?${qs.toString()}" class="${s === status ? 'btn btn-sm' : 'btn btn-sm btn-ghost'}" style="margin-right:6px">${statusLabel(s)}</a>`;
  }).join('');
  const exportQs = new URLSearchParams({ status, range, format: 'csv', ...(q ? { q } : {}) }).toString();

  const body = `
  ${flash(done ? `Subscriber #${esc(done)} unsubscribed and logged in the audit log.` : null)}
  ${flash(error === 'confirm' ? 'The address did not match, so nothing was changed.' : null, 'bad')}
  <div class="page-head">
    <div><p>Newsletter subscribers. Personal data: export and share only with a clear purpose. Every export is logged.</p></div>
    ${rangeForm('/admin/subscribers', range, { status, ...(q ? { q } : {}) })}
  </div>
  <section class="grid grid-kpi" style="margin-bottom:18px">
    ${kpi('All subscribers', fmtNum(all))}
    ${kpi('Confirmed', fmtNum(count('confirmed')), all ? `${Math.round((count('confirmed') / all) * 100)}% of all`  : '', 'good')}
    ${kpi('Pending confirmation', fmtNum(count('pending')), 'Double opt-in not completed', count('pending') ? 'warn' : 'info')}
    ${kpi('Unsubscribed', fmtNum(count('unsubscribed')))}
  </section>
  <div class="toolbar" style="justify-content:space-between">
    <div>${tabs}</div>
    <div class="toolbar" style="margin:0">
      <form class="toolbar" method="get" action="/admin/subscribers" style="margin:0">
        <input type="hidden" name="status" value="${esc(status)}"><input type="hidden" name="range" value="${esc(range)}">
        <label class="sr" for="q">Search by email</label>
        <input id="q" type="search" name="q" value="${esc(q)}" placeholder="Search by email">
        <button class="btn btn-ghost" type="submit">Search</button>
      </form>
      <a class="btn btn-ghost" href="/admin/subscribers?${exportQs}">Export CSV</a>
    </div>
  </div>
  <p class="muted" style="margin:0 0 12px">${fmtNum(total?.n ?? 0)} matching subscriber${total?.n === 1 ? '' : 's'}</p>
  ${rows.results.length
    ? table(['Email', 'Status', 'Signed up on', 'Created', 'Confirmed', 'Action'], tableRows)
    : emptyState('No subscribers match these filters', 'Try another status, a wider date range or a different search.')}
  ${pager('/admin/subscribers', new URLSearchParams({ status, range, ...(q ? { q } : {}) }), page, total?.n ?? 0, PAGE_SIZE)}`;

  return htmlResponse(layout({ title: 'Subscribers', active: 'subscribers', actor: data.admin, body }));
};

