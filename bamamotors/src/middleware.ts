import { defineMiddleware } from 'astro:middleware';
import { SESSION_COOKIE, loadSessionUser } from './lib/auth';
import { getDealerForUser } from './lib/dealers';
import { loadSettings } from './lib/settings';
import { ensureSeeded } from './lib/bootstrap';

const PRIVATE_PREFIXES = ['/dashboard', '/admin', '/account', '/api', '/login', '/signup', '/logout', '/forgot-password', '/reset-password'];
const isPrivate = (path: string) => PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), payment=(), geolocation=(self)',
  'Content-Security-Policy':
    "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
};

function withHeaders(res: Response, extra: Record<string, string>): Response {
  // Responses from fetch/cache may be immutable — copy before mutating headers.
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(extra)) out.headers.set(k, v);
  return out;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, locals, url, cookies } = context;
  const env = locals.runtime.env;
  const path = url.pathname;
  const isProd = env.ENVIRONMENT === 'production';

  // Canonical host: in production every other hostname (www., workers.dev) 301s to SITE_URL's host.
  if (isProd && (request.method === 'GET' || request.method === 'HEAD') && env.SITE_URL) {
    const canonical = new URL(env.SITE_URL);
    if (url.host !== canonical.host) {
      return Response.redirect(`${canonical.origin}${path}${url.search}`, 301);
    }
  }

  // Collapse trailing slashes (except root) to one URL per page.
  if (path.length > 1 && path.endsWith('/') && request.method === 'GET') {
    return context.redirect(path.replace(/\/+$/, '') + url.search, 301);
  }

  // Static-ish endpoints don't need session/settings work.
  if (path.startsWith('/media/') || path === '/robots.txt' || path.startsWith('/sitemap')) {
    return withHeaders(await next(), { 'X-Content-Type-Options': 'nosniff' });
  }

  const token = cookies.get(SESSION_COOKIE)?.value;
  const ttl = Number(env.PUBLIC_CACHE_TTL ?? '0');
  const cacheable = request.method === 'GET' && !token && !isPrivate(path) && ttl > 0 && typeof caches !== 'undefined';
  const cache = cacheable ? (caches as unknown as { default: Cache }).default : null;

  if (cache) {
    const hit = await cache.match(request);
    if (hit) return withHeaders(hit, { 'X-Cache': 'HIT' });
  }

  await ensureSeeded(env.DB);
  locals.settings = await loadSettings(env.DB);
  locals.user = await loadSessionUser(env.DB, token);
  locals.dealer = locals.user?.role === 'dealer' ? await getDealerForUser(env.DB, locals.user.id) : null;
  if (token && !locals.user) cookies.delete(SESSION_COOKIE, { path: '/' });

  // ── Access control ──
  const loginRedirect = () => context.redirect(`/login?next=${encodeURIComponent(path + url.search)}`, 302);
  if (path === '/admin' || path.startsWith('/admin/')) {
    if (!locals.user) return loginRedirect();
    if (locals.user.role !== 'admin') return new Response('Forbidden', { status: 403 });
  }
  if (path === '/dashboard' || path.startsWith('/dashboard/')) {
    if (!locals.user) return loginRedirect();
    if (locals.user.role !== 'dealer' || !locals.dealer) {
      return context.redirect(locals.user.role === 'admin' ? '/admin' : '/for-dealers', 302);
    }
  }
  if (path === '/account' || path.startsWith('/account/')) {
    if (!locals.user) return loginRedirect();
  }

  const res = await next();
  const headers: Record<string, string> = { ...SECURITY_HEADERS };
  if (isProd) headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  if (isPrivate(path)) {
    headers['X-Robots-Tag'] = 'noindex, nofollow';
    headers['Cache-Control'] = 'private, no-store';
  }
  const out = withHeaders(res, headers);

  const isHtml = out.headers.get('content-type')?.includes('text/html');
  if (cache && out.status === 200 && isHtml && !out.headers.has('set-cookie')) {
    const toCache = out.clone();
    const cached = new Response(toCache.body, toCache);
    cached.headers.set('Cache-Control', `public, s-maxage=${ttl}`);
    locals.runtime.ctx.waitUntil(cache.put(request, cached));
    out.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    out.headers.set('X-Cache', 'MISS');
  }
  return out;
});
