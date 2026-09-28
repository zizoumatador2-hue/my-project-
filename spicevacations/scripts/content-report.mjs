// Reports content entries with missing or weak SEO fields, broken internal links and thin content.
// Usage: npm run report:content   (exit code 1 if any error is found)
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const ROOT = new URL('../src/content/', import.meta.url).pathname;
const COLLECTIONS = {
  destinations: { url: '/destinations/', minWords: 130 },
  resorts: { url: '/resorts/', minWords: 60 },
  guides: { url: '/guides/', minWords: 1500 },
  'vacation-types': { url: '/vacation-types/', minWords: 40 },
  deals: { url: '/deals/', minWords: 40 },
  pages: { url: null, minWords: 0 },
};
const STATIC_ROUTES = new Set([
  '/', '/destinations/', '/resorts/', '/guides/', '/vacation-types/', '/deals/', '/plan-my-vacation/', '/search/', '/saved/', '/about/', '/contact/',
  '/faq/', '/privacy-policy/', '/terms/', '/affiliate-disclosure/', '/cookie-policy/', '/brand/',
]);

const entries = [];
for (const [col, cfg] of Object.entries(COLLECTIONS)) {
  const dir = join(ROOT, col);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    const raw = readFileSync(join(dir, f), 'utf8');
    const [, fm, ...rest] = raw.split(/^---$/m);
    const body = rest.join('---');
    let data = {};
    try {
      data = yaml.load(fm) ?? {};
    } catch (e) {
      entries.push({ col, id: f, error: `YAML: ${e.message.split('\n')[0]}` });
      continue;
    }
    entries.push({ col, id: f.replace(/\.md$/, ''), data, body, cfg });
  }
}
const routes = new Set(STATIC_ROUTES);
for (const e of entries) if (e.cfg?.url) routes.add(`${e.cfg.url}${e.id}/`);

const problems = [];
const warn = [];
const len = (s) => (typeof s === 'string' ? s.length : 0);
const guideKeywords = new Map();
for (const e of entries) {
  const where = `${e.col}/${e.id}`;
  if (e.error) {
    problems.push(`${where}: ${e.error}`);
    continue;
  }
  const d = e.data;
  if (e.col !== 'pages') {
    if (!d.metaTitle) problems.push(`${where}: missing metaTitle`);
    else if (len(d.metaTitle) < 20 || len(d.metaTitle) > 62) problems.push(`${where}: metaTitle length ${len(d.metaTitle)} (20–62)`);
    if (!d.metaDescription) problems.push(`${where}: missing metaDescription`);
    else if (len(d.metaDescription) < 110 || len(d.metaDescription) > 165) problems.push(`${where}: metaDescription length ${len(d.metaDescription)} (110–165)`);
    if (!d.imageAlt || len(d.imageAlt) < 10) problems.push(`${where}: missing/short imageAlt`);
    if (d.summary && (len(d.summary) < 80 || len(d.summary) > 320)) problems.push(`${where}: summary length ${len(d.summary)} (80–320)`);
    if (d.tagline && len(d.tagline) > 110) problems.push(`${where}: tagline length ${len(d.tagline)} (≤110)`);
  }
  if (e.col === 'guides') {
    if (len(d.title) < 20 || len(d.title) > 110) problems.push(`${where}: title length ${len(d.title)} (20–110)`);
    if (len(d.snippet) < 180 || len(d.snippet) > 420) problems.push(`${where}: snippet length ${len(d.snippet)} (180–420)`);
    if (!d.faqs?.length) warn.push(`${where}: no FAQs`);
    if (!/\]\(\/\)/.test(e.body)) problems.push(`${where}: no contextual link back to the pillar page (/)`);
    const k = (d.primaryKeyword || '').toLowerCase();
    if (guideKeywords.has(k)) problems.push(`${where}: primaryKeyword "${k}" duplicates ${guideKeywords.get(k)} (cannibalization)`);
    guideKeywords.set(k, where);
  }
  const words = (e.body || '').split(/\s+/).filter(Boolean).length;
  if (e.cfg?.minWords && words < e.cfg.minWords) problems.push(`${where}: ${words} words (min ${e.cfg.minWords})`);
  for (const m of (e.body || '').matchAll(/\]\((\/[^)#\s]*)(#[^)]*)?\)/g)) {
    const href = m[1];
    if (/\.(svg|png|xml|txt|json)$/.test(href)) continue;
    if (!routes.has(href)) problems.push(`${where}: broken internal link ${href}`);
  }
  for (const ref of [...(d.destinations || []), ...(d.destination ? [d.destination] : [])])
    if (!routes.has(`/destinations/${ref}/`)) problems.push(`${where}: unknown destination "${ref}"`);
  for (const ref of d.resorts || []) if (!routes.has(`/resorts/${ref}/`)) problems.push(`${where}: unknown resort "${ref}"`);
  for (const ref of d.related || []) if (!routes.has(`/guides/${ref}/`)) warn.push(`${where}: related guide "${ref}" does not exist yet`);
  for (const ref of [...(d.vacationTypes || []), ...(d.category ? [d.category] : []), ...(d.vacationType ? [d.vacationType] : [])])
    if (!routes.has(`/vacation-types/${ref}/`)) problems.push(`${where}: unknown vacation type "${ref}"`);
}

const guides = entries.filter((e) => e.col === 'guides' && e.data);
console.log(`content: ${entries.length} entries · ${guides.length} guides · ${guides.reduce((n, g) => n + g.body.split(/\s+/).filter(Boolean).length, 0)} guide words`);
if (warn.length) console.log('warnings:\n' + warn.map((w) => ' - ' + w).join('\n'));
if (problems.length) {
  console.error(`errors (${problems.length}):\n` + problems.map((p) => ' - ' + p).join('\n'));
  process.exit(1);
}
console.log('content: all SEO fields present and valid, no broken internal links');
