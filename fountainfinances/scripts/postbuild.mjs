// Post-build: limit Pages Functions to /api/* so static pages never invoke a Worker,
// and sanity-check the files search engines depend on.
import { writeFileSync, existsSync } from 'node:fs';

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

for (const f of ['dist/sitemap-index.xml', 'dist/robots.txt', 'dist/index.html', 'dist/404.html', 'dist/_headers']) {
  if (!existsSync(f)) {
    console.error(`postbuild: missing ${f}`);
    process.exit(1);
  }
}
console.log('postbuild: _routes.json written; core files present');
