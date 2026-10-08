// Generates the original header images listed in scripts/flux-prompts.json with FLUX.1 [schnell]
// through the site's temporary /api/imggen endpoint (the fal key never leaves Cloudflare), then
// writes 1600px and 800px WebP files to public/images/photos/ and records them in src/data/photos.json.
//   FLUX_NONCE=<single-use nonce> [FLUX_ONLY=slot1,slot2] node scripts/fetch-flux.mjs
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import sharp from 'sharp';

const ENDPOINT = process.env.FLUX_ENDPOINT || 'https://fountainfinances.pages.dev/api/imggen';
const nonce = (process.env.FLUX_NONCE || '').trim();
if (!nonce) {
  console.log('No FLUX_NONCE — skipping original image generation.');
  process.exit(0);
}
const PRICE_PER_MP = 0.003; // fal.ai FLUX.1 [schnell], USD per megapixel
const cfg = JSON.parse(readFileSync('scripts/flux-prompts.json', 'utf8'));
const only = (process.env.FLUX_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const list = cfg.images.filter((i) => !only.length || only.includes(i.slot));
const jobs = list.map((i) => ({ slot: i.slot, seed: i.seed, width: cfg.width, height: cfg.height, prompt: `${i.prompt}, ${cfg.style}` }));

const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nonce, jobs }) });
const data = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`imggen ${res.status}: ${JSON.stringify(data)}`);
  process.exit(1);
}

const photos = JSON.parse(readFileSync('src/data/photos.json', 'utf8'));
let mp = 0;
const lines = [];
for (const r of data.results) {
  const meta = list.find((i) => i.slot === r.slot);
  if (r.error) {
    lines.push(`- ${r.slot}: failed — ${r.error}`);
    continue;
  }
  const img = Buffer.from(await (await fetch(r.url)).arrayBuffer());
  for (const w of [1600, 800]) {
    await sharp(img).resize({ width: w, height: Math.round((w * 9) / 16), fit: 'cover', kernel: 'lanczos3' }).webp({ quality: w > 1000 ? 72 : 74 }).toFile(`public/images/photos/${r.slot}-${w}.webp`);
  }
  const { dominant } = await sharp(img).stats();
  photos[r.slot] = {
    id: r.seed ?? meta.seed,
    query: meta.prompt.slice(0, 80),
    alt: meta.alt,
    photographer: 'Fountain Finances',
    photographerUrl: 'https://fountainfinances.com/',
    pageUrl: 'https://fountainfinances.com/',
    source: 'original',
    color: '#' + [dominant.r, dominant.g, dominant.b].map((n) => n.toString(16).padStart(2, '0')).join(''),
    width: 1600,
    height: 900,
  };
  mp += r.megapixels;
  lines.push(`- ${r.slot}: ${r.width}×${r.height}, ${r.megapixels} MP billed, $${(r.megapixels * PRICE_PER_MP).toFixed(3)}`);
}
writeFileSync('src/data/photos.json', JSON.stringify(photos, null, 2) + '\n');
const summary = [`### FLUX.1 [schnell] images`, ...lines, `**Total: ${data.results.filter((r) => !r.error).length} images, ${mp} MP, $${(mp * PRICE_PER_MP).toFixed(3)}**`].join('\n');
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
