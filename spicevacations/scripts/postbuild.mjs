// Post-build checks that must pass before deploy: every page has exactly one <h1>, a title,
// a meta description and a canonical; no inline executable scripts (CSP `script-src 'self'`);
// no partner URLs leaked into HTML (they must go through /go/).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const registry = JSON.parse(readFileSync(new URL('../src/data/affiliates.json', import.meta.url), 'utf8'));
const partnerHosts = registry.partners.filter((p) => p.urlTemplate).map((p) => new URL(p.urlTemplate).host);

const files = [];
const walk = (d) => readdirSync(d).forEach((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f.endsWith('.html') && files.push(join(d, f))));
walk(DIST);

const errors = [];
for (const f of files) {
  const rel = f.replace(DIST, '/');
  if (rel.startsWith('/admin/')) continue;
  const html = readFileSync(f, 'utf8');
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) errors.push(`${rel}: expected exactly one <h1>, found ${h1}`);
  if (!/<title>[^<]{10,}<\/title>/.test(html)) errors.push(`${rel}: missing <title>`);
  if (!/<meta name="description" content="[^"]{50,}"/.test(html)) errors.push(`${rel}: missing meta description`);
  if (!/<link rel="canonical"/.test(html)) errors.push(`${rel}: missing canonical`);
  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/g)];
  if (inline.length) errors.push(`${rel}: ${inline.length} inline <script> (breaks CSP)`);
  for (const host of partnerHosts) if (html.includes(host)) errors.push(`${rel}: partner URL (${host}) hardcoded in HTML — use /go/`);
  if (/lorem ipsum|coming soon/i.test(html)) errors.push(`${rel}: placeholder text found`);
}
if (errors.length) {
  console.error(`postbuild: ${errors.length} problem(s)\n` + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(1);
}
console.log(`postbuild: ${files.length} pages OK (one H1, title, description, canonical, CSP-safe scripts, no hardcoded partner URLs)`);
