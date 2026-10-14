import type { Env } from './http';

export const emailConfigured = (env: Env) => Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);

export async function sendEmail(env: Env, msg: { to: string; subject: string; text: string; html: string; replyTo?: string; headers?: Record<string, string> }) {
  if (!emailConfigured(env)) throw new Error('Email delivery is not configured');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [msg.to],
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
      ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
      ...(msg.headers ? { headers: msg.headers } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Email provider responded ${res.status}`);
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function confirmationEmail(siteUrl: string, confirmUrl: string, unsubUrl: string) {
  const text = `Please confirm your subscription to the Fountain Finances newsletter:\n\n${confirmUrl}\n\nThis link expires in 7 days. If you didn't sign up, you can ignore this email and you won't hear from us again.\n\nUnsubscribe: ${unsubUrl}\n\nFountain Finances — ${siteUrl}`;
  const html = `<!doctype html><html><body style="margin:0;background:#f5f8f7;font-family:Arial,Helvetica,sans-serif;color:#0f1d2b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #e1e7eb;border-radius:12px"><tr><td style="padding:28px">
<p style="margin:0 0 16px;font-weight:bold;font-size:18px;color:#0a6a6b">Fountain Finances</p>
<h1 style="margin:0 0 12px;font-size:22px">Confirm your subscription</h1>
<p style="margin:0 0 20px;line-height:1.6">Thanks for signing up for <strong>Make Your Money Work Smarter</strong>, our practical newsletter. Please confirm your email address to start receiving it.</p>
<p style="margin:0 0 24px"><a href="${escapeHtml(confirmUrl)}" style="display:inline-block;background:#0a6a6b;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px">Confirm subscription</a></p>
<p style="margin:0 0 8px;font-size:13px;color:#566574;line-height:1.5">This link expires in 7 days. If you didn't sign up, ignore this email — you won't be subscribed.</p>
<p style="margin:0;font-size:13px;color:#566574"><a href="${escapeHtml(unsubUrl)}" style="color:#566574">Unsubscribe</a> · <a href="${escapeHtml(siteUrl)}/privacy/" style="color:#566574">Privacy Policy</a></p>
</td></tr></table></td></tr></table></body></html>`;
  return { text, html };
}
