// Shared look and helpers for the admin dashboard. Server-rendered HTML, no client JavaScript:
// the admin area uses plain forms and links, so it works even when scripts are blocked.
// Brand tokens match the public site (navy, teal, gold). Light and dark follow the OS setting.

export const esc = (v: unknown): string =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

export type Tone = 'good' | 'warn' | 'bad' | 'info' | 'muted';
export const badge = (text: string, tone: Tone = 'muted') => `<span class="badge badge-${tone}">${esc(text)}</span>`;

export const statusTone = (s: string): Tone => {
  if (['working', 'confirmed', 'answered', 'healthy'].includes(s)) return 'good';
  if (['warning', 'pending', 'new'].includes(s)) return 'warn';
  if (['failed', 'critical', 'unsubscribed'].includes(s)) return 'bad';
  if (['not_configured', 'closed'].includes(s)) return 'muted';
  return 'info';
};
export const statusLabel = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export const fmtDate = (s: number | null | undefined): string =>
  s ? `${new Date(s * 1000).toISOString().replace('T', ' ').slice(0, 16)} UTC` : '—';
export const fmtNum = (n: number | null | undefined): string => (n ?? 0).toLocaleString('en-US');

export type Range = 'today' | '7d' | '30d' | 'month' | 'ytd' | 'all';
export const RANGES: [Range, string][] = [
  ['today', 'Today'],
  ['7d', 'Last 7 days'],
  ['30d', 'Last 30 days'],
  ['month', 'This month'],
  ['ytd', 'Year to date'],
  ['all', 'All time'],
];
export const parseRange = (s: string | null): Range => (RANGES.some(([k]) => k === s) ? (s as Range) : 'today');

/** Start of the selected window in Unix seconds (UTC). 0 means no lower bound. */
export function rangeFrom(r: Range): number {
  const d = new Date();
  const startOfDay = Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000);
  switch (r) {
    case 'today':
      return startOfDay;
    case '7d':
      return startOfDay - 6 * 86400;
    case '30d':
      return startOfDay - 29 * 86400;
    case 'month':
      return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 1000);
    case 'ytd':
      return Math.floor(Date.UTC(d.getUTCFullYear(), 0, 1) / 1000);
    default:
      return 0;
  }
}

/** CSV cell escaping, plus a guard against spreadsheet formula injection. */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export const csvText = (rows: unknown[][]): string => rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';

export function csvResponse(body: string, filename: string): Response {
  return new Response(body, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}

export function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
      'x-frame-options': 'DENY',
      // No scripts at all in the admin area: forms and links only.
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    },
  });
}

export const kpi = (label: string, value: string, hint = '', tone: Tone = 'info') =>
  `<div class="kpi kpi-${tone}"><span class="kpi-label">${esc(label)}</span><strong class="kpi-value">${esc(value)}</strong>${hint ? `<span class="kpi-hint">${esc(hint)}</span>` : ''}</div>`;

export const emptyState = (title: string, text: string) =>
  `<div class="empty"><strong>${esc(title)}</strong><p>${esc(text)}</p></div>`;

export const flash = (msg: string | null, tone: Tone = 'good') => (msg ? `<div class="flash flash-${tone}" role="status">${esc(msg)}</div>` : '');

/** Rows may be a single HTML string of cells, or an array of cell HTML strings. */
export function table(heads: string[], rows: (string | string[])[]): string {
  if (!rows.length) return '';
  const body = rows.map((r) => `<tr>${Array.isArray(r) ? r.join('') : r}</tr>`).join('');
  return `<div class="table-wrap"><table><thead><tr>${heads.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/** Previous and next links that keep every current filter. */
export function pager(path: string, params: URLSearchParams, page: number, total: number, size: number): string {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return '';
  const href = (p: number) => {
    const q = new URLSearchParams(params);
    q.set('page', String(p));
    return `${path}?${q.toString()}`;
  };
  return `<nav class="pager" aria-label="Pages"><span>Page ${page} of ${pages} · ${fmtNum(total)} records</span><span class="pager-links">${
    page > 1 ? `<a href="${esc(href(page - 1))}">← Previous</a>` : '<span class="muted">← Previous</span>'
  }${page < pages ? `<a href="${esc(href(page + 1))}">Next →</a>` : '<span class="muted">Next →</span>'}</span></nav>`;
}

/** Plain SVG bar chart with native tooltips. Accessible label on the image. */
export function barChart(points: { label: string; value: number }[], label: string): string {
  if (!points.length || points.every((p) => p.value === 0)) return emptyState('No activity in this period', 'Bars appear once records arrive.');
  const w = 720;
  const h = 200;
  const pad = 28;
  const max = Math.max(1, ...points.map((p) => p.value));
  const slot = (w - pad * 2) / points.length;
  const bars = points
    .map((p, i) => {
      const bh = (p.value / max) * (h - pad * 2);
      const x = pad + i * slot + slot * 0.18;
      const y = h - pad - bh;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(slot * 0.64).toFixed(1)}" height="${Math.max(bh, 0).toFixed(1)}" rx="3"><title>${esc(p.label)}: ${fmtNum(p.value)}</title></rect>`;
    })
    .join('');
  const step = Math.ceil(points.length / 6);
  const ticks = points
    .map((p, i) => (i % step === 0 ? `<text x="${(pad + i * slot + slot / 2).toFixed(1)}" y="${h - 6}" text-anchor="middle">${esc(p.label)}</text>` : ''))
    .join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">${bars}${ticks}</svg>`;
}

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: string;
}

const NAV: NavItem[] = [
  { key: 'overview', label: 'Overview', href: '/admin', icon: '◎' },
  { key: 'messages', label: 'Messages', href: '/admin/messages', icon: '✉' },
  { key: 'subscribers', label: 'Subscribers', href: '/admin/subscribers', icon: '◉' },
  { key: 'analytics', label: 'Analytics', href: '/admin/analytics', icon: '▲' },
  { key: 'health', label: 'Website health', href: '/admin/health', icon: '♥' },
  { key: 'audit', label: 'Audit log', href: '/admin/audit', icon: '≡' },
  { key: 'settings', label: 'Settings', href: '/admin/settings', icon: '⚙' },
];

/** Range picker: a plain GET form, so it works without JavaScript. */
export function rangeForm(path: string, range: Range, keep: Record<string, string> = {}): string {
  const hidden = Object.entries(keep)
    .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`)
    .join('');
  return `<form class="range" method="get" action="${esc(path)}">${hidden}<label><span class="sr">Date range</span><select name="range">${RANGES.map(
    ([k, l]) => `<option value="${k}"${k === range ? ' selected' : ''}>${esc(l)}</option>`,
  ).join('')}</select></label><button class="btn btn-ghost" type="submit">Apply</button></form>`;
}

export function layout(o: { title: string; active: string; actor: string; body: string; top?: string }): string {
  const nav = NAV.map(
    (n) =>
      `<a href="${n.href}" class="nav-item${n.key === o.active ? ' is-active' : ''}"${n.key === o.active ? ' aria-current="page"' : ''}><span class="nav-icon" aria-hidden="true">${n.icon}</span><span>${esc(n.label)}</span></a>`,
  ).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(o.title)} · Admin · Fountain Finances</title>
<style>${ADMIN_CSS}</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="shell">
  <aside class="sidebar" aria-label="Admin navigation">
    <a class="brand" href="/admin"><span class="brand-mark" aria-hidden="true">⛲</span><span><strong>Fountain Finances</strong><small>Control room</small></span></a>
    <nav class="nav">${nav}</nav>
    <div class="sidebar-foot">
      <a href="https://fountainfinances.com/" class="nav-item">↗ <span>Public site</span></a>
      <a href="/cdn-cgi/access/logout" class="nav-item">⎋ <span>Sign out</span></a>
    </div>
  </aside>
  <div class="main-wrap">
    <header class="topbar">
      <div class="topbar-title"><h1>${esc(o.title)}</h1></div>
      <div class="topbar-tools">${o.top || ''}<span class="who" title="Signed in as">${esc(o.actor)}</span></div>
    </header>
    <main id="main" class="main">${o.body}</main>
  </div>
</div>
</body>
</html>`;
}

const ADMIN_CSS = `
:root{--navy:#0b1a28;--navy-2:#0d2433;--teal:#0a6a6b;--teal-2:#13a3a0;--gold:#e2b65a;--bg:#f3f6f7;--card:#ffffff;--ink:#0f1d2b;--muted:#5b6b78;--line:#e1e8ed;--soft:#f7fafb;--good:#0f7b5f;--good-bg:#e3f5ee;--warn:#8a5a00;--warn-bg:#fdf1d8;--bad:#a4262c;--bad-bg:#fbe5e6;--info:#1d5b8c;--info-bg:#e4eff9;--serif:Georgia,"Source Serif 4",serif;--sans:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#0a141e;--card:#10202e;--ink:#e6eef4;--muted:#93a4b2;--line:#1d3143;--soft:#0d1b28;--good-bg:#0f3327;--warn-bg:#3a2c0c;--bad-bg:#3d1719;--info-bg:#0f2b44;--good:#6fd3b0;--warn:#f0c46a;--bad:#ff8c90;--info:#8dc2ee;color-scheme:dark}}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 var(--sans);-webkit-font-smoothing:antialiased}
a{color:var(--teal);text-decoration:none}a:hover{text-decoration:underline}
h1,h2,h3{font-family:var(--serif);letter-spacing:-.01em;margin:0}
h1{font-size:1.5rem;font-weight:700}h2{font-size:1.15rem;font-weight:700}h3{font-size:1rem;font-weight:700}
.muted{color:var(--muted)}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.skip{position:absolute;left:-999px}.skip:focus{left:12px;top:12px;background:var(--card);padding:8px 12px;border-radius:8px;z-index:9}
:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
.shell{display:grid;grid-template-columns:248px minmax(0,1fr);min-height:100vh}
.sidebar{background:linear-gradient(180deg,var(--navy),var(--navy-2));color:#dbe7ee;padding:22px 16px;display:flex;flex-direction:column;gap:22px;position:sticky;top:0;height:100vh}
.brand{display:flex;gap:12px;align-items:center;color:#fff;padding:4px 8px}.brand:hover{text-decoration:none}
.brand-mark{width:38px;height:38px;border-radius:11px;background:var(--teal);display:grid;place-items:center;font-size:19px;box-shadow:0 0 0 1px rgba(255,255,255,.08) inset}
.brand strong{display:block;font-family:var(--serif);font-size:1rem}.brand small{color:var(--gold);letter-spacing:.08em;text-transform:uppercase;font-size:.68rem}
.nav{display:flex;flex-direction:column;gap:4px}
.nav-item{display:flex;gap:12px;align-items:center;padding:10px 12px;border-radius:10px;color:#c7d6df;font-weight:500;transition:background .2s,color .2s}
.nav-item:hover{background:rgba(255,255,255,.06);color:#fff;text-decoration:none}
.nav-item.is-active{background:rgba(19,163,160,.18);color:#fff;box-shadow:inset 3px 0 0 var(--gold)}
.nav-icon{width:20px;text-align:center;opacity:.9}
.sidebar-foot{margin-top:auto;display:flex;flex-direction:column;gap:4px;border-top:1px solid rgba(255,255,255,.08);padding-top:14px}
.main-wrap{min-width:0}
.topbar{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 32px;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--line);flex-wrap:wrap}
.topbar-tools{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.who{font-size:.85rem;color:var(--muted);background:var(--card);border:1px solid var(--line);padding:6px 12px;border-radius:999px}
.main{padding:28px 32px 56px;max-width:1280px}
.page-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-end;flex-wrap:wrap;margin-bottom:22px}
.page-head p{margin:4px 0 0;color:var(--muted);max-width:60ch}
.grid{display:grid;gap:16px}.grid-kpi{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}.grid-2{grid-template-columns:repeat(auto-fit,minmax(340px,1fr))}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px;box-shadow:0 1px 2px rgba(15,29,43,.04)}
.card-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap}
.card-head p{margin:2px 0 0;color:var(--muted);font-size:.85rem}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 18px;display:flex;flex-direction:column;gap:4px;position:relative;overflow:hidden}
.kpi::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--teal-2)}
.kpi-warn::before{background:var(--gold)}.kpi-bad::before{background:var(--bad)}.kpi-good::before{background:var(--good)}
.kpi-label{font-size:.78rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600}
.kpi-value{font-family:var(--serif);font-size:1.9rem;line-height:1.1}
.kpi-hint{font-size:.8rem;color:var(--muted)}
.badge{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:.75rem;font-weight:600;white-space:nowrap}
.badge::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.badge-good{background:var(--good-bg);color:var(--good)}.badge-warn{background:var(--warn-bg);color:var(--warn)}.badge-bad{background:var(--bad-bg);color:var(--bad)}.badge-info{background:var(--info-bg);color:var(--info)}.badge-muted{background:var(--soft);color:var(--muted);border:1px solid var(--line)}
.table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:14px;background:var(--card)}
table{width:100%;border-collapse:collapse;font-size:.9rem}
th,td{text-align:left;padding:12px 14px;border-bottom:1px solid var(--line);vertical-align:middle}
th{font-size:.74rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);background:var(--soft);position:sticky;top:0;font-weight:700}
tr:last-child td{border-bottom:0}tbody tr:hover td{background:color-mix(in srgb,var(--teal-2) 5%,transparent)}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
.toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px}
.toolbar input[type=search],.toolbar select,.field input,.field select,.field textarea{font:inherit;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:10px;padding:9px 12px;min-width:0}
.toolbar input[type=search]{min-width:260px;flex:1}
.field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}.field label{font-weight:600;font-size:.85rem}
.field textarea{min-height:90px;width:100%}.field input,.field select{width:100%}
.btn{display:inline-flex;align-items:center;gap:8px;font:inherit;font-weight:600;border-radius:10px;padding:9px 16px;border:1px solid transparent;cursor:pointer;background:var(--teal);color:#fff;transition:transform .15s,background .2s}
.btn:hover{text-decoration:none;background:#085a5b;transform:translateY(-1px)}
.btn-ghost{background:var(--card);color:var(--ink);border-color:var(--line)}.btn-ghost:hover{background:var(--soft)}
.btn-danger{background:var(--bad);color:#fff}.btn-danger:hover{background:#86181d}
.btn-sm{padding:6px 12px;font-size:.85rem}
.range{display:flex;gap:8px;align-items:center}
.range select{font:inherit;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px 12px}
.topbar .range select{min-width:170px}
.flash{padding:12px 16px;border-radius:12px;margin-bottom:18px;font-weight:600}
.flash-good{background:var(--good-bg);color:var(--good)}.flash-bad{background:var(--bad-bg);color:var(--bad)}.flash-warn{background:var(--warn-bg);color:var(--warn)}
.empty{text-align:center;padding:36px 20px;border:1px dashed var(--line);border-radius:14px;color:var(--muted);background:var(--soft)}
.empty strong{color:var(--ink);display:block;margin-bottom:4px}
.empty p{margin:0}
.pager{display:flex;justify-content:space-between;align-items:center;margin-top:14px;color:var(--muted);font-size:.85rem;flex-wrap:wrap;gap:8px}
.pager-links{display:flex;gap:16px}
.chart{width:100%;height:auto;display:block}
.chart rect{fill:var(--teal-2);opacity:.85;transition:opacity .2s}.chart rect:hover{opacity:1}
.chart text{fill:var(--muted);font-size:12px}
.meter{height:10px;border-radius:999px;background:var(--soft);border:1px solid var(--line);overflow:hidden}
.meter span{display:block;height:100%;background:linear-gradient(90deg,var(--teal-2),var(--gold))}
.check-list{display:grid;gap:10px}
.check{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 16px;align-items:center;padding:14px 16px;border:1px solid var(--line);border-radius:12px;background:var(--card)}
.check p{grid-column:1/-1;margin:0;color:var(--muted);font-size:.85rem}
.check-group{font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:700;margin:18px 0 8px}
.hero-status{display:flex;gap:22px;align-items:center;flex-wrap:wrap}
.score{width:116px;height:116px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--teal-2) calc(var(--s)*1%),var(--line) 0);position:relative;flex:none}
.score::after{content:"";position:absolute;inset:10px;background:var(--card);border-radius:50%}
.score strong{position:relative;z-index:1;font-family:var(--serif);font-size:1.9rem}
.list{display:grid;gap:0}
.list-item{display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid var(--line);align-items:center;flex-wrap:wrap}
.list-item:last-child{border-bottom:0}
.list-item small{color:var(--muted);display:block}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.82rem}
.danger-zone{border-color:color-mix(in srgb,var(--bad) 35%,var(--line))}
.stack{display:grid;gap:18px}
.detail-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.detail-grid dt{font-size:.75rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700}
.detail-grid dd{margin:2px 0 0;font-weight:600}
.msg-body{white-space:pre-wrap;background:var(--soft);border:1px solid var(--line);border-radius:12px;padding:14px;margin:0}
@media (max-width:900px){
  .shell{grid-template-columns:minmax(0,1fr)}
  .sidebar{position:static;height:auto;padding:14px 16px;flex-direction:column;gap:10px}
  .sidebar .brand{padding:0}
  .nav{flex-direction:row;overflow-x:auto;gap:6px;min-width:0;padding-bottom:2px;scrollbar-width:none}
  .nav::-webkit-scrollbar{display:none}
  .nav-item{white-space:nowrap;padding:8px 10px;font-size:.9rem;flex:none}
  .sidebar-foot{flex-direction:row;justify-content:flex-end;margin-top:0;border-top:0;padding-top:0;gap:14px}
  .sidebar-foot .nav-item{padding:4px 0;font-size:.85rem}
  .topbar{padding:12px 16px}.main{padding:20px 16px 40px}
}
@media (max-width:560px){.hero-status>div{min-width:0!important}.card{min-width:0}.kpi-value{font-size:1.5rem}.grid-2{grid-template-columns:1fr}.toolbar input[type=search]{min-width:0;width:100%}.hero-status{flex-direction:column;align-items:flex-start}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;
