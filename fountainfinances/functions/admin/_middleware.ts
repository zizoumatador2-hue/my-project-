// Gate for every /admin page and API. Runs on the server before any handler, so a page cannot
// be reached by skipping the frontend. Fails closed: no verified Access session, no access.
import type { Env } from '../_lib/http';
import { originAllowed } from '../_lib/http';
import { authorize } from '../_lib/access';
import { htmlResponse, esc } from '../_lib/admin-ui';

export type AdminData = { admin: string };

const denied = (reason: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Access denied · Fountain Finances</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b1a28;color:#e6eef4;font:16px/1.5 system-ui,sans-serif;padding:24px}
main{max-width:460px;background:#10202e;border:1px solid #1d3143;border-radius:18px;padding:32px}h1{font-family:Georgia,serif;font-size:1.5rem;margin:0 0 10px}p{color:#93a4b2;margin:0 0 6px}</style>
</head><body><main><h1>Access denied</h1><p>${esc(reason)}</p><p>If you are the site owner, check the Cloudflare Access policy for <code>/admin</code>.</p></main></body></html>`;

export const onRequest: PagesFunction<Env, string, AdminData> = async (ctx) => {
  const auth = await authorize(ctx.request, ctx.env);
  if (!auth.ok) return htmlResponse(denied(auth.reason), 403);

  // Cookie-based sessions are sent automatically, so state-changing requests must be same-site.
  if (!['GET', 'HEAD'].includes(ctx.request.method) && !originAllowed(ctx.request, ctx.env)) {
    return htmlResponse(denied('This request could not be verified. Reload the page and try again.'), 403);
  }

  ctx.data.admin = auth.email;
  return ctx.next();
};
