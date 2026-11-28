// Permanently redirect www.chaystore.com to the canonical apex host, keeping path and query.
export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname === 'www.chaystore.com') {
    url.hostname = 'chaystore.com';
    return Response.redirect(url.toString(), 301);
  }
  return context.next();
}
