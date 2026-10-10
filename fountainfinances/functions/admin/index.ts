// Overview: the state of the site and its audience at a glance, for the selected period.
import type { Env } from '../_lib/http';
import { dbReady } from '../_lib/http';
import type { AdminData } from './_middleware';
import { runChecks, healthSummary } from '../_lib/health';
import { layout, htmlResponse, kpi, badge, statusTone, statusLabel, fmtDate, fmtNum, esc, table, emptyState, parseRange, rangeFrom, rangeForm, barChart } from '../_lib/admin-ui';

export const onRequestGet: PagesFunction<Env, string, AdminData> = async ({ request, env, data }) => {
  const url = new URL(request.url);
  const range = parseRange(url.searchParams.get('range'));
  const from = rangeFrom(range);
  if (!dbReady(env)) return htmlResponse(layout({ title: 'Overview', active: 'overview', actor: data.admin, body: emptyState('Database not connected', 'Bind D1 as DB in the Pages project settings.') }), 503);

  const [subsByStatus, subsInRange, msgsByStatus, msgsInRange, latest, audit, daily] = await Promise.all([
    env.DB.prepare('SELECT status, COUNT(*) AS n FROM subscribers GROUP BY status').all<{ status: string; n: number }>(),
    env.DB.prepare('SELECT COUNT(*) AS n FROM subscribers WHERE created_at >= ?1').bind(from).first<{ n: number }>(),
    env.DB.prepare('SELECT status, COUNT(*) AS n FROM contact_messages GROUP BY status').all<{ status: string; n: number }>(),
    env.DB.prepare('SELECT COUNT(*) AS n FROM contact_messages WHERE created_at >= ?1').bind(from).first<{ n: number }>(),
    env.DB.prepare('SELECT id, name, topic, status, created_at FROM contact_messages ORDER BY created_at DESC LIMIT 6').all<{ id: number; name: string; topic: string; status: string; created_at: number }>(),
    env.DB.prepare('SELECT created_at, actor, action, target_type, target_id FROM admin_audit_log ORDER BY id DESC LIMIT 6').all<{ created_at: number; actor: string; action: string; target_type: string; target_id: string }>(),
    env.DB.prepare("SELECT date(created_at, 'unixepoch') AS d, COUNT(*) AS n FROM subscribers WHERE created_at >= ?1 GROUP BY d ORDER BY d").bind(Math.floor(Date.now() / 1000) - 29 * 86400).all<{ d: string; n: number }>(),
  ]);

  const count = (rows: { status: string; n: number }[], s: string) => rows.find((r) => r.status === s)?.n ?? 0;
  const confirmed = count(subsByStatus.results, 'confirmed');
  const pending = count(subsByStatus.results, 'pending');
  const newMsgs = count(msgsByStatus.results, 'new');
  const checks = await runChecks(env);
  const { score, overall } = healthSummary(checks);
  const attention = checks.filter((c) => c.status === 'failed' || c.status === 'warning');

  // Last 30 days, filled with zeros so gaps are visible.
  const byDay = new Map(daily.results.map((r) => [r.d, r.n]));
  const series = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10);
    return { label: d.slice(5), value: byDay.get(d) ?? 0 };
  });

  const body = `
  <div class="page-head">
    <div><p class="muted">Figures use the selected period. Times are UTC.</p></div>
    ${rangeForm('/admin', range)}
  </div>

  <section class="card hero-status" style="margin-bottom:18px" aria-labelledby="health-h">
    <div class="score" style="--s:${score}" role="img" aria-label="Health score ${score} out of 100"><strong>${score}</strong></div>
    <div style="flex:1;min-width:220px">
      <h2 id="health-h">Website health</h2>
      <p class="muted" style="margin:4px 0 10px">${
        overall === 'healthy' ? 'Everything that is configured is working.' : overall === 'warning' ? `${attention.length} item${attention.length === 1 ? '' : 's'} need attention.` : 'A critical service needs attention now.'
      }</p>
      ${badge(statusLabel(overall), statusTone(overall))} <a href="/admin/health" style="margin-left:10px;font-weight:600">Open health checks →</a>
    </div>
    ${attention.length ? `<ul class="list" style="flex-basis:100%;margin:0">${attention
      .slice(0, 4)
      .map((c) => `<li class="list-item"><span>${esc(c.label)}<small>${esc(c.detail)}</small></span>${badge(statusLabel(c.status), statusTone(c.status))}</li>`)
      .join('')}</ul>` : ''}
  </section>

  <section class="grid grid-kpi" aria-label="Key figures">
    ${kpi('Confirmed subscribers', fmtNum(confirmed), `${fmtNum(pending)} waiting to confirm`, 'good')}
    ${kpi('New subscribers', fmtNum(subsInRange?.n ?? 0), range === 'all' ? 'All time' : 'In selected period')}
    ${kpi('New messages', fmtNum(newMsgs), 'Waiting for a reply', newMsgs ? 'warn' : 'info')}
    ${kpi('Messages in period', fmtNum(msgsInRange?.n ?? 0), 'Contact form submissions')}
  </section>

  <section class="grid grid-2" style="margin-top:18px">
    <div class="card">
      <div class="card-head"><div><h2>Subscriber sign-ups</h2><p>Last 30 days, by day (UTC)</p></div><a href="/admin/subscribers">All subscribers →</a></div>
      ${barChart(series, 'New subscribers per day, last 30 days')}
    </div>
    <div class="card">
      <div class="card-head"><div><h2>Recent messages</h2><p>Latest contact form submissions</p></div><a href="/admin/messages">Open inbox →</a></div>
      ${latest.results.length
        ? `<div class="list">${latest.results
            .map((m) => `<a class="list-item" href="/admin/messages?q=${encodeURIComponent(m.name)}" style="color:inherit"><span><strong>${esc(m.name)}</strong> <span class="muted">· ${esc(m.topic)}</span><small>${fmtDate(m.created_at)}</small></span>${badge(statusLabel(m.status), statusTone(m.status))}</a>`)
            .join('')}</div>`
        : emptyState('No messages yet', 'Messages from the contact form will appear here.')}
    </div>
  </section>

  <section class="card" style="margin-top:18px">
    <div class="card-head"><div><h2>Latest admin activity</h2><p>Every sensitive action is recorded in the audit log</p></div><a href="/admin/audit">Full audit log →</a></div>
    ${audit.results.length
      ? table(['When', 'Who', 'Action', 'Target'], audit.results.map((a) => `<td>${fmtDate(a.created_at)}</td><td>${esc(a.actor)}</td><td><span class="mono">${esc(a.action)}</span></td><td>${esc(a.target_type)} ${esc(a.target_id)}</td>`))
      : emptyState('No admin activity yet', 'Actions you take in this dashboard are logged here.')}
  </section>`;

  return htmlResponse(layout({ title: 'Overview', active: 'overview', actor: data.admin, body }));
};
