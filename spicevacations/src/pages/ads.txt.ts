import type { APIRoute } from 'astro';
import { SITE } from '../data/site';

/** ads.txt is generated from the configured AdSense client so it can never list a wrong or placeholder publisher. */
export const GET: APIRoute = () => {
  const client = SITE.adsenseClient;
  const pub = /^ca-pub-(\d{10,20})$/.exec(client)?.[1];
  const body = pub
    ? `google.com, pub-${pub}, DIRECT, f08c47fec0942fa0\n`
    : '# SpiceVacations.com ads.txt: no advertising seller is authorized yet.\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
