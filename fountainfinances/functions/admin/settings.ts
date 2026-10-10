// Settings: a read-only view of configuration. Changing secrets happens in Cloudflare, never in this page.
import type { Env } from '../_lib/http';
import type { AdminData } from './_middleware';
import { isSet, ENV_VARS } from '../_lib/health';
import { layout, htmlResponse, badge, statusTone, esc } from '../_lib/admin-ui';

/** Shows the first characters of an identifier and hides the rest. */
const mask = (v: string) => (v.length <= 6 ? '••••' : `${v.slice(0, 4)}…${'•'.repeat(4)}`);

export const onRequestGet: PagesFunction<Env, string, AdminData> = async ({ env, data }) => {
  const admins = (env.ADMIN_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const feature = (label: string, on: boolean, note: string) =>
    `<div class="list-item"><span>${esc(label)}<small>${esc(note)}</small></span>${badge(on ? 'On' : 'Off', on ? 'good' : 'muted')}</div>`;

  const body = `
  <div class="page-head">
    <div><p>Read-only view. To change a secret, edit it in the Cloudflare dashboard, then redeploy. Secrets are never displayed here.</p></div>
  </div>

  <section class="grid grid-2">
    <div class="card">
      <div class="card-head"><div><h2>Site</h2><p>Public configuration</p></div></div>
      <dl class="detail-grid">
        <div><dt>Canonical address</dt><dd>${esc(env.SITE_URL || 'Not set')}</dd></div>
        <div><dt>Database</dt><dd>${isSet(env, 'DB') ? 'D1 bound' : 'Not bound'}</dd></div>
        <div><dt>Contact alerts to</dt><dd>${isSet(env, 'CONTACT_TO_EMAIL') ? 'Configured (hidden)' : 'Not set'}</dd></div>
        <div><dt>Email sender</dt><dd>${isSet(env, 'EMAIL_FROM') ? 'Configured (hidden)' : 'Not set'}</dd></div>
      </dl>
    </div>

    <div class="card">
      <div class="card-head"><div><h2>Features</h2><p>Turned on by configuration, not by a switch in this page</p></div></div>
      <div class="list">
        ${feature('Newsletter with double opt-in', isSet(env, 'DB') && isSet(env, 'RESEND_API_KEY'), 'Sign-ups need email confirmation; without email, they wait as pending')}
        ${feature('Contact form', isSet(env, 'DB'), 'Messages are stored in the inbox')}
        ${feature('Email alerts for messages', isSet(env, 'CONTACT_TO_EMAIL') && isSet(env, 'RESEND_API_KEY'), 'Owner receives a copy of each message')}
        ${feature('Bot check on forms', isSet(env, 'TURNSTILE_SECRET_KEY'), 'Cloudflare Turnstile on the contact form')}
      </div>
    </div>
  </section>

  <section class="card" style="margin-top:18px">
    <div class="card-head"><div><h2>Admin access</h2><p>Who can open this dashboard</p></div></div>
    <dl class="detail-grid">
      <div><dt>Sign-in method</dt><dd>Cloudflare Access (verified server-side)</dd></div>
      <div><dt>Access team</dt><dd class="mono">${env.ACCESS_TEAM_DOMAIN ? esc(mask(env.ACCESS_TEAM_DOMAIN)) : 'Not set'}</dd></div>
      <div><dt>Application audience</dt><dd class="mono">${env.ACCESS_AUD ? esc(mask(env.ACCESS_AUD)) : 'Not set'}</dd></div>
      <div><dt>Role model</dt><dd>Owner (single role)</dd></div>
    </dl>
    <h3 style="margin:18px 0 8px;font-size:.95rem">Allowed admin emails</h3>
    ${admins.length
      ? `<div class="list">${admins.map((a) => `<div class="list-item"><span class="mono">${esc(a)}</span>${badge('Allowed', 'good')}</div>`).join('')}</div>`
      : `<p class="muted" style="margin:0">No allowlist set. Any account allowed by the Access policy can open this area. ${badge('Set ADMIN_EMAILS', 'warn')}</p>`}
  </section>

  <section class="card" style="margin-top:18px">
    <div class="card-head"><div><h2>Secrets and keys</h2><p>Only whether each one is set. Values are never shown.</p></div></div>
    <div class="list">${ENV_VARS.filter((v) => v.secret).map((v) => `<div class="list-item"><span class="mono">${esc(v.name)}<small>${esc(v.purpose)}</small></span>${badge(isSet(env, v.name) ? 'Set' : 'Not set', statusTone(isSet(env, v.name) ? 'working' : 'not_configured'))}</div>`).join('')}</div>
  </section>

  <section class="card danger-zone" style="margin-top:18px">
    <div class="card-head"><div><h2>Maintenance mode and feature flags</h2><p>Not available from the dashboard yet</p></div></div>
    <p class="muted" style="margin:0">Switching the site into maintenance mode needs a server-side flag, which this project does not have yet. Nothing here changes live behaviour.</p>
  </section>`;

  return htmlResponse(layout({ title: 'Settings', active: 'settings', actor: data.admin, body }));
};
