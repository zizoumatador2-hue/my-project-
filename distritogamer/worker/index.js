// Canonical host: send www.distritogamer.com to distritogamer.com with a permanent redirect,
// then serve the static build for everything else.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'www.distritogamer.com') {
      url.hostname = 'distritogamer.com';
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
