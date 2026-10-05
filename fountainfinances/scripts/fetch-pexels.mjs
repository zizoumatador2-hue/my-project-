// Downloads one Pexels photo per content slot (src/data/images.json) and writes
// optimized WebP files to public/images/photos/ plus metadata to src/data/photos.json.
//
//   PEXELS_API_KEY=… node scripts/fetch-pexels.mjs           → official Pexels API
//   node scripts/fetch-pexels.mjs                             → keyless fallback: public search pages, then a
//                                                               public index of Pexels photos (Hugging Face datasets)
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

// Keyless fallback: full-text search over a public dataset that indexes Pexels photos with their descriptions.
const HF = 'https://datasets-server.huggingface.co';
let dataset = null;
const PEXELS_ID = /pexels\.com\/photos?\/(?:[a-z0-9-]*?-)?(\d{3,})/i;
function rowToPhoto(row, query) {
  let id = null;
  const texts = [];
  let photographer = null;
  for (const [k, v] of Object.entries(row)) {
    if (typeof v !== 'string') continue;
    const m = v.match(PEXELS_ID);
    if (m && !id) id = Number(m[1]);
    else if (/photographer|author|user/i.test(k) && v.length < 80) photographer = v;
    else if (!/^https?:/.test(v)) texts.push([k, v]);
  }
  if (!id && typeof row.id === 'number' && /pexels/i.test(JSON.stringify(row))) id = row.id;
  if (!id) return null;
  const named = texts.find(([k]) => /^(alt|title|caption|description|text|prompt)$/i.test(k));
  const alt = (named?.[1] || texts.sort((a, b) => b[1].length - a[1].length)[0]?.[1] || query).trim();
  return {
    id,
    alt: alt.charAt(0).toUpperCase() + alt.slice(1),
    photographer: photographer || 'Pexels',
    photographerUrl: 'https://www.pexels.com/',
    pageUrl: `https://www.pexels.com/photo/${id}/`,
    color: null,
    src: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1920`,
    landscape: true,
  };
}
async function hfSearch(ds, query) {
  const url = `${HF}/search?dataset=${encodeURIComponent(ds.name)}&config=${encodeURIComponent(ds.config)}&split=${encodeURIComponent(ds.split)}&query=${encodeURIComponent(query)}&offset=0&length=40`;
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`dataset search ${res.status}`);
  const data = await res.json();
  return (data.rows || []).map((r) => rowToPhoto(r.row, query)).filter(Boolean);
}
async function findDataset() {
  const list = await (await fetch('https://huggingface.co/api/datasets?search=pexels&sort=downloads&direction=-1&limit=40')).json();
  for (const d of list) {
    try {
      const splits = await (await fetch(`${HF}/splits?dataset=${encodeURIComponent(d.id)}`, { signal: AbortSignal.timeout(30000) })).json();
      const sp = splits.splits?.[0];
      if (!sp) continue;
      const ds = { name: d.id, config: sp.config, split: sp.split };
      const rows = await hfSearch(ds, 'money');
      console.log(`  dataset ${d.id}: ${rows.length} Pexels matches for "money"`);
      if (rows.length >= 3) return ds;
    } catch (e) {
      console.log(`  dataset ${d.id}: ${e.message}`);
    }
  }
  throw new Error('no searchable Pexels dataset found');
}
async function searchDataset(query) {
  dataset ??= await findDataset();
  let rows = await hfSearch(dataset, query);
  if (rows.length < 3) rows = rows.concat(await hfSearch(dataset, query.split(' ').slice(-2).join(' ')));
  return rows;
}
let pageBlocked = false;
async function searchKeyless(query) {
  if (!pageBlocked) {
    try {
      return await searchPage(query);
    } catch (e) {
      pageBlocked = true;
      console.log(`  search pages unavailable (${e.message}); using the public dataset index`);
    }
  }
  return searchDataset(query);
}

const search = KEY ? searchApi : searchKeyless;
console.log(`Fetching Pexels photos via ${KEY ? 'the API' : 'keyless sources'} for ${Object.keys(slots).length} slots`);

let fetched = 0;
let failed = 0;
for (const [slot, query] of Object.entries(slots)) {
  if (!FORCE && photos[slot] && existsSync(`${OUT}/${slot}-800.webp`)) continue;
  try {
    const results = (await search(query)).filter((p) => p.landscape && !used.has(p.id));
    let pick = null;
    let buf = null;
    for (const cand of results.slice(0, 8)) {
      const res = await fetch(cand.src, { headers: { 'user-agent': UA } });
      if (!res.ok) continue;
      const b = Buffer.from(await res.arrayBuffer());
      const meta = await sharp(b).metadata();
      if (!meta.width || meta.width < 1200 || meta.width <= meta.height * 1.15) continue; // landscape, large enough
      pick = cand;
      buf = b;
      break;
    }
    if (!pick) throw new Error(`no usable landscape photo among ${results.length} results`);
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
  await sleep(KEY ? 250 : 400);
}

const sorted = Object.fromEntries(Object.keys(slots).filter((k) => photos[k]).map((k) => [k, photos[k]]));
writeFileSync(META, JSON.stringify(sorted, null, 2) + '\n');
console.log(`Done: ${fetched} new, ${failed} failed, ${Object.keys(sorted).length}/${Object.keys(slots).length} slots have photos`);
