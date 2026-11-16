// Weekly editorial rotation: prints the ~20% of substantive content due for review this week.
// Pages are split into 5 stable cohorts by a hash of their URL; the ISO week picks the cohort,
// so every page is reviewed once every 5 weeks. Usage: node scripts/weekly-cohort.mjs [--week N]
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIRS = ['guides', 'destinations', 'resorts', 'deals', 'vacation-types'];
const COHORTS = 5;

function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y) / 86400000 + 1) / 7);
}

const arg = process.argv.indexOf('--week');
const week = arg > -1 ? Number(process.argv[arg + 1]) : isoWeek();
const cohort = week % COHORTS;

const pages = [];
for (const dir of DIRS) {
  const base = new URL(`../src/content/${dir}/`, import.meta.url);
  if (!existsSync(base)) continue;
  for (const f of readdirSync(base).filter((x) => x.endsWith('.md'))) {
    const src = readFileSync(new URL(f, base), 'utf8');
    if (/^(draft|noindex):\s*true/m.test(src)) continue;
    const url = `/${dir}/${f.replace(/\.md$/, '')}/`;
    const updated = /^updated:\s*["']?(\d{4}-\d{2}-\d{2})/m.exec(src)?.[1] ?? 'unknown';
    const h = createHash('sha1').update(url).digest().readUInt32BE(0) % COHORTS;
    if (h === cohort) pages.push({ url, updated });
  }
}

pages.sort((a, b) => a.updated.localeCompare(b.updated));
console.log(`ISO week ${week} -> cohort ${cohort + 1}/${COHORTS}: ${pages.length} pages (oldest update first)`);
for (const p of pages) console.log(`${p.updated}  https://spicevacations.com${p.url}`);
