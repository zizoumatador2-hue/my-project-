// Audit log: every sensitive admin action, with who, when, what changed and why. Searchable and exportable.
import type { Env } from '../_lib/http';
import { dbReady } from '../_lib/http';
import type { AdminData } from './_middleware';
import { logAudit } from '../_lib/audit';
import { layout, htmlResponse, csvText, csvResponse, table, emptyState, esc, fmtDate, fmtNum, pager } from '../_lib/admin-ui';

const PAGE_SIZE = 50;

interface AuditRow {
  id: number;
  created_at: number;
  actor: string;
  action: string;
  target_type: string;
  target_id: string;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  ip_hash: string | null;
}

export const onRequestGet: PagesFunction<Env, string, AdminData> = async ({ request, env, data }) => {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').replace(/[%_]/g, '').trim().slice(0, 80);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1) || 1);
  if (!dbReady(env)) return htmlResponse(layout({ title: 'Audit log', active: 'audit', actor: data.admin, body: emptyState('Database not connected', 'Bind D1 as DB.') }), 503);

  const clause = q ? 'WHERE actor LIKE ?1 OR action LIKE ?1 OR target_id LIKE ?1 OR target_type LIKE ?1' : '';
  const bind = q ? [`%${q}%`] : [];

  if (url.searchParams.get('format') === 'csv') {
    const rows = await env.DB.prepare(`SELECT * FROM admin_audit_log ${clause} ORDER BY id DESC LIMIT 10000`).bind(...bind).all<AuditRow>();
    await logAudit(env, request, data.admin, 'audit.export', { target: { type: 'export', id: 'audit_log' }, after: { rows: rows.results.length, q: q || null } });
    const body = csvText([
      ['id', 'created_utc', 'actor', 'action', 'target_type', 'target_id', 'old_value', 'new_value', 'reason', 'ip_hash'],
      ...rows.results.map((r) => [r.id, new Date(r.created_at * 1000).toISOString(), r.actor, r.action, r.target_type, r.target_id, r.old_value, r.new_value, r.reason, r.ip_hash]),
    ]);
    return csvResponse(body, `audit-log-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  const total = await env.DB.prepare(`SELECT COUNT(*) AS n FROM admin_audit_log ${clause}`).bind(...bind).first<{ n: number }>();
  const rows = await env.DB.prepare(`SELECT * FROM admin_audit_log ${clause} ORDER BY id DESC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`)
    .bind(...bind)
    .all<AuditRow>();

  const tableRows = rows.results.map((r) => [
    `<td style="white-space:nowrap">${fmtDate(r.created_at)}</td>`,
    `<td>${esc(r.actor)}</td>`,
    `<td><span class="mono">${esc(r.action)}</span></td>`,
    `<td>${esc(r.target_type)} <span class="mono muted">${esc(r.target_id)}</span></td>`,
    `<td class="mono" style="font-size:.78rem;max-width:260px;overflow-wrap:anywhere">${r.old_value || r.new_value ? `<span class="muted">from</span> ${esc(r.old_value ?? '—')}<br><span class="muted">to</span> ${esc(r.new_value ?? '—')}` : '—'}</td>`,
    `<td>${r.reason ? esc(r.reason) : '<span class="muted">—</span>'}</td>`,
    `<td class="mono muted" style="font-size:.78rem">${esc(r.ip_hash ?? '—')}</td>`,
  ]);

  const body = `
  <div class="page-head">
    <div><p>Recorded for admin logins, status changes, unsubscribes and exports. Entries cannot be edited from the dashboard.</p></div>
    <a class="btn btn-ghost" href="/admin/audit?format=csv${q ? `&q=${encodeURIComponent(q)}` : ''}">Export CSV</a>
  </div>
  <form class="toolbar" method="get" action="/admin/audit">
    <label class="sr" for="q">Search the audit log</label>
    <input id="q" type="search" name="q" value="${esc(q)}" placeholder="Search by actor, action or target">
    <button class="btn btn-ghost" type="submit">Search</button>
  </form>
  <p class="muted" style="margin:0 0 12px">${fmtNum(total?.n ?? 0)} entr${total?.n === 1 ? 'y' : 'ies'}</p>
  ${rows.results.length
    ? table(['When', 'Who', 'Action', 'Target', 'Change', 'Reason', 'IP (hashed)'], tableRows)
    : emptyState('No audit entries yet', 'Admin actions, such as status changes, unsubscribes and exports, appear here.')}
  ${pager('/admin/audit', new URLSearchParams(q ? { q } : {}), page, total?.n ?? 0, PAGE_SIZE)}`;

  return htmlResponse(layout({ title: 'Audit log', active: 'audit', actor: data.admin, body }));
};
