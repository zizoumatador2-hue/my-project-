// Regenerates logo PNGs, favicons and the default Open Graph image: node scripts/generate-brand-images.mjs
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const logo = readFileSync('public/favicon.svg','utf8');
const inter = 'data:font/woff2;base64,' + readFileSync('public/fonts/inter-var.woff2').toString('base64');
const serif = 'data:font/woff2;base64,' + readFileSync('public/fonts/source-serif-4-var.woff2').toString('base64');
const fonts = `@font-face{font-family:I;src:url(${inter})}@font-face{font-family:S;src:url(${serif})}`;
const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
async function shot(html, w, h, out, transparent=false) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.setContent(`<html><head><style>${fonts}html,body{margin:0}</style></head><body>${html}</body></html>`);
  await p.waitForTimeout(800);
  await p.screenshot({ path: out, omitBackground: transparent });
  await p.close();
}
const icon = (s) => `<div style="width:${s}px;height:${s}px">${logo.replace('<svg ', `<svg width="${s}" height="${s}" `)}</div>`;
await shot(icon(512), 512, 512, 'public/images/logo-512.png', true);
await shot(icon(192), 192, 192, 'public/images/icon-192.png', true);
await shot(icon(32), 32, 32, 'public/favicon-32.png', true);
await shot(`<div style="width:180px;height:180px;background:#0a6a6b;display:flex;align-items:center;justify-content:center">${logo.replace('<svg ','<svg width="180" height="180" ').replace('rx="11"','rx="0"')}</div>`, 180, 180, 'public/apple-touch-icon.png');
await shot(`<div style="width:1200px;height:630px;box-sizing:border-box;padding:72px 80px;background:linear-gradient(135deg,#f0f8f6 0%,#ffffff 55%,#e5f2f0 100%);font-family:I;display:flex;flex-direction:column;justify-content:space-between;border-bottom:14px solid #0a6a6b">
  <div style="display:flex;align-items:center;gap:22px">${logo.replace('<svg ','<svg width="84" height="84" ')}<div style="font-size:40px;font-weight:700;color:#0f1d2b">Fountain Finances</div></div>
  <div><div style="font-family:S;font-size:78px;font-weight:650;line-height:1.05;color:#0f1d2b;letter-spacing:-1px">Smarter Money Decisions,<br/>Made Simple.</div>
  <div style="margin-top:26px;font-size:30px;color:#2c3e50">Guides · Free calculators · Transparent comparisons</div></div>
  <div style="font-size:26px;color:#0a6a6b;font-weight:600">FountainFinances.com</div></div>`, 1200, 630, 'public/images/og-default.png');
await b.close();
