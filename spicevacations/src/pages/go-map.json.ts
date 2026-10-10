import type { APIRoute } from 'astro';
import { allAffiliateTargets } from '../lib/content';
import { buildOutboundUrl, goId, partnerFor } from '../lib/affiliate';

/** /go/<id> → partner URL map consumed by the Worker. Built from the registry, never hand-edited. */
export const GET: APIRoute = async () => {
  const map: Record<string, { url: string; partner: string; fallback: string }> = {};
  for (const t of await allAffiliateTargets()) {
    const u = buildOutboundUrl(t);
    const p = partnerFor(t.productType);
    if (u) map[goId(t)] = { url: u, partner: p?.id ?? 'override', fallback: t.fallbackHref };
  }
  return new Response(JSON.stringify(map), { headers: { 'Content-Type': 'application/json' } });
};
