// Analytics for the selected period, built from first-party data in D1.
// Traffic sources, devices and countries live in Cloudflare Web Analytics, so they are linked, not copied.
import type { Env } from '../_lib/http';
import { dbReady } from '../_lib/http';
import type { AdminData } from './_middleware';
import { layout, htmlResponse, csvText, csvResponse, kpi, parseRange, rangeFrom, rangeForm, barChart, emptyState, fmtNum, esc } from '../_lib/admin-ui';

const DAYS = 30;

export const onRequestGet: PagesFunction<Env, string, AdminData> = async ({ request, env, data }) => {
  const url = new URL(request.url);
  const range = parseRange(url.searchParams.get('range'));
  const from = rangeFrom(range);
  if (!dbReady(env)) return htmlResponse(layout({ title: 'Analytics', active: 'analytics', actor: data.admin, body: emptyState('Database not connected', 'Bind D1 as DB.') }), 503);

  const since = Math.floor(Date.now() / 1000) - (DAYS - 1) * 86400;
  const [subs, msgs, subsDaily, msgsDaily] = await Promise.all([
    env.DB.prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
              SUM(CASE WHEN status = 'unsubscribed' THEN 1 ELSE 0 END) AS unsubscribed,
              SUM(CASE WHEN created_at >= ?1 THEN 1 ELSE 0 END) AS in_period
       FROM subscribers`,
    )
      .bind(from)
      .first<{ total: number; confirmed: number; unsubscribed: number; in_period: number }>(),
    env.DB.prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS open_n,
              SUM(CASE WHEN status = 'answered' THEN 1 ELSE 0 END) AS answered,
              SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed,
              SUM(CASE WHEN created_at >= ?1 THEN 1 ELSE 0 END) AS in_period
       FROM contact_messages`,
    )
      .bind(from)
      .first<{ total: number; open_n: number; answered: number; closed: number; in_period: number }>(),
    env.DB.prepare("SELECT date(created_at, 'unixepoch') AS d, COUNT(*) AS n FROM subscribers WHERE created_at >= ?1 GROUP BY d").bind(since).all<{ d: string; n: number }>(),
    env.DB.prepare("SELECT date(created_at, 'unixepoch') AS d, COUNT(*) AS n FROM contact_messages WHERE created_at >= ?1 GROUP BY d").bind(since).all<{ d: string; n: number }>(),
  ]);

  const days = Array.from({ length: DAYS }, (_, i) => new Date(Date.now() - (DAYS - 1 - i) * 86400000).toISOString().slice(0, 10));
  const subMap = new Map(subsDaily.results.map((r) => [r.d, r.n]));
  const msgMap = new Map(msgsDaily.results.map((r) => [r.d, r.n]));
  const subSeries = days.map((d) => ({ label: d.slice(5), value: subMap.get(d) ?? 0 }));
  const msgSeries = days.map((d) => ({ label: d.slice(5), value: msgMap.get(d) ?? 0 }));

  const total = subs?.total ?? 0;
  const confirmedRate = total ? Math.round(((subs?.confirmed ?? 0) / total) * 100) : 0;
  const unsubRate = total ? Math.round(((subs?.unsubscribed ?? 0) / total) * 100) : 0;
  const answeredRate = msgs?.total ? Math.round(((msgs.answered + msgs.closed) / msgs.total) * 100) : 0;

  if (url.searchParams.get('format') === 'csv') {
    const rows = days.map((d) => [d, subMap.get(d) ?? 0, msgMap.get(d) ?? 0]);
    return csvResponse(csvText([['date_utc', 'new_subscribers', 'new_messages'], ...rows]), `analytics-daily-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  const body = `
  <div class="page-head">
    <div><p>First-party figures from this site's own database, for the selected period. Times are UTC.</p></div>
    <div class="toolbar" style="margin:0">${rangeForm('/admin/analytics', range)}<a class="btn btn-ghost" href="/admin/analytics?format=csv&range=${range}">Export daily CSV</a></div>
  </div>

  <section class="grid grid-kpi" aria-label="Period figures">
    ${kpi('New subscribers', fmtNum(subs?.in_period ?? 0), range === 'all' ? 'All time' : 'Selected period', 'good')}
    ${kpi('Confirmation rate', `${confirmedRate}%`, 'Share of all subscribers who confirmed')}
    ${kpi('Unsubscribe rate', `${unsubRate}%`, 'Share of all subscribers who left', unsubRate > 5 ? 'warn' : 'info')}
    ${kpi('Contact messages', fmtNum(msgs?.in_period ?? 0), 'Selected period')}
    ${kpi('Response rate', `${answeredRate}%`, 'Messages answered or closed', 'info')}
  </section>

  <section class="grid grid-2" style="margin-top:18px">
    <div class="card">
      <div class="card-head"><div><h2>Subscriber sign-ups</h2><p>Last 30 days</p></div></div>
      ${barChart(subSeries, 'New subscribers per day')}
    </div>
    <div class="card">
      <div class="card-head"><div><h2>Contact messages</h2><p>Last 30 days</p></div></div>
      ${barChart(msgSeries, 'Contact messages per day')}
    </div>
  </section>

  <section class="card" style="margin-top:18px">
    <div class="card-head"><div><h2>Traffic, devices and countries</h2><p>Not stored in this database. Cloudflare Web Analytics measures visits without cookies.</p></div></div>
    <dl class="detail-grid">
      <div><dt>Traffic sources</dt><dd><a href="https://dash.cloudflare.com/" target="_blank" rel="noopener">Open in Cloudflare →</a></dd></div>
      <div><dt>Devices and browsers</dt><dd><a href="https://dash.cloudflare.com/" target="_blank" rel="noopener">Open in Cloudflare →</a></dd></div>
      <div><dt>Countries</dt><dd><a href="https://dash.cloudflare.com/" target="_blank" rel="noopener">Open in Cloudflare →</a></dd></div>
      <div><dt>Core Web Vitals</dt><dd><a href="https://dash.cloudflare.com/" target="_blank" rel="noopener">Open in Cloudflare →</a></dd></div>
    </dl>
  </section>

  <section class="card" style="margin-top:18px">
    <div class="card-head"><div><h2>Not applicable to this site yet</h2><p>These need features this website does not have: customer accounts, orders or subscriptions.</p></div></div>
    <p class="muted" style="margin:0">Revenue, refunds, churn, retention, product performance and failed payments will appear here once payments and accounts are added.</p>
  </section>`;

  return htmlResponse(layout({ title: 'Analytics', active: 'analytics', actor: data.admin, body }));
};
