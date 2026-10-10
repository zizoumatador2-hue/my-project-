// Real-browser end-to-end audit of the live site (Playwright Chromium).
// Usage: node scripts/e2e.mjs https://markettriggers.com out-dir
import { chromium, devices } from 'playwright';
import fs from 'node:fs';

const BASE = process.argv[2] || 'https://markettriggers.com';
const OUT = process.argv[3] || 'e2e-out';
fs.mkdirSync(`${OUT}/shots`, { recursive: true });
const report = { base: BASE, startedAt: new Date().toISOString(), pages: [], checks: [], issues: [] };
const issue = (where, what) => report.issues.push({ where, what });
const check = (name, ok, detail = '') => { report.checks.push({ name, ok, detail }); if (!ok) issue(name, detail || 'failed'); };

const VIEWPORTS = {
  mobile: { ...devices['iPhone 13'] },
  tablet: { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1366, height: 900 } },
  wide: { viewport: { width: 1920, height: 1080 } },
};

const browser = await chromium.launch();

// 1. Page inventory from the live sitemap
const ctx0 = await browser.newContext();
const sm = await (await ctx0.request.get(`${BASE}/sitemap-index.xml`)).text();
const subs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
let urls = [];
for (const s of subs) urls.push(...[...(await (await ctx0.request.get(s)).text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
urls = [...new Set(urls)].map((u) => u.replace('https://markettriggers.com', BASE));
check('sitemap has pages', urls.length > 5, `${urls.length} urls`);

// 2. Static endpoints
for (const [p, want] of [['/robots.txt', 'Sitemap'], ['/ads.txt', 'pub-8532224804732263'], ['/rss.xml', '<rss'], ['/sitemap-index.xml', '<sitemapindex']]) {
  const r = await ctx0.request.get(BASE + p); const t = await r.text();
  check(`endpoint ${p}`, r.status() === 200 && t.includes(want), `status ${r.status()}`);
}
const r404 = await ctx0.request.get(`${BASE}/this-page-does-not-exist-xyz/`);
check('unknown URL returns 404', r404.status() === 404, `status ${r404.status()}`);
const rNoSlash = await ctx0.request.get(`${BASE}/about`, { maxRedirects: 0 });
check('no-trailing-slash redirects', [301, 302, 307, 308].includes(rNoSlash.status()), `status ${rNoSlash.status()}`);
const rWww = await ctx0.request.get(`https://www.markettriggers.com/`);
check('www responds', rWww.status() === 200, `status ${rWww.status()}`);

// 3. Every page at every viewport
const linkSet = new Set();
for (const [vpName, opts] of Object.entries(VIEWPORTS)) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript(() => { try { localStorage.setItem('mt:consent', 'reject'); } catch (e) {} });
  for (const url of urls) {
    const page = await ctx.newPage();
    const errs = [], failed = [];
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    page.on('response', (r) => { const u = r.url(); if (r.status() >= 400 && u.startsWith(BASE)) failed.push(`${r.status()} ${u}`); });
    page.on('requestfailed', (r) => { const u = r.url(); if (u.startsWith(BASE)) failed.push(`failed ${u} ${r.failure()?.errorText}`); });
    const t0 = Date.now();
    const resp = await page.goto(url, { waitUntil: 'load', timeout: 45000 });
    const loadMs = Date.now() - t0;
    await page.waitForTimeout(600);
    // scroll through to trigger reveals / lazy images
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const de = document.documentElement;
      const wide = [...document.querySelectorAll('body *')].filter((el) => {
        const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
        if (cs.position === 'fixed' || r.width === 0) return false;
        let p = el.parentElement; while (p) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return false; p = p.parentElement; }
        return r.right > de.clientWidth + 2;
      }).slice(0, 5).map((el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''));
      const imgs = [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src);
      const noAlt = [...document.images].filter((i) => !i.hasAttribute('alt')).length;
      const small = [...document.querySelectorAll('a, button')].filter((el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && r.height < 24 && cs.display !== 'inline' && el.offsetParent; }).length;
      const hiddenReveal = [...document.querySelectorAll('.reveal:not(.is-revealed)')].length;
      return {
        title: document.title, h1: [...document.querySelectorAll('h1')].map((h) => h.getAttribute('aria-label') || h.textContent.trim()),
        desc: document.querySelector('meta[name=description]')?.content || '', canonical: document.querySelector('link[rel=canonical]')?.href || '',
        robots: document.querySelector('meta[name=robots]')?.content || '', lang: de.lang,
        ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { const j = JSON.parse(s.textContent); return [].concat(j).map((x) => x['@type']).join(','); } catch (e) { return 'INVALID'; } }),
        hScroll: de.scrollWidth > de.clientWidth + 1, scrollW: de.scrollWidth, clientW: de.clientWidth, wide, brokenImgs: imgs, noAlt, smallTargets: small, hiddenReveal,
        links: [...document.querySelectorAll('a[href]')].map((a) => a.href).filter((h) => h.startsWith(location.origin)),
        cls: (performance.getEntriesByType('layout-shift') || []).reduce((s, e) => s + (e.hadRecentInput ? 0 : e.value), 0),
      };
    });
    m.links.forEach((l) => linkSet.add(l.split('#')[0]));
    const rec = { vp: vpName, url, status: resp?.status(), loadMs, ...m, errs, failed }; delete rec.links;
    report.pages.push(rec);
    const where = `${vpName} ${url.replace(BASE, '')}`;
    if (resp?.status() !== 200) issue(where, `HTTP ${resp?.status()}`);
    if (errs.length) issue(where, 'JS/console errors: ' + errs.join(' | '));
    if (failed.length) issue(where, 'failed requests: ' + failed.join(' | '));
    if (m.hScroll) issue(where, `horizontal scroll ${m.scrollW}>${m.clientW}; wide: ${m.wide.join(', ')}`);
    if (m.brokenImgs.length) issue(where, 'broken images: ' + m.brokenImgs.join(', '));
    if (m.noAlt) issue(where, `${m.noAlt} images without alt`);
    if (m.h1.length !== 1) issue(where, `h1 count ${m.h1.length}`);
    if (vpName === 'desktop') {
      if (!m.desc || m.desc.length > 165) issue(where, `meta description length ${m.desc.length}`);
      if (m.title.length > 70) issue(where, `title length ${m.title.length}`);
      if (m.ld.includes('INVALID')) issue(where, 'invalid JSON-LD');
    }
    if (m.cls > 0.1) issue(where, `layout shift CLS ${m.cls.toFixed(3)}`);
    const slug = (url.replace(BASE, '').replace(/\//g, '_') || '_home').replace(/^_|_$/g, '') || 'home';
    if (vpName === 'mobile' || vpName === 'desktop') await page.screenshot({ path: `${OUT}/shots/${vpName}-${slug}.jpg`, type: 'jpeg', quality: 55, fullPage: true });
    await page.close();
  }
  await ctx.close();
}

// 4. Every internal link resolves
for (const l of linkSet) {
  const r = await ctx0.request.get(l);
  if (r.status() !== 200) issue('link ' + l, `HTTP ${r.status()}`);
}
check('internal links checked', true, `${linkSet.size} unique`);

// 5. Interactive flows
const mob = await browser.newContext(VIEWPORTS.mobile);
let p = await mob.newPage();
const flowErrs = []; p.on('pageerror', (e) => flowErrs.push(e.message));
await p.goto(BASE + '/');
// cookie bar
const bar = p.locator('#cookie-bar');
check('cookie bar visible on first visit', await bar.isVisible());
await p.screenshot({ path: `${OUT}/shots/flow-cookie-bar-mobile.jpg`, type: 'jpeg', quality: 60 });
await p.click('[data-consent="reject"]');
check('cookie bar hides after choice', !(await bar.isVisible()));
check('consent stored', (await p.evaluate(() => localStorage.getItem('mt:consent'))) === 'reject');
await p.reload();
check('cookie bar stays hidden after reload', !(await bar.isVisible()));
// mobile menu
const toggle = p.locator('#nav-toggle');
check('mobile menu button visible', await toggle.isVisible());
await toggle.click(); await p.waitForTimeout(300);
check('mobile menu opens', (await toggle.getAttribute('aria-expanded')) === 'true' && await p.locator('#main-nav a').first().isVisible());
await p.screenshot({ path: `${OUT}/shots/flow-menu-open-mobile.jpg`, type: 'jpeg', quality: 60 });
await p.locator('#main-nav a', { hasText: 'Economic Indicators' }).click();
await p.waitForURL('**/economic-indicators/');
check('mobile menu link navigates', p.url().endsWith('/economic-indicators/'));
// explorer
await p.goto(BASE + '/#trigger-explorer');
const tabs = p.locator('.explorer__tab');
const nTabs = await tabs.count();
let explorerOk = nTabs > 1;
for (let i = 0; i < nTabs; i++) {
  await tabs.nth(i).click();
  const id = await tabs.nth(i).getAttribute('aria-controls');
  explorerOk = explorerOk && (await p.locator('#' + id).isVisible()) && (await p.locator('.explorer__panel:visible').count()) === 1;
}
check('trigger explorer: every tab shows exactly its panel', explorerOk, `${nTabs} tabs`);
await tabs.nth(1).focus(); await p.keyboard.press('ArrowRight');
check('trigger explorer: arrow keys move', (await tabs.nth(2).getAttribute('aria-selected')) === 'true');
await p.locator('#trigger-explorer').screenshot({ path: `${OUT}/shots/flow-explorer-mobile.jpg`, type: 'jpeg', quality: 60 });
// quiz
const items = p.locator('.quiz__item'); const nq = await items.count();
for (let i = 0; i < nq; i++) { await items.nth(i).locator('.quiz__opt').first().click(); }
const score = await p.locator('.quiz__score').textContent();
check('quiz: score appears after all answers', /You scored \d out of \d/.test(score || ''), score || '');
check('quiz: answered buttons disabled', await items.first().locator('.quiz__opt').first().isDisabled());
await p.locator('.quiz').screenshot({ path: `${OUT}/shots/flow-quiz-mobile.jpg`, type: 'jpeg', quality: 60 });
// FAQ details on homepage
const det = p.locator('details').first();
if (await det.count()) { await det.locator('summary').click(); check('FAQ expands', await det.evaluate((d) => d.open)); }
// article: TOC, related, back to top
const art = urls.find((u) => u.includes('/articles/') && !u.endsWith('/articles/'));
await p.goto(art);
check('article: TOC present', await p.locator('.article-toc a').count() > 2);
const firstToc = p.locator('.article-toc a').nth(1); const hash = await firstToc.getAttribute('href');
await firstToc.click(); await p.waitForTimeout(800);
const inView = await p.evaluate((h) => { const el = document.getElementById(decodeURIComponent(h.slice(1))); const r = el.getBoundingClientRect(); return r.top >= -5 && r.top < innerHeight / 2; }, hash);
check('article: TOC link scrolls to section below header', inView, hash);
check('article: related articles shown', await p.locator('.related .card').count() >= 1);
check('article: reading time shown', /\d+ min read/.test(await p.locator('.article-meta').textContent()));
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(500);
const tt = p.locator('.to-top');
if (await tt.count()) { check('back-to-top visible after scrolling', await tt.isVisible()); await tt.click(); await p.waitForTimeout(1200); check('back-to-top returns to top', (await p.evaluate(() => scrollY)) < 50); }
// text selection in a card does not navigate
await p.goto(BASE + '/articles/');
const card = p.locator('a.card').first();
if (await card.count()) {
  const before = p.url();
  const box = await card.locator('.card__title').boundingBox();
  await p.mouse.move(box.x + 2, box.y + box.height / 2); await p.mouse.down(); await p.mouse.move(box.x + box.width - 4, box.y + box.height / 2, { steps: 8 }); await p.mouse.up();
  await p.waitForTimeout(500);
  check('card text can be selected without navigating', p.url() === before);
}
// 404 page renders
const r = await p.goto(BASE + '/nope-404-test/');
check('404 page renders with link home', r.status() === 404 && await p.locator('a[href="/"]').count() > 0);
await p.screenshot({ path: `${OUT}/shots/flow-404-mobile.jpg`, type: 'jpeg', quality: 60 });
check('no JS errors during flows', flowErrs.length === 0, flowErrs.join(' | '));
// Reduced motion: content visible without animation
const rm = await browser.newContext({ ...VIEWPORTS.desktop, reducedMotion: 'reduce' });
const rp = await rm.newPage(); await rp.goto(art);
check('reduced motion: title readable, no hidden reveal', (await rp.locator('h1 .w').count()) === 0 && (await rp.locator('.reveal:not(.is-revealed)').count()) === 0);
// Desktop: magnetic button + header nav
const dk = await browser.newContext(VIEWPORTS.desktop); const dp = await dk.newPage(); await dp.goto(BASE + '/');
check('desktop: nav links visible, menu button hidden', (await dp.locator('#main-nav a').first().isVisible()) && !(await dp.locator('#nav-toggle').isVisible()));
// Accept-all consent updates gtag
const ac = await browser.newContext(VIEWPORTS.desktop); const ap = await ac.newPage(); await ap.goto(BASE + '/');
await ap.click('[data-consent="accept"]');
check('accept-all stored', (await ap.evaluate(() => localStorage.getItem('mt:consent'))) === 'accept');
await ap.screenshot({ path: `${OUT}/shots/flow-home-desktop-fold.jpg`, type: 'jpeg', quality: 70 });

report.finishedAt = new Date().toISOString();
report.summary = { pagesTested: urls.length, viewports: Object.keys(VIEWPORTS).length, pageLoads: report.pages.length, checks: report.checks.length, checksFailed: report.checks.filter((c) => !c.ok).length, issues: report.issues.length };
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report.summary));
for (const i of report.issues.slice(0, 200)) console.log('ISSUE', i.where, '::', i.what);
await browser.close();
