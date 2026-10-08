// Temporary, single-use image generation endpoint (FLUX.1 [schnell] on fal.ai).
// The fal key and one-time nonces live only in D1 (table imggen_secrets); nothing secret is in the repo.
// Each nonce works once. Remove this file and the D1 rows when image generation is finished.
import { type Env, json, dbReady } from '../_lib/http';

interface Job { slot: string; prompt: string; width: number; height: number; seed?: number }

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!dbReady(env)) return json(503, { error: 'unavailable' });
  const body = (await request.json().catch(() => null)) as { nonce?: string; jobs?: Job[] } | null;
  if (!body?.nonce || !/^[a-f0-9]{48}$/.test(body.nonce) || !Array.isArray(body.jobs) || body.jobs.length === 0 || body.jobs.length > 16) {
    return json(400, { error: 'bad request' });
  }
  const used = await env.DB.prepare('DELETE FROM imggen_secrets WHERE k = ?1 RETURNING k').bind(`nonce:${body.nonce}`).first();
  if (!used) return json(403, { error: 'invalid or used nonce' });
  const key = await env.DB.prepare("SELECT v FROM imggen_secrets WHERE k = 'fal_key'").first<{ v: string }>();
  if (!key) return json(503, { error: 'no key' });

  const run = async (j: Job) => {
    const width = Math.min(Math.max(Math.round(j.width / 16) * 16, 256), 1440);
    const height = Math.min(Math.max(Math.round(j.height / 16) * 16, 256), 1440);
    const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: { Authorization: `Key ${key.v}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        prompt: String(j.prompt).slice(0, 1500),
        image_size: { width, height },
        num_inference_steps: 4,
        num_images: 1,
        seed: j.seed,
        enable_safety_checker: true,
        output_format: 'jpeg',
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { images?: { url: string; width: number; height: number }[]; seed?: number; detail?: unknown };
    if (!res.ok || !data.images?.[0]) return { slot: j.slot, error: `fal ${res.status}: ${JSON.stringify(data.detail ?? data).slice(0, 300)}` };
    const img = data.images[0];
    return { slot: j.slot, url: img.url, width: img.width, height: img.height, seed: data.seed, megapixels: Math.ceil((img.width * img.height) / 1_000_000) };
  };

  const results = [];
  for (let i = 0; i < body.jobs.length; i += 4) results.push(...(await Promise.all(body.jobs.slice(i, i + 4).map(run))));
  return json(200, { results });
};
