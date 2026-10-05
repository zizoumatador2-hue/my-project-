// Downloads one Pexels photo per content slot (src/data/images.json) and writes
// optimized WebP files to public/images/photos/ plus metadata to src/data/photos.json.
//
//   PEXELS_API_KEY=… node scripts/fetch-pexels.mjs           → official Pexels API
//   node scripts/fetch-pexels.mjs                             → public search pages (fallback)
//   node scripts/fetch-pexels.mjs --force                     → refetch every slot
//
// Slots that already have a photo are kept, so the selection stays stable between runs.
// Pexels license: free to use, no attribution required — we credit photographers anyway.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const KEY = (process.env.PEXELS_API_KEY || '').trim();
const FORCE = process.argv.includes('--force');
const OUT = 'public/images/photos';
const META = 'src/data/photos.json';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';
const SIZES = [1600, 800];

const slots = JSON.parse(readFileSync('src/data/images.json', 'utf8'));
const photos = existsSync(META) ? JSON.parse(readFileSync(META, 'utf8')) : {};
const used = new Set(Object.values(photos).map((p) => p.id));
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function searchApi(query) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&size=large&per_page=15&locale=en-US`;
  const res = await fetch(url, { headers: { Authorization: KEY } });
  if (!res.ok) throw new Error(`Pexels API ${res.status}`);
  const data = await res.json();
  return data.photos.map((p) => ({
    id: p.id,
    alt: p.alt || query,
    photographer: p.photographer,
    photographerUrl: p.photographer_url,
    pageUrl: p.url,
    color: p.avg_color,
    src: `https://images.pexels.com/photos/${p.id}/pexels-photo-${p.id}.jpeg?auto=compress&cs=tinysrgb&w=1920`,
    landscape: p.width > p.height,
  }));
}

async function searchPage(query) {
  const res = await fetch(`https://www.pexels.com/search/${encodeURIComponent(query)}/?orientation=landscape`, {
    headers: { 'user-agent': UA, accept: 'text/html', 'accept-language': 'en-US,en;q=0.9' },
  });
  if (!res.ok) throw new Error(`Pexels search page ${res.status}`);
  const html = await res.text();
  const next = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!next) throw new Error('Pexels search page without data');
  const found = [];
  const visit = (o) => {
    if (!o || typeof o !== 'object') return;
    if (o.type === 'photo' && o.attributes?.id) {
      const a = o.attributes;
      found.push({
        id: a.id,
        alt: a.alt || a.title || query,
        photographer: [a.user?.first_name, a.user?.last_name].filter(Boolean).join(' ') || a.user?.username || 'Pexels',
        photographerUrl: a.user?.username ? `https://www.pexels.com/@${a.user.username}/` : 'https://www.pexels.com/',
        pageUrl: `https://www.pexels.com/photo/${a.slug ? a.slug + '-' : ''}${a.id}/`,
        color: a.colors?.[0] || null,
        src: `https://images.pexels.com/photos/${a.id}/pexels-photo-${a.id}.jpeg?auto=compress&cs=tinysrgb&w=1920`,
        landscape: (a.width || 2) > (a.height || 1),
      });
      return;
    }
    for (const v of Object.values(o)) visit(v);
  };
  visit(JSON.parse(next[1]));
  return found;
}

const search = KEY ? searchApi : searchPage;
console.log(`Fetching Pexels photos via ${KEY ? 'the API' : 'public search pages'} for ${Object.keys(slots).length} slots`);

let fetched = 0;
let failed = 0;
for (const [slot, query] of Object.entries(slots)) {
  if (!FORCE && photos[slot] && existsSync(`${OUT}/${slot}-800.webp`)) continue;
  try {
    const results = (await search(query)).filter((p) => p.landscape);
    const pick = results.find((p) => !used.has(p.id));
    if (!pick) throw new Error('no unused landscape result');
    const res = await fetch(pick.src, { headers: { 'user-agent': UA } });
    if (!res.ok) throw new Error(`image ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    let width = 0;
    let height = 0;
    for (const w of SIZES) {
      const info = await sharp(buf).resize({ width: w, height: Math.round((w * 9) / 16), fit: 'cover', position: 'attention' }).webp({ quality: w > 1000 ? 68 : 72 }).toFile(`${OUT}/${slot}-${w}.webp`);
      if (w === SIZES[0]) ({ width, height } = info);
    }
    const { dominant } = await sharp(buf).stats();
    const hex = '#' + [dominant.r, dominant.g, dominant.b].map((n) => n.toString(16).padStart(2, '0')).join('');
    photos[slot] = { id: pick.id, query, alt: pick.alt, photographer: pick.photographer, photographerUrl: pick.photographerUrl, pageUrl: pick.pageUrl, color: pick.color || hex, width, height };
    used.add(pick.id);
    fetched++;
    console.log(`  ✓ ${slot} ← ${pick.id} (${pick.photographer})`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${slot}: ${e.message}`);
  }
  await sleep(KEY ? 250 : 1200);
}

const sorted = Object.fromEntries(Object.keys(slots).filter((k) => photos[k]).map((k) => [k, photos[k]]));
writeFileSync(META, JSON.stringify(sorted, null, 2) + '\n');
console.log(`Done: ${fetched} new, ${failed} failed, ${Object.keys(sorted).length}/${Object.keys(slots).length} slots have photos`);
