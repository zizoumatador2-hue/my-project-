// Run from a machine with internet access (e.g. weekly in CI or locally): checks every external link in dist/.
//   npm run build && node scripts/check-external.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'node-html-parser';

const walk = (d, o = []) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p, o) : o.push(p); } return o; };
const urls = new Map();
for (const f of walk('dist').filter((x) => x.endsWith('.html'))) {
  for (const a of parse(readFileSync(f, 'utf8')).querySelectorAll('a[href^="http"]')) {
    const h = a.getAttribute('href');
    if (!urls.has(h)) urls.set(h, f);
  }
}
let bad = 0;
for (const [u, from] of urls) {
  try {
    let r = await fetch(u, { method: 'HEAD', redirect: 'follow', headers: { 'User-Agent': 'DistritoGamerLinkCheck/1.0' } });
    if (r.status === 405 || r.status === 403) r = await fetch(u, { redirect: 'follow', headers: { 'User-Agent': 'DistritoGamerLinkCheck/1.0' } });
    if (r.status >= 400) { bad++; console.log(`${r.status} ${u}  (in ${from})`); }
  } catch (e) { bad++; console.log(`ERR ${u} ${e.message} (in ${from})`); }
}
console.log(`${urls.size} external links checked, ${bad} problem(s).`);
process.exit(bad ? 1 : 0);
