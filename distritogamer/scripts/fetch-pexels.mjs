// Optional: replace the original illustrations with licensed Pexels photos, with a human picking every image.
//
//   PEXELS_API_KEY=... node scripts/fetch-pexels.mjs search            # downloads candidates + builds a contact sheet
//   open photo-candidates/index.html                                    # review: does the photo match the article?
//   node scripts/fetch-pexels.mjs pick <article-slug> <candidate-number>
//
// `pick` copies the photo to src/assets/photos/<slug>.jpg (it is then used automatically instead of the illustration)
// and records the photographer credit in src/data/credits.json, which the article page displays.
// Get a free API key at https://www.pexels.com/api/ . Follow Pexels' API terms: link back to Pexels and credit the photographer.
// Avoid violent or disturbing imagery to keep the site advertiser-friendly.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const KEY = process.env.PEXELS_API_KEY;
const [, , cmd, a1, a2] = process.argv;
const ART = 'src/content/articles';
const CAND = 'photo-candidates';
const CREDITS = 'src/data/credits.json';

const queryOf = (slug) => {
  const fm = readFileSync(join(ART, slug + '.md'), 'utf8').split('---')[1];
  return (fm.match(/^imageQuery:\s*"?([^"\n]+)"?/m) || [])[1];
};

async function search() {
  if (!KEY) { console.error('Set PEXELS_API_KEY first (never commit it).'); process.exit(1); }
  mkdirSync(CAND, { recursive: true });
  const index = {};
  for (const f of readdirSync(ART).filter((x) => x.endsWith('.md'))) {
    const slug = f.replace(/\.md$/, '');
    const q = queryOf(slug);
    if (!q) continue;
    const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&orientation=landscape&size=large&per_page=6`, { headers: { Authorization: KEY } });
    if (!res.ok) { console.error(slug, 'API error', res.status); continue; }
    const { photos } = await res.json();
    index[slug] = [];
    let n = 0;
    for (const ph of photos) {
      n++;
      const img = await fetch(ph.src.large2x || ph.src.large);
      const dir = join(CAND, slug); mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${n}.jpg`), Buffer.from(await img.arrayBuffer()));
      index[slug].push({ n, photographer: ph.photographer, photographerUrl: ph.photographer_url, pageUrl: ph.url, alt: ph.alt || '' });
    }
    console.log(slug, `-> ${n} candidates for "${q}"`);
    await new Promise((r) => setTimeout(r, 400)); // be polite with rate limits
  }
  writeFileSync(join(CAND, 'index.json'), JSON.stringify(index, null, 2));
  const html = `<!doctype html><meta charset=utf-8><title>Pexels candidates</title><body style="font:14px system-ui;background:#111;color:#eee;padding:20px">` +
    Object.entries(index).map(([slug, c]) => `<h2>${slug}</h2><div style="display:flex;gap:10px;flex-wrap:wrap">${c.map((x) => `<figure style="margin:0;width:260px"><img src="${slug}/${x.n}.jpg" style="width:100%"><figcaption>#${x.n} by ${x.photographer}<br><small>${x.alt}</small></figcaption></figure>`).join('')}</div>`).join('') + `</body>`;
  writeFileSync(join(CAND, 'index.html'), html);
  console.log(`\nOpen ${CAND}/index.html, then: node scripts/fetch-pexels.mjs pick <slug> <number>`);
}

function pick() {
  if (!a1 || !a2) { console.error('Usage: pick <article-slug> <candidate-number>'); process.exit(1); }
  const idx = JSON.parse(readFileSync(join(CAND, 'index.json'), 'utf8'));
  const c = (idx[a1] || []).find((x) => String(x.n) === String(a2));
  if (!c) { console.error('No such candidate'); process.exit(1); }
  mkdirSync('src/assets/photos', { recursive: true });
  copyFileSync(join(CAND, a1, `${a2}.jpg`), `src/assets/photos/${a1}.jpg`);
  const credits = existsSync(CREDITS) ? JSON.parse(readFileSync(CREDITS, 'utf8')) : {};
  credits[a1] = { photographer: c.photographer, photographerUrl: c.photographerUrl, pageUrl: c.pageUrl };
  writeFileSync(CREDITS, JSON.stringify(credits, null, 2) + '\n');
  console.log(`Picked #${a2} for ${a1} (photo by ${c.photographer}). Update imageAlt in the article so it describes the new photo.`);
}

if (cmd === 'search') await search();
else if (cmd === 'pick') pick();
else { console.log('Commands: search | pick <slug> <n>'); process.exit(1); }
