#!/usr/bin/env node
// Downloads licensed photos from the Pexels API (https://www.pexels.com/license/ — free for
// commercial use, no attribution required; we still credit photographers on the site).
//   PEXELS_API_KEY=... node scripts/fetch-pexels.mjs [--force]
// Writes public/images/<key>-{640,1024,1600}.webp and src/data/images.json. Existing keys are kept.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const KEY = process.env.PEXELS_API_KEY;
if (!KEY) { console.log('PEXELS_API_KEY not set — skipping image fetch.'); process.exit(0); }
const force = process.argv.includes('--force');
const requests = JSON.parse(readFileSync(join(root, 'content/pexels.json'), 'utf8'));
const manifestPath = join(root, 'src/data/images.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const outDir = join(root, 'public/images');
mkdirSync(outDir, { recursive: true });
const used = new Set(Object.values(manifest).map((m) => m.sourceUrl));
const WIDTHS = [640, 1024, 1600];

async function search(q, orientation = 'landscape') {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&orientation=${orientation}&per_page=30&locale=en-US`;
  const res = await fetch(url, { headers: { Authorization: KEY } });
  if (!res.ok) throw new Error(`Pexels ${res.status} for "${q}"`);
  return (await res.json()).photos ?? [];
}

let added = 0;
for (const [key, req] of Object.entries(requests)) {
  if (key.startsWith('_') || (manifest[key] && !force)) continue;
  try {
    const photos = await search(req.query, req.orientation);
    const pick = photos.find((p) => {
      if (used.has(p.url) || p.width < 1600) return false;
      if (!req.require) return true;
      const text = `${p.alt ?? ''} ${p.url}`.toLowerCase();
      return req.require.every((w) => text.includes(w));
    });
    if (!pick) { console.log(`- ${key}: no suitable photo for "${req.query}"`); continue; }
    const buf = Buffer.from(await (await fetch(pick.src.original)).arrayBuffer());
    let w0 = 0, h0 = 0;
    for (const w of WIDTHS) {
      const out = await sharp(buf).rotate().resize({ width: w, height: Math.round((w * 9) / 16), fit: 'cover', position: 'attention' }).webp({ quality: 74 }).toFile(join(outDir, `${key}-${w}.webp`));
      w0 = out.width; h0 = out.height;
    }
    manifest[key] = {
      src: `/images/${key}-1600.webp`,
      srcset: WIDTHS.map((w) => `/images/${key}-${w}.webp ${w}w`).join(', '),
      width: w0, height: h0,
      alt: (pick.alt || req.query).slice(0, 140),
      author: pick.photographer,
      sourceUrl: pick.url,
      source: 'Pexels',
    };
    used.add(pick.url);
    added++;
    console.log(`+ ${key}: ${pick.url} by ${pick.photographer}`);
  } catch (e) {
    console.log(`! ${key}: ${e.message}`);
  }
}
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`done: ${added} new, ${Object.keys(manifest).length} total`);
