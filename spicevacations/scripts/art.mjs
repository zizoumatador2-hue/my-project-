// Generates the brand's illustrated scene library (public/art/<scene>-<palette>.svg).
// These are original, royalty-free artworks used whenever an entry has no licensed photo,
// so every page has fast, crisp, on-brand imagery with zero third-party requests.
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = new URL('../public/art/', import.meta.url);
mkdirSync(OUT, { recursive: true });

export const PALETTES = {
  coral: { sky: ['#FFB199', '#FF7A59', '#FFD08A'], sun: '#FFF3D6', sea: ['#1A6E86', '#0B1F3A'], land: '#0E2A4A', accent: '#FF5A36', haze: '#FFE2C7' },
  gold: { sky: ['#FFE3A3', '#FFB627', '#FF8A5B'], sun: '#FFF8E6', sea: ['#1B8A8C', '#0B3A4A'], land: '#12324F', accent: '#FFB627', haze: '#FFF1CF' },
  teal: { sky: ['#BFF3EC', '#6ED7C9', '#FFE3B8'], sun: '#FFFBEF', sea: ['#14B8A6', '#0B5566'], land: '#0B3A4A', accent: '#14B8A6', haze: '#E4FBF7' },
  dusk: { sky: ['#6B4C9A', '#E0668A', '#FFB67A'], sun: '#FFE9C9', sea: ['#2B3F7A', '#0B1F3A'], land: '#1B1E44', accent: '#FF5A36', haze: '#F7C7C0' },
  night: { sky: ['#0B1F3A', '#1C3765', '#3F4F8F'], sun: '#FFF1C2', sea: ['#132C55', '#070F1F'], land: '#050B18', accent: '#FFB627', haze: '#8FA3D9' },
};

const W = 1600;
const H = 1000;

const defs = (p, id) => `<defs>
<linearGradient id="s${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset=".55" stop-color="${p.sky[1]}"/><stop offset="1" stop-color="${p.sky[2]}"/></linearGradient>
<linearGradient id="w${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sea[0]}"/><stop offset="1" stop-color="${p.sea[1]}"/></linearGradient>
<radialGradient id="g${id}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${p.sun}" stop-opacity=".95"/><stop offset=".45" stop-color="${p.sun}" stop-opacity=".35"/><stop offset="1" stop-color="${p.sun}" stop-opacity="0"/></radialGradient>
</defs>`;

const sky = (id) => `<rect width="${W}" height="${H}" fill="url(#s${id})"/>`;
const sun = (p, id, cx = 1080, cy = 560, r = 120) =>
  `<circle cx="${cx}" cy="${cy}" r="${r * 3}" fill="url(#g${id})"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${p.sun}"/>`;
const sea = (id, y = 640) =>
  `<rect y="${y}" width="${W}" height="${H - y}" fill="url(#w${id})"/>` +
  [0, 1, 2, 3, 4]
    .map((i) => `<path d="M0 ${y + 40 + i * 55} q200 -14 400 0 t400 0 t400 0 t400 0" fill="none" stroke="#fff" stroke-opacity="${0.18 - i * 0.03}" stroke-width="${4 - i * 0.5}"/>`)
    .join('');
const reflection = (p, x = 1080, y = 640) =>
  [0, 1, 2, 3, 4, 5].map((i) => `<rect x="${x - 110 + i * 12}" y="${y + 18 + i * 34}" width="${220 - i * 24}" height="6" rx="3" fill="${p.sun}" opacity="${0.55 - i * 0.07}"/>`).join('');
const clouds = (p) =>
  `<g fill="${p.haze}" opacity=".55"><ellipse cx="300" cy="220" rx="170" ry="34"/><ellipse cx="390" cy="200" rx="110" ry="30"/><ellipse cx="1320" cy="160" rx="150" ry="26"/><ellipse cx="1240" cy="180" rx="120" ry="24"/></g>`;
const palm = (x, y, s, color, flip = 1) => `<g transform="translate(${x} ${y}) scale(${s * flip} ${s})" fill="${color}">
<path d="M0 0 C 10 -120 30 -260 70 -380 L 84 -376 C 48 -258 26 -122 18 0 Z"/>
<path d="M76 -380 C 20 -420 -60 -410 -120 -360 C -60 -380 10 -380 76 -372 Z"/>
<path d="M76 -380 C 40 -450 -20 -480 -90 -470 C -30 -450 30 -420 72 -372 Z"/>
<path d="M78 -380 C 130 -440 210 -450 270 -410 C 210 -420 140 -400 82 -372 Z"/>
<path d="M78 -380 C 150 -380 220 -340 250 -280 C 200 -330 140 -350 80 -370 Z"/>
<path d="M76 -380 C 30 -340 0 -280 -10 -220 C 20 -280 50 -330 80 -370 Z"/>
</g>`;
const hills = (color, y, amp = 80, opacity = 1) =>
  `<path d="M0 ${y} C 200 ${y - amp} 400 ${y - amp * 0.4} 600 ${y - amp * 0.9} S 1000 ${y - amp * 0.2} 1200 ${y - amp} S 1500 ${y - amp * 0.3} 1600 ${y - amp * 0.6} V ${H} H 0 Z" fill="${color}" opacity="${opacity}"/>`;

const scenes = {
  beach: (p, id) =>
    sky(id) + clouds(p) + sun(p, id, 1050, 600, 110) + sea(id, 640) + reflection(p, 1050, 640) +
    `<path d="M0 820 C 300 780 700 800 1000 840 S 1450 900 1600 880 V 1000 H 0 Z" fill="#F6D7AE"/><path d="M0 840 C 320 800 720 820 1020 860" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="6"/>` +
    palm(170, 900, 1.25, p.land) + palm(330, 930, 0.9, p.land, -1),
  sunset: (p, id) =>
    sky(id) + sun(p, id, 800, 640, 160) + sea(id, 660) + reflection(p, 800, 660) + clouds(p) +
    `<path d="M1180 660 l60 -24 l14 24 z M1238 636 v-70 l40 64 z" fill="${p.land}" opacity=".85"/>`,
  tropical: (p, id) =>
    sky(id) + sun(p, id, 1200, 420, 90) + clouds(p) + sea(id, 620) +
    `<path d="M600 640 C 700 540 820 500 980 520 C 1100 540 1180 600 1240 640 Z" fill="${p.land}" opacity=".75"/>` +
    `<path d="M0 860 C 400 820 800 860 1600 830 V1000 H0Z" fill="#F4D2A4"/>` +
    palm(1320, 880, 1.2, p.land, -1) + palm(1460, 900, 0.95, p.land) + palm(120, 900, 1, p.land),
  overwater: (p, id) =>
    sky(id) + sun(p, id, 420, 520, 100) + sea(id, 600) + reflection(p, 420, 600) +
    `<g fill="${p.land}">` +
    [0, 1, 2, 3].map((i) => {
      const x = 760 + i * 190; const y = 640 + i * 18;
      return `<path d="M${x} ${y} l80 -60 l80 60 z"/><rect x="${x + 16}" y="${y}" width="128" height="46"/><rect x="${x + 24}" y="${y + 46}" width="6" height="70"/><rect x="${x + 130}" y="${y + 46}" width="6" height="70"/>`;
    }).join('') +
    `<rect x="700" y="700" width="820" height="10"/></g>`,
  mountains: (p, id) =>
    sky(id) + sun(p, id, 1100, 380, 90) + clouds(p) +
    `<path d="M0 700 L 300 360 L 520 620 L 780 300 L 1060 640 L 1280 420 L 1600 700 V 1000 H 0 Z" fill="${p.land}" opacity=".55"/>` +
    `<path d="M780 300 l-70 90 l40 -10 l30 30 l35 -40 l35 20 z" fill="#fff" opacity=".85"/>` +
    hills(p.land, 820, 120, 0.9) + hills(p.sea[1], 920, 60, 1),
  lake: (p, id) =>
    sky(id) + sun(p, id, 520, 470, 80) +
    `<path d="M0 620 L 260 400 L 460 560 L 720 360 L 1000 600 L 1250 430 L 1600 620 Z" fill="${p.land}" opacity=".7"/>` +
    sea(id, 620) + reflection(p, 520, 620) +
    `<g fill="${p.land}">${[60, 140, 1420, 1500].map((x, i) => `<path d="M${x} ${900 - (i % 2) * 30} l40 -220 l40 220 z"/>`).join('')}</g>`,
  city: (p, id) =>
    sky(id) + sun(p, id, 1260, 360, 70) +
    `<g fill="${p.land}">` +
    [[80, 380], [200, 520], [300, 300], [420, 460], [520, 240], [640, 420], [760, 330], [880, 500], [980, 280], [1100, 440], [1220, 360], [1340, 480], [1460, 300]]
      .map(([x, h]) => `<rect x="${x}" y="${800 - h}" width="104" height="${h}"/>`).join('') + `</g>` +
    `<g fill="${p.sun}" opacity=".7">` +
    Array.from({ length: 70 }, (_, i) => `<rect x="${100 + ((i * 97) % 1400)}" y="${520 + ((i * 53) % 260)}" width="10" height="14"/>`).join('') + `</g>` +
    sea(id, 800),
  desert: (p, id) =>
    sky(id) + sun(p, id, 800, 520, 130) +
    `<path d="M0 700 L 180 560 L 320 560 L 420 700 Z M1150 700 L 1260 520 L 1420 520 L 1540 700 Z" fill="${p.land}" opacity=".6"/>` +
    `<g fill="${p.land}">${[[560, 300], [650, 380], [740, 260], [900, 340], [990, 240], [1070, 320]].map(([x, h]) => `<rect x="${x}" y="${700 - h}" width="70" height="${h}" rx="6"/>`).join('')}</g>` +
    `<rect y="700" width="${W}" height="300" fill="#C9744A"/><path d="M0 760 C 400 730 1200 790 1600 750 V1000 H0Z" fill="#A95A3A"/>`,
  cliffs: (p, id) =>
    sky(id) + sun(p, id, 1180, 540, 100) + sea(id, 640) + reflection(p, 1180, 640) +
    `<path d="M0 380 C 120 360 260 400 360 460 L 420 640 L 520 1000 H 0 Z" fill="${p.land}"/><path d="M360 460 L 470 700 L 520 1000 H 420 L 380 640 Z" fill="${p.sea[1]}" opacity=".5"/>` +
    `<path d="M1600 560 C 1520 560 1460 600 1440 640 L 1600 640 Z" fill="${p.land}" opacity=".8"/>`,
  vineyard: (p, id) =>
    sky(id) + sun(p, id, 1150, 420, 100) + clouds(p) + hills(p.land, 620, 90, 0.5) +
    `<rect y="640" width="${W}" height="360" fill="#6E8B3D"/>` +
    Array.from({ length: 9 }, (_, i) => `<path d="M${800 - 900 + i * 200} 1000 L 800 640" stroke="#4E6A2A" stroke-width="${10 - i % 3}"/>`).join('') +
    `<path d="M1260 640 v-60 h40 l-20 -30 l-20 30" fill="${p.land}"/>`,
  cruise: (p, id) =>
    sky(id) + clouds(p) + sun(p, id, 360, 470, 90) + sea(id, 640) +
    `<g transform="translate(560 470)"><path d="M0 170 L 900 170 L 820 260 L 60 260 Z" fill="#F4F6FA"/><rect x="120" y="100" width="640" height="70" rx="10" fill="#FFFFFF"/><rect x="220" y="44" width="440" height="60" rx="10" fill="#F4F6FA"/><rect x="560" y="-10" width="70" height="60" rx="8" fill="${p.accent}"/>` +
    Array.from({ length: 14 }, (_, i) => `<rect x="${150 + i * 42}" y="122" width="24" height="18" rx="4" fill="${p.sea[1]}" opacity=".7"/>`).join('') +
    `<rect x="0" y="232" width="880" height="10" fill="${p.sea[1]}" opacity=".6"/></g>`,
  pool: (p, id) =>
    sky(id) + sun(p, id, 1240, 380, 90) + sea(id, 560) +
    `<rect y="600" width="${W}" height="400" fill="#F3E4CF"/><path d="M180 700 H 1420 L 1500 960 H 100 Z" fill="${p.accent === '#FFB627' ? '#3CC7C0' : '#2FC1C9'}"/>` +
    Array.from({ length: 5 }, (_, i) => `<path d="M${260 + i * 240} ${760 + (i % 2) * 60} q60 -16 120 0" stroke="#fff" stroke-opacity=".6" stroke-width="6" fill="none"/>`).join('') +
    palm(80, 700, 0.9, p.land) + palm(1520, 720, 1, p.land, -1),
  volcano: (p, id) =>
    sky(id) + sun(p, id, 420, 380, 80) + clouds(p) +
    `<path d="M300 700 L 700 360 L 780 380 L 860 350 L 1300 700 Z" fill="${p.land}" opacity=".8"/><path d="M700 360 L 780 380 L 860 350 L 820 420 L 740 420 Z" fill="${p.accent}" opacity=".35"/>` +
    sea(id, 700) + `<path d="M0 860 C 300 820 600 850 900 880 S 1400 900 1600 860 V1000 H0Z" fill="#263238"/>` + palm(1400, 900, 1, p.land, -1),
  harbor: (p, id) =>
    sky(id) + sun(p, id, 1160, 420, 90) + clouds(p) +
    `<g fill="${p.land}"><path d="M80 640 h160 v-120 l-80 -60 l-80 60z"/><path d="M260 640 h120 v-160 l-60 -40 l-60 40z"/><rect x="1300" y="380" width="30" height="260"/><path d="M1290 380 h50 l-25 -40z"/></g>` +
    sea(id, 640) +
    `<g transform="translate(600 600)" fill="${p.land}"><path d="M0 40 h240 l-30 40 h-180 z"/><path d="M110 40 v-160 l90 150 z" fill="#fff"/><path d="M104 40 v-130 l-70 120 z" fill="#fff" opacity=".85"/></g>`,
};

let n = 0;
for (const [scene, draw] of Object.entries(scenes)) {
  for (const [pal, p] of Object.entries(PALETTES)) {
    const id = `${n++}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${defs(p, id)}${draw(p, id)}</svg>`;
    writeFileSync(new URL(`${scene}-${pal}.svg`, OUT), svg);
  }
}
console.log(`art: wrote ${n} scenes`);
