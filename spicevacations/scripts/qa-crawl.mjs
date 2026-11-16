// Browser QA: crawls every page reachable from the home page, and at 375 / 768 / 1440 px checks
// HTTP status, console errors, horizontal overflow, broken internal links and images; then
// exercises the key interactions (mobile menu, save heart, search filters, planner, forms).
//   BASE=http://127.0.0.1:8788 node scripts/qa-crawl.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:8788';
const SHOTS = process.env.SHOTS || '/tmp/sv-shots';
mkdirSync(SHOTS, { recursive: true });
const executablePath = process.env.CHROMIUM || undefined;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const problems = [];
const seen = new Set(['/']);
const queue = ['/'];

// 1) Crawl at desktop width.
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(`${page.url()}: ${m.text()}`));
page.on('pageerror', (e) => consoleErrors.push(`${page.url()}: ${e.message}`));
while (queue.length) {
  const path = queue.shift();
  const res = await page.goto(BASE + path, { waitUntil: 'load' });
  if (!res || res.status() >= 400) problems.push(`${path}: HTTP ${res?.status()}`);
  const links = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
  for (const href of links) {
    if (!href || !href.startsWith('/') || href.startsWith('//')) continue;
    const clean = href.split('#')[0].split('?')[0];
    if (!clean || clean.startsWith('/go/') || clean.startsWith('/api/') || /\.(svg|png|ico|xml|json|txt)$/.test(clean)) continue;
    if (!seen.has(clean)) {
      seen.add(clean);
      queue.push(clean);
    }
  }
  const broken = await page.$$eval('img', (imgs) => imgs.filter((i) => i.complete && i.naturalWidth === 0 && i.loading !== 'lazy').map((i) => i.src));
  broken.forEach((b) => problems.push(`${path}: broken image ${b}`));
}
console.log(`crawled ${seen.size} pages`);

// 2) Responsive checks on key pages.
const KEY = ['/', '/destinations/', '/destinations/hawaii/', '/resorts/jade-mountain/', '/guides/best-romantic-getaways-in-florida/', '/plan-my-vacation/', '/search/?type=adults-only-resorts', '/deals/', '/contact/', '/brand/', '/404-test/'];
for (const width of [375, 768, 1440]) {
  const c = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  const p = await c.newPage();
  for (const path of [...seen, '/404-test/'].filter((x) => width === 1440 || KEY.includes(x) || x.startsWith('/guides/'))) {
    await p.goto(BASE + path, { waitUntil: 'load' });
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) problems.push(`${path} @${width}px: horizontal overflow ${overflow}px`);
    if (KEY.includes(path)) {
      await p.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-in')));
      await p.screenshot({ path: `${SHOTS}/${width}${path.replace(/[/?=&]+/g, '_') || '_home'}.png`, fullPage: width !== 1440 ? false : false });
    }
  }
  await c.close();
}

// 3) Interactions.
const m = await browser.newContext({ viewport: { width: 375, height: 800 } });
const mp = await m.newPage();
mp.on('pageerror', (e) => consoleErrors.push(`mobile: ${e.message}`));
await mp.goto(BASE + '/');
await mp.click('[data-menu-open]');
await mp.waitForTimeout(500);
if (!(await mp.isVisible('#mobile-menu .mobile-menu__panel'))) problems.push('mobile menu did not open');
await mp.keyboard.press('Escape');
await mp.goto(BASE + '/resorts/');
await mp.click('[data-save] >> nth=0');
const count = await mp.textContent('[data-saved-count]');
if (count !== '1') problems.push(`save heart: saved count is "${count}"`);
await mp.goto(BASE + '/saved/');
if ((await mp.$$('[data-saved-list] article')).length !== 1) problems.push('saved page does not list saved item');
await mp.goto(BASE + '/search/?type=adults-only-resorts&kind=resort');
await mp.waitForSelector('[data-search-results] article');
const n = (await mp.$$('[data-search-results] article')).length;
if (n < 5) problems.push(`search: only ${n} adults-only resorts`);
await mp.goto(BASE + '/plan-my-vacation/');
await mp.fill('#q-text', 'I have $2,500 for 5 days. We are a couple departing from New York and want a romantic beach vacation.');
await mp.click('[data-quick-planner] button[type=submit]');
await mp.waitForSelector('[data-results-grid] article', { timeout: 10000 }).catch(() => problems.push('planner: no results'));
await mp.screenshot({ path: `${SHOTS}/planner-results.png` });
await mp.goto(BASE + '/contact/');
await mp.fill('#c-name', 'QA Tester');
await mp.fill('#c-email', 'qa@example.com');
await mp.fill('#c-msg', 'This is an automated QA message.');
await mp.check('input[name=consent]');
await mp.waitForTimeout(2600);
await mp.click('[data-contact] button[type=submit]');
await mp.waitForSelector('[data-contact] [data-status][data-state="ok"], [data-contact] [data-status][data-state="error"]', { timeout: 10000 });
const st = await mp.getAttribute('[data-contact] [data-status]', 'data-state');
if (st !== 'ok') problems.push(`contact form state: ${st} ${await mp.textContent('[data-contact] [data-status]')}`);
await m.close();

await browser.close();
const errs = [...new Set(consoleErrors)];
if (errs.length) problems.push(...errs.map((e) => `console: ${e}`));
console.log(problems.length ? `QA problems (${problems.length}):\n - ${problems.join('\n - ')}` : 'QA: all pages, links, layouts and interactions OK');
process.exit(problems.length ? 1 : 0);
