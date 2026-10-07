#!/usr/bin/env node
// Fills image slots that are still empty with freely licensed photos from Wikimedia Commons
// (CC0 / public domain / CC BY / CC BY-SA). No API key needed. Each photo is credited on the
// site with its author, source page and licence, as those licences require.
//   node scripts/fetch-commons.mjs [--force]
// Reads content/pexels.json (optional per-key "commons" query), writes public/images/<key>-{640,1024,1600}.webp
// and src/data/images.json. Keys that already have a photo (from Pexels or a previous run) are kept.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const force = process.argv.includes('--force');
const requests = JSON.parse(readFileSync(join(root, 'content/pexels.json'), 'utf8'));
const manifestPath = join(root, 'src/data/images.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const outDir = join(root, 'public/images');
mkdirSync(outDir, { recursive: true });
const used = new Set(Object.values(manifest).map((m) => m.sourceUrl));
const WIDTHS = [640, 1024, 1600];
const UA = 'BamaMotorsImageFetcher/1.0 (https://bamamotors.com; info@christopherkunz.com)';
const LICENSE_OK = /^(cc0|public domain|pd|cc by(-sa)? [1-4]\.0)/i;

const strip = (html = '') => html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').replace(/ ([,.;:])/g, '$1').trim();
const meta = (ii, k) => ii.extmetadata?.[k]?.value ?? '';

async function search(q) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', generator: 'search', gsrnamespace: '6', gsrlimit: '40',
    gsrsearch: `${q} filetype:bitmap`, prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1600',
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Commons ${res.status} for "${q}"`);
  const pages = (await res.json()).query?.pages ?? [];
  return pages.sort((a, b) => a.index - b.index);
}

function suitable(page, req) {
  const ii = page.imageinfo?.[0];
  if (!ii || ii.mime !== 'image/jpeg' || ii.width < 1600 || ii.width < ii.height * 1.2) return false;
  if (used.has(ii.descriptionurl)) return false;
  if (!LICENSE_OK.test(strip(meta(ii, 'LicenseShortName')))) return false;
  if (strip(meta(ii, 'Restrictions'))) return false; // trademark / personality-rights warnings
  if (!req.require) return true;
  const text = `${page.title} ${strip(meta(ii, 'ImageDescription'))} ${meta(ii, 'Categories')}`.toLowerCase();
  return req.require.every((w) => text.includes(w));
}

let added = 0;
for (const [key, req] of Object.entries(requests)) {
  if (key.startsWith('_') || (manifest[key] && !force)) continue;
  const q = req.commons ?? req.query;
  try {
    let pick = null;
    // Prefer community-reviewed "Quality images", then any matching photo.
    for (const attempt of [`${q} incategory:Quality_images`, q]) {
      pick = (await search(attempt)).find((p) => suitable(p, req));
      if (pick) break;
    }
    if (!pick) { console.log(`- ${key}: no suitable photo for "${q}"`); continue; }
    const ii = pick.imageinfo[0];
    const res = await fetch(ii.thumburl || ii.url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`download ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    let w0 = 0, h0 = 0;
    for (const w of WIDTHS) {
      const out = await sharp(buf).rotate().resize({ width: w, height: Math.round((w * 9) / 16), fit: 'cover', position: 'attention' }).webp({ quality: 74 }).toFile(join(outDir, `${key}-${w}.webp`));
      w0 = out.width; h0 = out.height;
    }
    const title = pick.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '').replace(/_/g, ' ');
    manifest[key] = {
      src: `/images/${key}-1600.webp`,
      srcset: WIDTHS.map((w) => `/images/${key}-${w}.webp ${w}w`).join(', '),
      width: w0, height: h0,
      alt: (strip(meta(ii, 'ImageDescription')) || title).slice(0, 140),
      author: (strip(meta(ii, 'Artist')) || 'Unknown author').slice(0, 80),
      sourceUrl: ii.descriptionurl,
      source: 'Wikimedia Commons',
      license: strip(meta(ii, 'LicenseShortName')),
      licenseUrl: meta(ii, 'LicenseUrl') || undefined,
    };
    used.add(ii.descriptionurl);
    added++;
    console.log(`+ ${key}: ${pick.title} (${manifest[key].license}) by ${manifest[key].author}`);
  } catch (e) {
    console.log(`! ${key}: ${e.message}`);
  }
}
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`done: ${added} new, ${Object.keys(manifest).length} total`);
