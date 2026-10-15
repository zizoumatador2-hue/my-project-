// Renders PNG brand assets (logo, apple-touch-icon, default Open Graph image) from inline HTML.
//   node scripts/brand-assets.mjs
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const mark = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8');
const font = `@font-face{font-family:M;src:url(data:font/woff2;base64,${readFileSync(new URL('../public/fonts/manrope-latin-var.woff2', import.meta.url)).toString('base64')}) format('woff2');font-weight:200 800}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();

async function shot(file, w, h, html) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<style>${font}*{margin:0}body{width:${w}px;height:${h}px;font-family:M}</style>${html}`);
  // eslint-disable-next-line no-undef -- runs in the browser
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: new URL(`../public/${file}`, import.meta.url).pathname });
}

await shot('logo.png', 512, 512, `<div style="width:512px;height:512px">${mark.replace('<svg ', '<svg width="512" height="512" ')}</div>`);
await shot('apple-touch-icon.png', 180, 180, `<div style="width:180px;height:180px">${mark.replace('<svg ', '<svg width="180" height="180" ')}</div>`);
await shot('og-default.png', 1200, 630, `
  <div style="width:1200px;height:630px;background:linear-gradient(160deg,#0b2140,#0f2a4a 55%,#14375f);color:#fff;display:flex;flex-direction:column;justify-content:center;padding:80px;box-sizing:border-box">
    <div style="display:flex;align-items:center;gap:22px">${mark.replace('<svg ', '<svg width="96" height="96" ')}<span style="font-size:64px;font-weight:800;letter-spacing:-1px">Bama<span style="color:#ff7a4d">Motors</span></span></div>
    <div style="font-size:54px;font-weight:800;line-height:1.15;margin-top:40px;max-width:980px">Used cars for sale in Alabama from local dealers</div>
    <div style="font-size:28px;color:#c3d2e6;margin-top:24px">Birmingham · Huntsville · Mobile · Montgomery · Tuscaloosa · and more</div>
  </div>`);
await browser.close();
console.log('brand assets written to public/');
