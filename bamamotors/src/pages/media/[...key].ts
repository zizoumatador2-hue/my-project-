import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, locals, request }) => {
  const key = params.key ?? '';
  if (!/^(v|d|p)\/[a-zA-Z0-9/_-]{1,160}\.(webp|jpg|png)$/.test(key)) return new Response('Not found', { status: 404 });
  const obj = await locals.runtime.env.MEDIA.get(key, { onlyIf: request.headers as never });
  if (!obj) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers as never);
  headers.set('etag', obj.httpEtag);
  // Keys are content-unique (random ids), so they can be cached forever.
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('X-Content-Type-Options', 'nosniff');
  if (!('body' in obj) || !obj.body) return new Response(null, { status: 304, headers });
  return new Response(obj.body as unknown as ReadableStream, { headers });
};
