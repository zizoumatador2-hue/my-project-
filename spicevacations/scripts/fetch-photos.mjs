// Fetches one licensed stock photo per content entry from Pexels (PEXELS_API_KEY) or Pixabay
// (PIXABAY_API_KEY). Both licenses allow free commercial use and self-hosting; we still credit every
// photographer. Runs before the build when a key is set (CI secret); without one the site keeps its
// illustrated scenes, so builds never fail. Pexels wins when both keys are present.
//
//   PEXELS_API_KEY=... node scripts/fetch-photos.mjs [--force]
//   PIXABAY_API_KEY=... node scripts/fetch-photos.mjs [--force]
//
// Output: public/photos/<key>-<width>.webp + src/data/photos.json (manifest with credits).
// Photos of resorts are *representative* images of the location (Pexels has no photos of the
// specific hotels), and the site labels them that way.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'js-yaml';
import sharp from 'sharp';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'public/photos');
const MANIFEST = join(ROOT, 'src/data/photos.json');
const PEXELS = (process.env.PEXELS_API_KEY || '').trim();
const PIXABAY = (process.env.PIXABAY_API_KEY || '').trim();
const SOURCE = PEXELS ? 'Pexels' : PIXABAY ? 'Pixabay' : '';
const FORCE = process.argv.includes('--force');
// Pixabay's standard API serves images up to 1280px wide, so we never upscale past that.
const WIDTHS = SOURCE === 'Pixabay' ? [640, 960, 1280] : [640, 960, 1600];

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
if (!SOURCE) {
  if (!existsSync(MANIFEST)) writeFileSync(MANIFEST, '{}\n');
  console.log(`photos: no PEXELS_API_KEY or PIXABAY_API_KEY — using ${Object.keys(manifest).length} cached photos + illustrations`);
  process.exit(0);
}

/** Curated queries for destinations, vacation types and the home page (others are derived). */
const CURATED = {
  'home/hero': 'couple beach sunset',
  'home/band': 'tropical beach aerial turquoise',
  'destinations/florida': 'Florida Keys sunset',
  'destinations/hawaii': 'Maui Hawaii coast',
  'destinations/california': 'Big Sur coast California',
  'destinations/las-vegas': 'Las Vegas Strip night',
  'destinations/new-york': 'New York City skyline sunset',
  'destinations/miami': 'Miami Beach palm trees',
  'destinations/orlando': 'Florida spring crystal water',
  'destinations/mexico': 'Tulum beach Mexico',
  'destinations/caribbean': 'Saint Lucia Pitons',
  'destinations/bahamas': 'Bahamas turquoise beach',
  'destinations/jamaica': 'Jamaica beach sunset',
  'destinations/dominican-republic': 'Punta Cana beach palm',
  'vacation-types/romantic-getaways': 'romantic couple sunset',
  'vacation-types/couples-vacations': 'couple travel beach',
  'vacation-types/honeymoon-vacations': 'honeymoon overwater bungalow',
  'vacation-types/adults-only-resorts': 'infinity pool resort ocean',
  'vacation-types/all-inclusive-resorts': 'all inclusive resort pool palm',
  'vacation-types/luxury-vacations': 'luxury villa ocean view',
  'vacation-types/beach-vacations': 'white sand beach turquoise water',
  'vacation-types/weekend-getaways': 'cabin lake autumn',
  'vacation-types/cruise-vacations': 'cruise ship ocean',
};

const COLLECTIONS = ['destinations', 'resorts', 'guides', 'vacation-types', 'deals'];
const entries = [{ key: 'home/hero' }, { key: 'home/band' }];
for (const col of COLLECTIONS) {
  const dir = join(ROOT, 'src/content', col);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    const fm = load(readFileSync(join(dir, f), 'utf8').split(/^---$/m)[1]) || {};
    entries.push({ key: `${col}/${f.replace(/\.md$/, '')}`, fm, col });
  }
}

function queryFor(e) {
  if (e.fm?.photoQuery) return e.fm.photoQuery;
  if (CURATED[e.key]) return CURATED[e.key];
  const fm = e.fm || {};
  if (e.col === 'resorts') {
    const place = String(fm.location || '').split(',').slice(-2).join(' ').trim();
    const kind = (fm.resortTypes || []).includes('beachfront') ? 'beach' : (fm.resortTypes || []).includes('spa') ? 'resort pool' : 'resort';
    return `${place} ${kind}`.trim();
  }
  if (e.col === 'guides') return String(fm.primaryKeyword || fm.title || '').replace(/\$[\d,]+/g, '').trim();
  if (e.col === 'deals') return `${fm.destination || ''} ${fm.productType === 'cruise' ? 'cruise' : 'beach'}`.replace(/-/g, ' ').trim();
  return String(fm.name || fm.title || e.key);
}

/** Normalized result: { id, width, src, alt, avg, photographer, photographerUrl, url }. */
async function search(query) {
  return SOURCE === 'Pexels' ? searchPexels(query) : searchPixabay(query);
}

async function searchPexels(query) {
  const u = new URL('https://api.pexels.com/v1/search');
  u.searchParams.set('query', query);
  u.searchParams.set('orientation', 'landscape');
  u.searchParams.set('per_page', '20');
  u.searchParams.set('size', 'large');
  const r = await fetch(u, { headers: { Authorization: PEXELS } });
  if (r.status === 429) throw new Error('Pexels rate limit reached — try again later');
  if (!r.ok) throw new Error(`Pexels search failed (${r.status}) for "${query}"`);
  return ((await r.json()).photos || []).map((p) => ({
    id: `pexels-${p.id}`,
    width: p.width,
    src: p.src.large2x || p.src.original,
    alt: (p.alt || '').trim(),
    avg: p.avg_color || '#0b1f3a',
    photographer: p.photographer,
    photographerUrl: p.photographer_url,
    url: p.url,
  }));
}

async function searchPixabay(query) {
  const u = new URL('https://pixabay.com/api/');
  u.searchParams.set('key', PIXABAY);
  u.searchParams.set('q', query.slice(0, 100));
  u.searchParams.set('image_type', 'photo');
  u.searchParams.set('orientation', 'horizontal');
  u.searchParams.set('safesearch', 'true');
  u.searchParams.set('min_width', '1280');
  u.searchParams.set('order', 'popular');
  u.searchParams.set('per_page', '20');
  const r = await fetch(u);
  if (r.status === 429) throw new Error('Pixabay rate limit reached — try again later');
  if (!r.ok) throw new Error(`Pixabay search failed (${r.status}) for "${query}"`);
  return ((await r.json()).hits || []).map((p) => ({
    id: `pixabay-${p.id}`,
    width: p.imageWidth,
    src: p.largeImageURL,
    // Pixabay has no alt text; its tags describe the scene, which is the best honest alt we have.
    alt: `Photo of ${String(p.tags || query).split(',').slice(0, 3).map((t) => t.trim()).join(', ')}`,
    avg: '#0b1f3a',
    photographer: p.user,
    photographerUrl: `https://pixabay.com/users/${encodeURIComponent(p.user)}-${p.user_id}/`,
    url: p.pageURL,
  }));
}

// Pixabay asks API clients to stay under 100 requests per minute.
const pause = () => new Promise((r) => setTimeout(r, SOURCE === 'Pixabay' ? 700 : 0));

mkdirSync(OUT, { recursive: true });
const used = new Set(Object.values(manifest).map((p) => p.id));
let fetched = 0;
let kept = 0;
for (const e of entries) {
  const query = queryFor(e);
  const slug = e.key.replace(/\//g, '--');
  const prev = manifest[e.key];
  if (!FORCE && prev && prev.query === query && (prev.source ?? 'Pexels') === SOURCE && WIDTHS.every((w) => existsSync(join(OUT, `${slug}-${w}.webp`)))) {
    kept++;
    continue;
  }
  try {
    let photos = await search(query);
    await pause();
    if (!photos.length) {
      photos = await search(query.split(' ').slice(-2).join(' '));
      await pause();
    }
    const photo = photos.find((p) => !used.has(p.id) && p.width >= WIDTHS.at(-1)) || photos.find((p) => !used.has(p.id));
    if (!photo) {
      console.warn(`photos: no result for ${e.key} ("${query}")`);
      continue;
    }
    const img = await fetch(photo.src);
    if (!img.ok) throw new Error(`download failed ${img.status}`);
    const buf = Buffer.from(await img.arrayBuffer());
    for (const w of WIDTHS) {
      await sharp(buf).resize({ width: w, height: Math.round(w * 0.625), fit: 'cover', position: 'attention' }).webp({ quality: w > 1000 ? 72 : 70 }).toFile(join(OUT, `${slug}-${w}.webp`));
    }
    used.add(photo.id);
    manifest[e.key] = {
      id: photo.id,
      query,
      base: `/photos/${slug}`,
      widths: WIDTHS,
      alt: photo.alt,
      avg: photo.avg,
      photographer: photo.photographer,
      photographerUrl: photo.photographerUrl,
      url: photo.url,
      source: SOURCE,
      representative: e.col === 'resorts',
    };
    fetched++;
    console.log(`photos: ${e.key} ← ${photo.url}`);
  } catch (err) {
    console.warn(`photos: ${e.key}: ${err.message}`);
    if (/rate limit/.test(err.message)) break;
  }
}
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`photos: ${fetched} fetched, ${kept} cached, ${Object.keys(manifest).length} total`);
