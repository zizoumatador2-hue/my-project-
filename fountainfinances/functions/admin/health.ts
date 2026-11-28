// Website health: live checks, configuration status and table sizes. Secrets are never printed.
import type { Env } from '../_lib/http';
import { dbReady } from '../_lib/http';
import type { AdminData } from './_middleware';
import { runChecks, healthSummary, ENV_VARS, isSet, type Check } from '../_lib/health';
import { layout, htmlResponse, badge, statusTone, statusLabel, esc, fmtNum, fmtDate } from '../_lib/admin-ui';

const checkRow = (c: Check) => `<div class="check">
  <div><strong>${esc(c.label)}</strong>${c.ms !== undefined ? ` <span class="muted" style="font-size:.8rem">${c.ms} ms</span>` : ''}</div>
  ${badge(statusLabel(c.status), statusTone(c.status))}
  <p>${esc(c.detail)}</p>
</div>`;

export const onRequestGet: PagesFunction<Env, string, AdminData> = async ({ env, data }) => {
  const checks = await runChecks(env);
  const { score, overall } = healthSummary(checks);
  const groups = [...new Set(checks.map((c) => c.group))];

  const counts: { table: string; n: number }[] = [];
  if (dbReady(env)) {
    for (const table of ['subscribers', 'contact_messages', 'admin_audit_log', 'rate_limits']) {
      const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>().catch(() => null);
      counts.push({ table, n: row?.n ?? -1 });
    }
  }
  const lastAudit = dbReady(env) ? await env.DB.prepare('SELECT created_at FROM admin_audit_log ORDER BY id DESC LIMIT 1').first<{ created_at: number }>().catch(() => null) : null;

  const envRows = ENV_VARS.map((v) => {
    const set = isSet(env, v.name);
    const status = set ? 'working' : v.required ? 'failed' : 'not_configured';
    return `<tr><td class="mono">${esc(v.name)}</td><td>${badge(set ? 'Set' : v.required ? 'Missing' : 'Not set', statusTone(status))}</td><td>${v.required ? 'Required' : 'Optional'}</td><td class="muted">${esc(v.purpose)}</td><td class="muted">${v.secret ? 'Secret (value hidden)' : 'Config'}</td></tr>`;
  }).join('');

  const body = `
  <div class="page-head">
    <div><p>Live checks run when you open this page. Values of secrets are never shown: only whether they are set.</p></div>
    <a class="btn" href="/admin/health">Re-check now</a>
  </div>

  <section class="card hero-status" style="margin-bottom:18px">
    <div class="score" style="--s:${score}" role="img" aria-label="Health score ${score} out of 100"><strong>${score}</strong></div>
    <div style="flex:1">
      <h2>Overall: ${esc(statusLabel(overall))}</h2>
      <p class="muted" style="margin:4px 0 10px">Score counts working services fully and warnings at half. Services this website does not use are excluded.</p>
      <div class="meter" aria-hidden="true"><span style="width:${score}%"></span></div>
    </div>
  </section>

  ${groups
    .map((g) => `<div class="check-group">${esc(g)}</div><div class="check-list">${checks.filter((c) => c.group === g).map(checkRow).join('')}</div>`)
    .join('')}

  <section class="grid grid-2" style="margin-top:22px">
    <div class="card">
      <div class="card-head"><div><h2>Background jobs and errors</h2><p>What this site records</p></div></div>
      <div class="list">
        <div class="list-item"><span>Last successful job<small>No job queue in this project</small></span>${badge('Not configured', 'muted')}</div>
        <div class="list-item"><span>Last failed job<small>No job queue in this project</small></span>${badge('Not configured', 'muted')}</div>
        <div class="list-item"><span>Recent server errors<small>Stored by Cloudflare Pages logs, not in the database. Open Pages → Deployments → Functions logs.</small></span>${badge('External', 'info')}</div>
        <div class="list-item"><span>Last admin action<small>From the audit log</small></span><span>${lastAudit ? fmtDate(lastAudit.created_at) : '—'}</span></div>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><div><h2>Database tables</h2><p>Row counts in D1</p></div></div>
      ${counts.length
        ? `<div class="list">${counts
            .map((c) => `<div class="list-item"><span class="mono">${esc(c.table)}</span><span>${c.n < 0 ? badge('Unreadable', 'bad') : fmtNum(c.n)}</span></div>`)
            .join('')}</div>`
        : '<p class="muted">Bind D1 to see table sizes.</p>'}
    </div>
  </section>

  <section class="card" style="margin-top:18px">
    <div class="card-head"><div><h2>Environment variables</h2><p>Presence only. Values are never displayed or returned to the browser.</p></div></div>
    <div class="table-wrap"><table><thead><tr><th>Name</th><th>Status</th><th>Needed</th><th>Used for</th><th>Type</th></tr></thead><tbody>${envRows}</tbody></table></div>
  </section>

  <section class="card" style="margin-top:18px">
    <div class="card-head"><div><h2>Not in this project</h2><p>Monitoring for these services is listed so nothing looks silently missing.</p></div></div>
    <p class="muted" style="margin:0">Payment gateway, SMS and WhatsApp, AI API, webhooks, queues and cron jobs, and uptime monitoring are not part of this website. When one is added, it will get a live check here.</p>
  </section>`;

  return htmlResponse(layout({ title: 'Website health', active: 'health', actor: data.admin, body }));
};

