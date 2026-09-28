// Bulk-import destinations or resorts (or any collection) from CSV or JSON into Markdown entries.
//
//   npm run import:content -- --collection resorts --file data/resorts.csv [--overwrite] [--dry-run]
//
// CSV: first row = field names. List fields use "|" as a separator (e.g. features: "Spa|Beachfront|Adults-only").
// Nested objects use dot notation (e.g. rating.value). A "body" column becomes the Markdown body.
// JSON: an array of objects with the same field names as the frontmatter.
// Every imported file is then validated by the Astro content schema on the next build,
// and `npm run report:content` flags missing SEO fields before you publish.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { parseCsv } from './lib/csv.mjs';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const collection = opt('collection');
const file = opt('file');
const overwrite = args.includes('--overwrite');
const dryRun = args.includes('--dry-run');
const ALLOWED = ['destinations', 'resorts', 'guides', 'vacation-types', 'deals'];
if (!collection || !ALLOWED.includes(collection) || !file) {
  console.error(`Usage: --collection <${ALLOWED.join('|')}> --file <path.csv|path.json> [--overwrite] [--dry-run]`);
  process.exit(1);
}

const LIST_FIELDS = new Set(['airports', 'idealFor', 'budgetStyles', 'vacationTypes', 'activities', 'resortTypes', 'features', 'goodToKnow', 'secondaryKeywords', 'destinations', 'resorts', 'related', 'tips', 'bestMonths', 'months']);
const NUM_LIST = new Set(['bestMonths', 'months']);
const BOOL = new Set(['featured', 'adultsOnly', 'noindex', 'draft']);
const NUM = new Set(['order']);

function normalize(rec) {
  const out = {};
  for (const [k, raw] of Object.entries(rec)) {
    if (raw === '' || raw === undefined || raw === null) continue;
    let v = raw;
    if (typeof v === 'string') {
      if (LIST_FIELDS.has(k)) v = v.split('|').map((s) => s.trim()).filter(Boolean);
      if (NUM_LIST.has(k)) v = v.map(Number);
      if (BOOL.has(k)) v = /^(true|yes|1)$/i.test(v);
      if (NUM.has(k)) v = Number(v);
    }
    if (k.includes('.')) {
      const [a, b] = k.split('.');
      out[a] = { ...(out[a] || {}), [b]: /^\d+(\.\d+)?$/.test(v) ? Number(v) : v };
    } else out[k] = v;
  }
  return out;
}

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const text = readFileSync(file, 'utf8');
const records = file.endsWith('.json') ? JSON.parse(text) : parseCsv(text);
const dir = new URL(`../src/content/${collection}/`, import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
let written = 0;
let skipped = 0;
for (const r of records) {
  const rec = normalize(r);
  const slug = slugify(rec.slug || rec.name || rec.title);
  if (!slug) {
    console.warn('skip: record without name/title/slug', r);
    skipped++;
    continue;
  }
  delete rec.slug;
  const body = rec.body || '';
  delete rec.body;
  rec.updated ||= new Date().toISOString().slice(0, 10);
  const path = join(dir, `${slug}.md`);
  if (existsSync(path) && !overwrite) {
    console.warn(`skip: ${collection}/${slug}.md exists (use --overwrite)`);
    skipped++;
    continue;
  }
  const md = `---\n${yaml.dump(rec, { lineWidth: 200 })}---\n\n${body}\n`;
  if (!dryRun) writeFileSync(path, md);
  written++;
  console.log(`${dryRun ? 'would write' : 'wrote'} ${collection}/${slug}.md`);
}
console.log(`import: ${written} written, ${skipped} skipped. Next: npm run report:content && npm run build`);
