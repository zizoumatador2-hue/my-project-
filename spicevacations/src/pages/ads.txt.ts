import type { APIRoute } from 'astro';

/** ads.txt is generated from the configured AdSense client so it can never list a wrong or placeholder publisher. */
export const GET: APIRoute = () => {
  const client = import.meta.env.PUBLIC_ADSENSE_CLIENT ?? '';
  const pub = /^ca-pub-(\d{10,20})$/.exec(client)?.[1];
  const body = pub
    ? `google.com, pub-${pub}, DIRECT, f08c47fec0942fa0\n`
    : '# SpiceVacations.com ads.txt: no advertising seller is authorized yet.\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
