// Generates the original (non-stock) illustrations used as article covers, plus logo/favicon/OG image.
// Output: src/assets/articles/<slug>.jpg (1600x900), public/logo.png, public/favicon.svg, public/og-default.jpg
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';

const W = 1600, H = 900;
const items = [
  ['how-to-improve-aim-in-fps-games', 'crosshair', 200],
  ['how-to-get-better-at-gaming', 'chart', 160],
  ['gaming-tips-for-beginners', 'controller', 215],
  ['common-mistakes-new-players-make', 'controller', 28],
  ['how-to-build-a-gaming-warm-up-routine', 'crosshair', 265],
  ['gaming-strategies-that-work-in-any-game', 'chess', 255],
  ['how-to-review-your-gameplay', 'monitor', 190],
  ['best-fps-settings-for-better-performance', 'sliders', 175],
  ['best-sensitivity-settings-for-gaming', 'mouse', 235],
  ['best-controller-settings-for-competitive-gaming', 'controller', 245],
  ['best-gaming-monitor-settings', 'monitor', 215],
  ['how-to-increase-fps-on-pc', 'gauge', 150],
  ['how-to-reduce-input-lag-on-pc', 'gauge', 225],
  ['how-to-optimize-windows-for-gaming', 'chip', 205],
  ['best-gaming-mouse-for-fps', 'mouse', 160],
  ['best-gaming-headset-guide', 'headset', 270],
  ['how-to-set-up-a-gaming-desk', 'monitor', 30],
  ['pc-vs-console-gaming', 'versus', 220],
  ['controller-vs-mouse-and-keyboard', 'versus', 180],
  ['how-to-fix-game-lag', 'wifi', 195],
  ['fix-game-crashes-and-stuttering', 'wrench', 35],
  ['beginners-guide-to-valorant', 'diamond', 350],
  ['beginners-guide-to-elden-ring', 'ring', 40],
  ['counter-strike-2-practice-guide', 'crosshair', 45],
];

const hsl = (h, s, l, a = 1) => `hsla(${h % 360},${s}%,${l}%,${a})`;
function rng(seed) { let s = 0; for (const c of seed) s = (s * 31 + c.charCodeAt(0)) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

const motifs = {
  crosshair: (c) => `<g fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"><circle cx="0" cy="0" r="150"/><circle cx="0" cy="0" r="70" opacity=".6"/><path d="M0-210V-100M0 100V210M-210 0H-100M100 0H210"/></g><circle r="9" fill="${c}"/>`,
  controller: (c) => `<g fill="none" stroke="${c}" stroke-width="6" stroke-linejoin="round"><path d="M-190 -30C-190 -90 -150 -110 -100 -110H100C150 -110 190 -90 190 -30L215 90C222 140 160 160 130 120L90 60H-90L-130 120C-160 160 -222 140 -215 90Z"/><path d="M-120 -50V10M-150 -20H-90" stroke-width="9"/><circle cx="105" cy="-45" r="14"/><circle cx="145" cy="-15" r="14"/><circle cx="-30" cy="25" r="22" opacity=".6"/><circle cx="50" cy="25" r="22" opacity=".6"/></g>`,
  monitor: (c) => `<g fill="none" stroke="${c}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"><rect x="-250" y="-160" width="500" height="290" rx="18"/><path d="M-60 130L-90 190H90L60 130M-130 190H130"/><path d="M-200 60L-120-10L-50 30L40 -80L110 -30L200 -110" stroke-width="7"/></g>`,
  mouse: (c) => `<g fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"><path d="M-95 -20C-95 -130 -50 -190 0 -190S95 -130 95 -20V80C95 160 50 200 0 200S-95 160 -95 80Z"/><path d="M0 -190V-60M-95 -60H95"/><rect x="-12" y="-130" width="24" height="46" rx="12"/></g>`,
  headset: (c) => `<g fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"><path d="M-170 40V-20C-170 -130 -95 -190 0 -190S170 -130 170 -20V40"/><rect x="-215" y="20" width="85" height="150" rx="34"/><rect x="130" y="20" width="85" height="150" rx="34"/><path d="M-172 170C-172 230 -100 250 -40 240"/></g>`,
  gauge: (c) => `<g fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"><path d="M-200 100A200 200 0 1 1 200 100"/><path d="M-150 60L-130 48M-110 -30L-92 -42M0 -130V-110M110 -30L92 -42M150 60L130 48" stroke-width="5"/><path d="M0 70L95 -75" stroke-width="9"/><circle cx="0" cy="70" r="16"/></g>`,
  sliders: (c) => `<g fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"><path d="M-220 -110H220M-220 0H220M-220 110H220"/></g><g fill="#0b0f17" stroke="${c}" stroke-width="6"><circle cx="-90" cy="-110" r="26"/><circle cx="90" cy="0" r="26"/><circle cx="-20" cy="110" r="26"/></g>`,
  chip: (c) => `<g fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"><rect x="-120" y="-120" width="240" height="240" rx="26"/><rect x="-60" y="-60" width="120" height="120" rx="14" opacity=".6"/><path d="M-70-120V-180M0-120V-180M70-120V-180M-70 120V180M0 120V180M70 120V180M-120-70H-180M-120 0H-180M-120 70H-180M120-70H180M120 0H180M120 70H180"/></g>`,
  versus: (c, c2) => `<g fill="none" stroke-width="6" stroke-linecap="round"><rect x="-290" y="-110" width="210" height="220" rx="24" stroke="${c}"/><rect x="80" y="-110" width="210" height="220" rx="24" stroke="${c2}"/><path d="M-30 -50L30 50M30 -50L-30 50" stroke="${c}"/></g>`,
  wifi: (c) => `<g fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"><path d="M-190 -40A270 270 0 0 1 190 -40"/><path d="M-130 20A180 180 0 0 1 130 20"/><path d="M-70 80A92 92 0 0 1 70 80"/></g><circle cy="140" r="14" fill="${c}"/>`,
  wrench: (c) => `<g fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M-150 160L20 -10"/><path d="M60 -170A90 90 0 0 0 -30 -80A90 90 0 0 0 40 20L90 -30A28 28 0 0 1 100 -80L150 -130A90 90 0 0 0 60 -170Z" transform="translate(30 -10)"/></g>`,
  chess: (c) => `<g fill="none" stroke="${c}" stroke-width="5">${[...Array(4)].map((_, r) => [...Array(4)].map((_, q) => `<rect x="${-160 + q * 80}" y="${-160 + r * 80}" width="80" height="80" ${(r + q) % 2 ? `fill="${c}" fill-opacity=".18"` : ''}/>`).join('')).join('')}</g><path d="M-120 120L-40 -40L40 40L120 -120" stroke="${c}" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><g fill="${c}"><circle cx="-120" cy="120" r="12"/><circle cx="-40" cy="-40" r="12"/><circle cx="40" cy="40" r="12"/><circle cx="120" cy="-120" r="12"/></g>`,
  diamond: (c) => `<g fill="none" stroke="${c}" stroke-width="7" stroke-linejoin="round"><path d="M0-210L190 0L0 210L-190 0Z"/><path d="M0-120L110 0L0 120L-110 0Z" opacity=".6"/></g>`,
  ring: (c) => `<g fill="none" stroke="${c}" stroke-width="7"><circle r="200"/><circle r="150" opacity=".55"/><path d="M0-200C-60-100 -60 100 0 200M0-200C60-100 60 100 0 200M-200 0C-100-60 100-60 200 0M-200 0C-100 60 100 60 200 0" opacity=".6"/></g>`,
  chart: (c) => `<g fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M-220 150H220M-220 150V-170"/><path d="M-180 100L-90 20L-10 60L90 -70L190 -150" stroke-width="9"/></g><g fill="${c}"><circle cx="-90" cy="20" r="12"/><circle cx="-10" cy="60" r="12"/><circle cx="90" cy="-70" r="12"/><circle cx="190" cy="-150" r="12"/></g>`,
};

function svgFor(slug, motif, hue) {
  const r = rng(slug);
  const c = hsl(hue, 85, 70), c2 = hsl(hue + 60, 85, 68);
  const stars = [...Array(46)].map(() => `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * H).toFixed(0)}" r="${(r() * 2.2 + 0.6).toFixed(1)}" fill="#fff" opacity="${(r() * 0.35 + 0.08).toFixed(2)}"/>`).join('');
  const m = motifs[motif](c, c2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<radialGradient id="g1" cx="72%" cy="50%" r="65%"><stop offset="0" stop-color="${hsl(hue, 70, 34)}"/><stop offset=".55" stop-color="${hsl(hue + 20, 55, 14)}"/><stop offset="1" stop-color="#090c14"/></radialGradient>
<radialGradient id="g2" cx="10%" cy="100%" r="55%"><stop offset="0" stop-color="${hsl(hue + 60, 70, 30, 0.55)}"/><stop offset="1" stop-color="${hsl(hue + 60, 70, 30, 0)}"/></radialGradient>
<pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0H0V60" fill="none" stroke="#fff" stroke-opacity=".045" stroke-width="1"/></pattern>
<filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#g1)"/><rect width="${W}" height="${H}" fill="url(#g2)"/><rect width="${W}" height="${H}" fill="url(#grid)"/>
${stars}
<circle cx="1120" cy="450" r="330" fill="none" stroke="${c}" stroke-opacity=".12" stroke-width="2"/>
<circle cx="1120" cy="450" r="430" fill="none" stroke="${c}" stroke-opacity=".07" stroke-width="2"/>
<g transform="translate(1120 450) scale(1.25)" filter="url(#glow)">${m}</g>
</svg>`;
}

mkdirSync('src/assets/articles', { recursive: true });
for (const [slug, motif, hue] of items) {
  await sharp(Buffer.from(svgFor(slug, motif, hue))).jpeg({ quality: 82, mozjpeg: true }).toFile(`src/assets/articles/${slug}.jpg`);
}

// Brand assets
const logoSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64"><defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b9bff"/><stop offset="1" stop-color="#4de1c1"/></linearGradient></defs><rect width="64" height="64" rx="15" fill="#0b0f17"/><path d="M14 20h18a14 14 0 0 1 0 28H14z" fill="none" stroke="url(#a)" stroke-width="6" stroke-linejoin="round"/><circle cx="46" cy="32" r="3.5" fill="#ffb454"/></svg>`;
writeFileSync('public/favicon.svg', logoSvg(64));
await sharp(Buffer.from(logoSvg(512))).png().toFile('public/logo.png');
await sharp(Buffer.from(logoSvg(180))).png().toFile('public/apple-touch-icon.png');

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><radialGradient id="g" cx="75%" cy="45%" r="75%"><stop offset="0" stop-color="#2b3566"/><stop offset=".6" stop-color="#101629"/><stop offset="1" stop-color="#090c14"/></radialGradient><pattern id="p" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="#fff" stroke-opacity=".05"/></pattern></defs><rect width="1200" height="630" fill="url(#g)"/><rect width="1200" height="630" fill="url(#p)"/><g transform="translate(90 120) scale(1.5)"><rect width="64" height="64" rx="15" fill="#0b0f17" stroke="#fff" stroke-opacity=".12"/><path d="M14 20h18a14 14 0 0 1 0 28H14z" fill="none" stroke="#8b9bff" stroke-width="6" stroke-linejoin="round"/><circle cx="46" cy="32" r="3.5" fill="#ffb454"/></g><text x="90" y="340" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="92" fill="#f4f6fb">DistritoGamer</text><text x="92" y="410" font-family="Helvetica, Arial, sans-serif" font-size="40" fill="#aab4d4">Play Better. Know More. Game Smarter.</text><text x="92" y="520" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="#7f8ab0">Gaming tips, guides, settings and strategies</text></svg>`;
await sharp(Buffer.from(og)).jpeg({ quality: 86 }).toFile('public/og-default.jpg');
console.log(`Generated ${items.length} article illustrations + brand assets.`);
