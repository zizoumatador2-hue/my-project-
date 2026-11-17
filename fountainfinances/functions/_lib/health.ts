// Live health checks for the admin dashboard. Reports whether each service is configured and reachable.
// Secret values are never read into the output: only presence (set or missing) is reported.
import { type Env, dbReady } from './http';

export type CheckStatus = 'working' | 'warning' | 'failed' | 'not_configured';

export interface Check {
  id: string;
  label: string;
  group: string;
  status: CheckStatus;
  detail: string;
  ms?: number;
}

export interface EnvVarSpec {
  name: string;
  required: boolean;
  secret: boolean;
  purpose: string;
}

export const ENV_VARS: EnvVarSpec[] = [
  { name: 'DB', required: true, secret: false, purpose: 'D1 database binding (subscribers, messages, audit log)' },
  { name: 'SITE_URL', required: true, secret: false, purpose: 'Canonical site address used in links and origin checks' },
  { name: 'IP_HASH_SALT', required: true, secret: true, purpose: 'Salt for hashing visitor IPs in rate limits and the audit log' },
  { name: 'ACCESS_TEAM_DOMAIN', required: true, secret: false, purpose: 'Cloudflare Access team domain that protects /admin' },
  { name: 'ACCESS_AUD', required: true, secret: false, purpose: 'Cloudflare Access application audience tag' },
  { name: 'ADMIN_EMAILS', required: false, secret: false, purpose: 'Allowlist of admin emails, checked after Access' },
  { name: 'RESEND_API_KEY', required: false, secret: true, purpose: 'Sends confirmation and contact emails' },
  { name: 'EMAIL_FROM', required: false, secret: false, purpose: 'Sender address for outgoing email' },
  { name: 'CONTACT_TO_EMAIL', required: false, secret: false, purpose: 'Inbox that receives new contact messages' },
  { name: 'TURNSTILE_SECRET_KEY', required: false, secret: true, purpose: 'Bot check on the contact form' },
  { name: 'ALLOWED_ORIGINS', required: false, secret: false, purpose: 'Extra origins allowed to submit forms' },
];

/** Presence only. Never returns the value. */
export const isSet = (env: Env, name: string): boolean => {
  if (name === 'DB') return dbReady(env);
  const v = (env as unknown as Record<string, unknown>)[name];
  return typeof v === 'string' && v.trim().length > 0;
};

export async function runChecks(env: Env): Promise<Check[]> {
  const checks: Check[] = [];

  // Database: a real round trip, timed.
  if (dbReady(env)) {
    const started = Date.now();
    try {
      await env.DB.prepare('SELECT COUNT(*) AS n FROM subscribers').first();
      const ms = Date.now() - started;
      checks.push({ id: 'db', label: 'Database (D1)', group: 'Data', status: ms > 800 ? 'warning' : 'working', detail: ms > 800 ? 'Responding slowly' : 'Queries respond normally', ms });
    } catch {
      checks.push({ id: 'db', label: 'Database (D1)', group: 'Data', status: 'failed', detail: 'Query failed. Check the D1 binding and migrations.' });
    }
  } else {
    checks.push({ id: 'db', label: 'Database (D1)', group: 'Data', status: 'failed', detail: 'No D1 binding on this Pages project' });
  }

  // Access: the admin area must fail closed.
  const accessOk = isSet(env, 'ACCESS_TEAM_DOMAIN') && isSet(env, 'ACCESS_AUD');
  checks.push({
    id: 'access',
    label: 'Admin sign-in (Cloudflare Access)',
    group: 'Security',
    status: accessOk ? 'working' : 'failed',
    detail: accessOk ? 'Admin pages require a verified Access session' : 'Admin pages are locked until Access is configured',
  });
  checks.push({
    id: 'allowlist',
    label: 'Admin email allowlist',
    group: 'Security',
    status: isSet(env, 'ADMIN_EMAILS') ? 'working' : 'warning',
    detail: isSet(env, 'ADMIN_EMAILS') ? 'Only listed emails can open the admin area' : 'Any identity allowed by the Access policy can open the admin area',
  });
  checks.push({
    id: 'ip-salt',
    label: 'Visitor IP hashing',
    group: 'Security',
    status: isSet(env, 'IP_HASH_SALT') ? 'working' : 'failed',
    detail: isSet(env, 'IP_HASH_SALT') ? 'IPs are hashed before storage' : 'IP_HASH_SALT is missing',
  });

  // Email.
  const emailFull = isSet(env, 'RESEND_API_KEY') && isSet(env, 'EMAIL_FROM');
  const emailPartial = isSet(env, 'RESEND_API_KEY') !== isSet(env, 'EMAIL_FROM');
  checks.push({
    id: 'email',
    label: 'Email service (Resend)',
    group: 'Services',
    status: emailFull ? 'working' : emailPartial ? 'warning' : 'not_configured',
    detail: emailFull ? 'Sending is configured' : emailPartial ? 'Set both RESEND_API_KEY and EMAIL_FROM' : 'Not configured: confirmations are queued but not sent',
  });
  checks.push({
    id: 'contact-alert',
    label: 'Contact message alerts',
    group: 'Services',
    status: emailFull && isSet(env, 'CONTACT_TO_EMAIL') ? 'working' : 'warning',
    detail: emailFull && isSet(env, 'CONTACT_TO_EMAIL') ? 'New messages are emailed to the owner' : 'Messages are saved here, but no email alert is sent',
  });
  checks.push({
    id: 'turnstile',
    label: 'Contact form bot check (Turnstile)',
    group: 'Services',
    status: isSet(env, 'TURNSTILE_SECRET_KEY') ? 'working' : 'not_configured',
    detail: isSet(env, 'TURNSTILE_SECRET_KEY') ? 'Enabled' : 'Not configured: the form relies on rate limits only',
  });

  // Services this project does not use. Shown honestly rather than hidden.
  for (const [id, label, group] of [
    ['payments', 'Payment gateway', 'Services'],
    ['sms', 'SMS / WhatsApp', 'Services'],
    ['ai', 'AI API', 'Services'],
    ['queue', 'Queue and background jobs', 'Services'],
    ['webhooks', 'Webhooks', 'Services'],
    ['uptime', 'External uptime monitor', 'Monitoring'],
  ] as const) {
    checks.push({ id, label, group, status: 'not_configured', detail: 'Not part of this website' });
  }

  return checks;
}

/** One score for the header: working = full credit, warning = half, failed = nothing. Unconfigured optional services are excluded. */
export function healthSummary(checks: Check[]) {
  const scored = checks.filter((c) => c.status !== 'not_configured');
  const points = scored.reduce((sum, c) => sum + (c.status === 'working' ? 1 : c.status === 'warning' ? 0.5 : 0), 0);
  const score = scored.length ? Math.round((points / scored.length) * 100) : 0;
  const overall = checks.some((c) => c.status === 'failed') ? 'critical' : checks.some((c) => c.status === 'warning') ? 'warning' : 'healthy';
  return { score, overall };
}
