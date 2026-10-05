// Post-build: limit Pages Functions to /api/* so static pages never invoke a Worker,
// and sanity-check the files search engines depend on.
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

writeFileSync('dist/_routes.json', JSON.stringify({ version: 1, include: ['/api/*'], exclude: [] }, null, 2));

// ads.txt authorizes Google to sell ads on this domain (required by AdSense).
const adsense = (process.env.PUBLIC_ADSENSE_CLIENT || '').trim();
if (/^ca-pub-\d{10,20}$/.test(adsense)) {
  writeFileSync('dist/ads.txt', `google.com, ${adsense.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`);
  console.log('postbuild: ads.txt written');
} else if (adsense) {
  console.error(`postbuild: PUBLIC_ADSENSE_CLIENT must look like ca-pub-1234567890123456 (got "${adsense}")`);
  process.exit(1);
}

// 1200×630 JPEG preview images (Open Graph, Twitter, Article schema) from each page's photo.
const photos = JSON.parse(readFileSync('src/data/photos.json', 'utf8'));
mkdirSync('dist/images/og', { recursive: true });
await Promise.all(
  Object.keys(photos).map((slot) =>
    sharp(`public/images/photos/${slot}-1600.webp`)
      .resize(1200, 630, { fit: 'cover', position: 'attention' })
      .jpeg({ quality: 78, mozjpeg: true })
      .toFile(`dist/images/og/${slot}.jpg`),
  ),
);
console.log(`postbuild: ${Object.keys(photos).length} preview images written`);

for (const f of ['dist/sitemap-index.xml', 'dist/robots.txt', 'dist/index.html', 'dist/404.html', 'dist/_headers']) {
  if (!existsSync(f)) {
    console.error(`postbuild: missing ${f}`);
    process.exit(1);
  }
}
console.log('postbuild: _routes.json written; core files present');
