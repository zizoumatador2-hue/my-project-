// Post-build: limit Pages Functions to /api/* so static pages never invoke a Worker,
// and sanity-check the files search engines depend on.
import { writeFileSync, existsSync } from 'node:fs';

writeFileSync('dist/_routes.json', JSON.stringify({ version: 1, include: ['/api/*'], exclude: [] }, null, 2));

for (const f of ['dist/sitemap-index.xml', 'dist/robots.txt', 'dist/index.html', 'dist/404.html', 'dist/_headers']) {
  if (!existsSync(f)) {
    console.error(`postbuild: missing ${f}`);
    process.exit(1);
  }
}
console.log('postbuild: _routes.json written; core files present');
