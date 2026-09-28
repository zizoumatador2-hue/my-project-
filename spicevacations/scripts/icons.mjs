// Generates favicons, app icons, the web manifest and downloadable brand SVGs from the master mark.
// Run once after changing the logo: `npm run icons` (outputs are committed in /public).
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const pub = new URL('../public/', import.meta.url);
mkdirSync(new URL('icons/', pub), { recursive: true });
mkdirSync(new URL('brand/', pub), { recursive: true });

const GRAD = `<linearGradient id="lg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#FF5A36"/><stop offset="1" stop-color="#FFB627"/></linearGradient>`;
const mark = (horizon = '#0B1F3A', chili = 'url(#lg)', sun = '#FFB627', stem = '#14B8A6') =>
  `<circle cx="35" cy="44" r="11" fill="${sun}" clip-path="url(#sc)"/><path d="M8 44A24 24 0 0 1 56 44A19.5 19.5 0 0 0 17 44Z" fill="${chili}"/><path d="M12.5 44.5c0 4.8-2.4 7.8-7 9" fill="none" stroke="${stem}" stroke-width="3.6" stroke-linecap="round"/><path d="M20 50.5h32M27 57h18" fill="none" stroke="${horizon}" stroke-width="3.6" stroke-linecap="round"/>`;
const clip = `<clipPath id="sc"><rect width="64" height="44.5"/></clipPath>`;

// App icon: navy rounded tile with the mark (cream horizon) — legible at 16px.
const appIcon = (pad = 6, radius = 14) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs>${GRAD}${clip}</defs><rect width="64" height="64" rx="${radius}" fill="#0B1F3A"/><g transform="translate(${pad / 2} ${pad / 2 - 3}) scale(${(64 - pad) / 64})">${mark('#FFF8F0')}</g></svg>`;

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs>${GRAD}${clip}</defs><rect width="64" height="64" rx="14" fill="#0B1F3A"/><g transform="translate(3 0) scale(.9)">${mark('#FFF8F0')}</g></svg>`;
writeFileSync(new URL('favicon.svg', pub), favicon);

const png = (svg, size) => sharp(Buffer.from(svg), { density: 600 }).resize(size, size).png().toBuffer();
const sizes = { 'icon-192.png': 192, 'icon-512.png': 512, 'apple-touch-icon.png': 180, 'favicon-32.png': 32, 'favicon-16.png': 16 };
for (const [name, size] of Object.entries(sizes)) writeFileSync(new URL(`icons/${name}`, pub), await png(size >= 180 ? appIcon(10, size === 180 ? 0 : 14) : favicon, size));
// Maskable icon: extra safe-zone padding and a full-bleed background.
writeFileSync(new URL('icons/icon-maskable-512.png', pub), await png(appIcon(22, 0), 512));

// favicon.ico containing a 32px PNG (supported by all modern browsers).
const ico32 = await png(favicon, 32);
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header.writeUInt8(32, 6);
header.writeUInt8(32, 7);
header.writeUInt8(0, 8);
header.writeUInt8(0, 9);
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(ico32.length, 14);
header.writeUInt32LE(22, 18);
writeFileSync(new URL('favicon.ico', pub), Buffer.concat([header, ico32]));

writeFileSync(
  new URL('site.webmanifest', pub),
  JSON.stringify(
    {
      name: 'SpiceVacations.com',
      short_name: 'SpiceVacations',
      description: 'Discover your next escape: romantic getaways, resorts and beach vacations for couples.',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#FFF8F0',
      theme_color: '#0B1F3A',
      lang: 'en-US',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2,
  ),
);

// Downloadable brand SVGs.
const word = (fill = '#0B1F3A', accent = '#B8321A') =>
  `<text x="78" y="45" font-family="Fraunces, Georgia, serif" font-weight="700" font-size="38" fill="${fill}" letter-spacing="-0.5">Spice<tspan fill="${accent}">Vacations</tspan><tspan font-family="Inter, Arial, sans-serif" font-weight="500" font-size="20" fill-opacity=".75">.com</tspan></text>`;
writeFileSync(new URL('brand/logo-horizontal.svg', pub), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 64"><defs>${GRAD}${clip}</defs>${mark()}${word()}</svg>`);
writeFileSync(new URL('brand/logo-white.svg', pub), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 64"><defs>${clip}</defs>${mark('#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF')}${word('#FFFFFF', '#FFFFFF')}</svg>`);
writeFileSync(new URL('brand/logo-navy.svg', pub), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 64"><defs>${clip}</defs>${mark('#0B1F3A', '#0B1F3A', '#0B1F3A', '#0B1F3A')}${word('#0B1F3A', '#0B1F3A')}</svg>`);
writeFileSync(new URL('brand/logo-icon.svg', pub), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs>${GRAD}${clip}</defs>${mark()}</svg>`);
writeFileSync(
  new URL('brand/logo-stacked.svg', pub),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 150"><defs>${GRAD}${clip}</defs><g transform="translate(118 4) scale(1)">${mark()}</g><text x="150" y="112" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="700" font-size="36" fill="#0B1F3A">Spice<tspan fill="#B8321A">Vacations</tspan></text><text x="150" y="138" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="16" fill="#0B1F3A" fill-opacity=".7">.com</text></svg>`,
);
writeFileSync(
  new URL('brand/og-template.svg', pub),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"><defs>${GRAD}${clip}<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B1F3A"/><stop offset="1" stop-color="#1C3765"/></linearGradient></defs><rect width="1200" height="630" fill="url(#bg)"/><circle cx="1040" cy="120" r="260" fill="#FFB627" opacity=".18"/><g transform="translate(72 64) scale(1.1)">${mark('#FFF8F0')}</g><text x="160" y="118" font-family="Fraunces, Georgia, serif" font-weight="700" font-size="40" fill="#FFF8F0">Spice<tspan fill="#FFB627">Vacations</tspan></text><text x="72" y="330" font-family="Inter, Arial, sans-serif" font-weight="700" font-size="26" letter-spacing="3" fill="#FFB627">KICKER</text><text x="72" y="410" font-family="Fraunces, Georgia, serif" font-weight="700" font-size="64" fill="#FFFFFF">Page title goes here</text><rect x="72" y="560" width="120" height="6" rx="3" fill="url(#lg)"/></svg>`,
);
console.log('icons: done');
