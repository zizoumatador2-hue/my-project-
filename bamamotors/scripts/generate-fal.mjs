#!/usr/bin/env node
// Generates illustrative photos with FLUX1.1 [pro] ultra on fal.ai for slots that have a "fal" prompt in
// content/pexels.json (hero, body types, generic guide covers). Real places (city pages) keep real photos.
//   FAL_KEY=... node scripts/generate-fal.mjs [--force]
// Writes public/images/<key>-{640,1024,1600}.webp and src/data/images.json. Slots already generated are kept.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const KEY = process.env.FAL_KEY;
if (!KEY) { console.log('FAL_KEY not set — skipping fal.ai generation.'); process.exit(0); }
const force = process.argv.includes('--force');
const MODEL = 'fal-ai/flux-pro/v1.1-ultra';
const STYLE = 'Photorealistic editorial photograph, natural light, shot on a full-frame camera, sharp focus, true-to-life colors. No text, no logos, no brand badges, no readable license plates, no watermarks.';
const requests = JSON.parse(readFileSync(join(root, 'content/pexels.json'), 'utf8'));
const manifestPath = join(root, 'src/data/images.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const outDir = join(root, 'public/images');
mkdirSync(outDir, { recursive: true });
const WIDTHS = [640, 1024, 1600];

async function generate(prompt) {
  const res = await fetch(`https://fal.run/${MODEL}`, {
    method: 'POST',
    headers: { Authorization: `Key ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: `${prompt}. ${STYLE}`, aspect_ratio: '16:9', num_images: 1, output_format: 'jpeg', raw: true, safety_tolerance: '2' }),
  });
  if (!res.ok) throw new Error(`fal.ai ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const url = (await res.json()).images?.[0]?.url;
  if (!url) throw new Error('fal.ai returned no image');
  const img = await fetch(url);
  if (!img.ok) throw new Error(`download ${img.status}`);
  return Buffer.from(await img.arrayBuffer());
}

let added = 0, failed = 0;
for (const [key, req] of Object.entries(requests)) {
  if (key.startsWith('_') || !req.fal) continue;
  if (manifest[key]?.source === 'fal.ai' && !force) continue;
  try {
    const buf = await generate(req.fal);
    let w0 = 0, h0 = 0;
    for (const w of WIDTHS) {
      const out = await sharp(buf).resize({ width: w, height: Math.round((w * 9) / 16), fit: 'cover', position: 'attention' }).webp({ quality: 76 }).toFile(join(outDir, `${key}-${w}.webp`));
      w0 = out.width; h0 = out.height;
    }
    manifest[key] = {
      src: `/images/${key}-1600.webp`,
      srcset: WIDTHS.map((w) => `/images/${key}-${w}.webp ${w}w`).join(', '),
      width: w0, height: h0,
      alt: req.alt ?? req.query,
      author: 'BamaMotors',
      sourceUrl: 'https://fal.ai/models/fal-ai/flux-pro/v1.1-ultra',
      source: 'fal.ai',
    };
    added++;
    console.log(`+ ${key}`);
  } catch (e) {
    failed++;
    console.log(`! ${key}: ${e.message}`);
  }
}
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`done: ${added} generated, ${failed} failed`);
