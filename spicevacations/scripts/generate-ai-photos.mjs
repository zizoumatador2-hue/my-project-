// Generates the site's 10 AI mood images with fal.ai, once. Images are committed to the repo
// (public/ai/ + src/data/ai-photos.json), so later builds never pay for them again.
// AI images are only used for generic mood scenes (home page and vacation types), never to depict a
// real resort, and the site labels each one "AI-generated image".
//
//   FAL_KEY=... node scripts/generate-ai-photos.mjs [--force] [--only=home/hero]
//
// FAL_MODEL picks the fal endpoint (default: FLUX.1 [schnell], about $0.003 per megapixel).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'public/ai');
const MANIFEST = join(ROOT, 'src/data/ai-photos.json');
const KEY = (process.env.FAL_KEY || '').trim();
const MODEL = (process.env.FAL_MODEL || 'fal-ai/flux/schnell').trim();
const FORCE = process.argv.includes('--force');
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
const WIDTH = 1536;
const HEIGHT = 960;
const WIDTHS = [640, 960, 1536];

const STYLE =
  'photorealistic travel photography, natural light, shot on a full-frame camera, 35mm lens, soft film grain, warm color grade, no text, no watermark, no logos, no signage';
const COUPLE = 'a couple seen from behind or in silhouette, faces not visible';

/** key → { prompt, alt } */
const SHOTS = {
  'home/hero': {
    prompt: `${COUPLE}, walking hand in hand along a quiet tropical beach at golden-hour sunset, gentle waves, palm trees, wide cinematic composition with empty sky on the left for a headline`,
    alt: 'A couple walking hand in hand along a tropical beach at sunset',
  },
  'home/band': {
    prompt: 'overwater bungalows on stilts above a calm turquoise lagoon at dusk, wooden walkway, soft pink and orange sky reflected in the water, serene, wide panoramic view',
    alt: 'Overwater bungalows above a calm turquoise lagoon at dusk',
  },
  'vacation-types/romantic-getaways': {
    prompt: `${COUPLE}, sharing a candlelit dinner on a wooden terrace overlooking the ocean at twilight, string lights, wine glasses, intimate atmosphere`,
    alt: 'A candlelit dinner for two on an ocean-view terrace at twilight',
  },
  'vacation-types/couples-vacations': {
    prompt: `${COUPLE}, kayaking side by side across clear turquoise water near a green tropical coastline on a sunny morning, aerial three-quarter view`,
    alt: 'Two people kayaking across clear turquoise water near a tropical coast',
  },
  'vacation-types/honeymoon-vacations': {
    prompt: 'luxury honeymoon suite with an open terrace and private plunge pool facing a turquoise sea, rose petals on white linen, sheer curtains moving in the breeze, morning light',
    alt: 'A honeymoon suite terrace with a private plunge pool facing the sea',
  },
  'vacation-types/adults-only-resorts': {
    prompt: 'quiet adults-only resort infinity pool merging with the ocean horizon, two empty sun loungers with towels, palm shadows, calm late-afternoon light, minimalist architecture',
    alt: 'An infinity pool merging with the ocean horizon at a quiet resort',
  },
  'vacation-types/all-inclusive-resorts': {
    prompt: 'beachfront all-inclusive resort pool area with a swim-up bar, palm trees and white sand beach beyond, tropical cocktails on the bar, bright sunny Caribbean day, no people in focus',
    alt: 'A beachfront resort pool with a swim-up bar and palm trees',
  },
  'vacation-types/luxury-vacations': {
    prompt: 'elegant clifftop villa terrace at sunset overlooking a dramatic coastline, private infinity pool, outdoor lounge furniture, champagne on a table, refined luxury atmosphere',
    alt: 'A clifftop villa terrace with a private pool overlooking the coast at sunset',
  },
  'vacation-types/beach-vacations': {
    prompt: 'pristine white-sand beach with crystal-clear turquoise water and a leaning palm tree, two beach chairs under an umbrella, bright midday sun, aerial three-quarter angle',
    alt: 'Two beach chairs under an umbrella on a white-sand beach with turquoise water',
  },
  'vacation-types/weekend-getaways': {
    prompt: 'cozy wooden cabin porch overlooking a misty lake surrounded by autumn foliage, two coffee mugs and a blanket on a bench, early morning light, peaceful',
    alt: 'A cabin porch with two coffee mugs overlooking a lake in autumn',
  },
};

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
if (!KEY) {
  console.log(`ai-photos: FAL_KEY not set — keeping ${Object.keys(manifest).length} existing AI images`);
  process.exit(0);
}

async function generate(prompt) {
  const r = await fetch(`https://fal.run/${MODEL}`, {
    method: 'POST',
    headers: { Authorization: `Key ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: `${prompt}. ${STYLE}`,
      image_size: { width: WIDTH, height: HEIGHT },
      num_images: 1,
      ...(MODEL.includes('schnell') ? { num_inference_steps: 4 } : {}),
      output_format: 'jpeg',
      enable_safety_checker: true,
    }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`fal ${MODEL} failed (${r.status}): ${text.slice(0, 300)}`);
  const data = JSON.parse(text);
  const url = data.images?.[0]?.url;
  if (!url) throw new Error(`fal returned no image: ${text.slice(0, 300)}`);
  return { url, seed: data.seed };
}

mkdirSync(OUT, { recursive: true });
let made = 0;
for (const [key, shot] of Object.entries(SHOTS)) {
  if (ONLY && ONLY !== key) continue;
  const slug = key.replace(/\//g, '--');
  if (!FORCE && manifest[key] && WIDTHS.every((w) => existsSync(join(OUT, `${slug}-${w}.webp`)))) continue;
  const { url, seed } = await generate(shot.prompt);
  const img = await fetch(url);
  if (!img.ok) throw new Error(`download failed ${img.status} for ${key}`);
  const buf = Buffer.from(await img.arrayBuffer());
  const stats = await sharp(buf).stats();
  const [r, g, b] = stats.channels.map((c) => Math.round(c.mean));
  for (const w of WIDTHS) {
    await sharp(buf).resize({ width: w, height: Math.round(w * 0.625), fit: 'cover' }).webp({ quality: w > 1000 ? 74 : 70 }).toFile(join(OUT, `${slug}-${w}.webp`));
  }
  manifest[key] = {
    id: `ai-${slug}`,
    base: `/ai/${slug}`,
    widths: WIDTHS,
    alt: shot.alt,
    avg: `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`,
    photographer: 'SpiceVacations',
    photographerUrl: '/editorial-policy/',
    url: '/editorial-policy/',
    source: 'AI',
    ai: true,
    model: MODEL,
    seed,
    prompt: shot.prompt,
    megapixels: Math.ceil((WIDTH * HEIGHT) / 1e6),
  };
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  made++;
  console.log(`ai-photos: ${key} ✓ (${MODEL})`);
}
const mp = Object.values(manifest).reduce((s, p) => s + (p.megapixels || 0), 0);
console.log(`ai-photos: ${made} generated this run, ${Object.keys(manifest).length} total, ~${mp} billed megapixels in all`);
