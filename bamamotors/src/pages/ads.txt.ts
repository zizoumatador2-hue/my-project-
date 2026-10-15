import type { APIRoute } from 'astro';
import { loadSettings } from '../lib/settings';

/** ads.txt — authorizes Google AdSense to sell ads on this domain once a publisher ID is set in Admin → Settings. */
export const GET: APIRoute = async ({ locals }) => {
  const s = await loadSettings(locals.runtime.env.DB);
  const pub = /^ca-pub-(\d{10,20})$/.exec(s.adsense_client ?? '')?.[1];
  const body = pub ? `google.com, pub-${pub}, DIRECT, f08c47fec0942fa0\n` : '# Add your Google AdSense publisher ID in Admin → SEO & site settings.\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
