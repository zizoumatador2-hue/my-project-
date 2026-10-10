// Visits every sitemap URL (plus a few utility pages) at phone and desktop widths and reports
// horizontal overflow, console errors, calculators without a result and an empty search.
// Usage: npm run build && npx astro preview --port 4321 &  then  node scripts/browser-sweep.mjs
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const sm = readFileSync('dist/sitemap-0.xml','utf8');
const paths = [...sm.matchAll(/<loc>https:\/\/www\.fountainfinances\.com([^<]+)<\/loc>/g)].map(m=>m[1]).concat(['/search/?q=credit','/404.html','/newsletter/unsubscribe/']);
const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = [];
for (const vp of [{width:390,height:844},{width:1366,height:900}]) {
  const ctx = await b.newContext({ viewport: vp });
  const p = await ctx.newPage();
  let errs = [];
  p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  for (const path of paths) {
    errs = [];
    await p.goto('http://localhost:4321'+path, { waitUntil: 'load' });
    await p.waitForTimeout(path.startsWith('/search') ? 600 : 60);
    const r = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth,
      big: document.querySelector('.calc-out .big-num')?.textContent?.trim(), results: document.querySelectorAll('#results li').length }));
    if (r.sw > r.w + 1) problems.push(`${vp.width} ${path} overflow ${r.sw}>${r.w}`);
    if (path.startsWith('/calculators/') && path !== '/calculators/' && (!r.big || r.big === '—')) problems.push(`${path} no result: ${r.big}`);
    if (path.startsWith('/search') && r.results === 0) problems.push(`search returned nothing`);
    const real = errs.filter(e => !(path === '/404.html' && /404/.test(e)));
    if (real.length) problems.push(`${vp.width} ${path} console: ${real.join(' | ').slice(0,200)}`);
  }
  await ctx.close();
}
await b.close();
console.log(`checked ${paths.length} paths x2`);
console.log(problems.length ? problems.join('\n') : 'no problems');
process.exitCode = problems.length ? 1 : 0;
