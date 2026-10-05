// Edge entry for fountainfinances.com (canonical) and www.fountainfinances.com.
// Serves the Cloudflare Pages deployment on the custom domain and sends www to the bare domain.
const ORIGIN = 'https://fountainfinances.pages.dev';
const CANONICAL = 'fountainfinances.com';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.hostname !== CANONICAL || url.protocol !== 'https:') {
      url.hostname = CANONICAL;
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }
    const headers = new Headers(request.headers);
    headers.delete('host');
    // Pages sees the Worker as the client; pass the visitor's IP for per-visitor rate limits.
    headers.set('x-ff-client-ip', request.headers.get('cf-connecting-ip') || '');
    const upstream = await fetch(new Request(ORIGIN + url.pathname + url.search, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
    }));
    const out = new Headers(upstream.headers);
    const loc = out.get('location');
    if (loc && loc.startsWith(ORIGIN)) out.set('location', 'https://' + CANONICAL + loc.slice(ORIGIN.length));
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
  },
};
