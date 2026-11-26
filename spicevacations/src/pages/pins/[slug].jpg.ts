import type { APIRoute, GetStaticPaths } from 'astro';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { lookup } from '../../lib/content';
import { photoFor } from '../../lib/photos';
import { pinTargets, type PinTarget } from '../../lib/pins';

/** 1000×1500 Pinterest images (2:3): the page's photo on top, its title on a brand panel below. */
export const getStaticPaths = (async () => {
  const L = await lookup();
  return pinTargets(L).map((t) => ({ params: { slug: t.slug }, props: t }));
}) satisfies GetStaticPaths;

const W = 1000;
const H = 1500;
const PHOTO_H = 1000;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function wrap(text: string, max: number, maxLines: number) {
  const lines: string[] = [];
  let line = '';
  for (const w of text.split(' ')) {
    if ((line + ' ' + w).trim().length > max && line) {
      lines.push(line.trim());
      line = w;
    } else line += ' ' + w;
  }
  if (line.trim()) lines.push(line.trim());
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/[\s,:;]*\S*$/, '…');
  }
  return lines;
}

async function photoBuffer(t: PinTarget) {
  const p = photoFor(t.pkey);
  if (p) {
    const file = join(process.cwd(), 'public', `${p.base}-${Math.max(...p.widths)}.webp`);
    if (existsSync(file)) return readFile(file);
  }
  return readFile(join(process.cwd(), 'public/art', `${t.scene}-${t.palette}.svg`));
}

export const GET: APIRoute = async ({ props }) => {
  const t = props as PinTarget;
  const photo = await sharp(await photoBuffer(t)).resize(W, PHOTO_H, { fit: 'cover', position: 'attention' }).toBuffer();
  // DejaVu Serif Bold is ~0.62em per character: 15 chars at 84px (or 18 at 68px) fit the 872px text box.
  let lines = wrap(t.pinTitle, 15, 3);
  let size = 84;
  if (lines.at(-1)?.endsWith('…')) {
    lines = wrap(t.pinTitle, 18, 4);
    size = 68;
  }
  const lh = size * 1.14;
  const top = PHOTO_H + 50;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1F3A" stop-opacity="0"/><stop offset="1" stop-color="#0B1F3A" stop-opacity="1"/></linearGradient>
      <linearGradient id="lg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#FF5A36"/><stop offset="1" stop-color="#FFB627"/></linearGradient>
    </defs>
    <rect y="${PHOTO_H - 260}" width="${W}" height="260" fill="url(#fade)"/>
    <rect y="${PHOTO_H}" width="${W}" height="${H - PHOTO_H}" fill="#0B1F3A"/>
    <rect x="64" y="${PHOTO_H - 92}" rx="22" width="${Math.min(860, 30 + t.kicker.length * 17)}" height="44" fill="#FF5A36"/>
    <text x="84" y="${PHOTO_H - 62}" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700" font-size="22" letter-spacing="2" fill="#FFFFFF">${esc(t.kicker.toUpperCase())}</text>
    ${lines.map((l, i) => `<text x="64" y="${top + size + i * lh}" font-family="DejaVu Serif, Georgia, serif" font-weight="700" font-size="${size}" fill="#FFFFFF">${esc(l)}</text>`).join('')}
    <rect x="64" y="${H - 118}" width="110" height="6" rx="3" fill="url(#lg)"/>
    <text x="64" y="${H - 62}" font-family="DejaVu Serif, Georgia, serif" font-weight="700" font-size="34" fill="#FFF8F0">Spice<tspan fill="#FFB627">Vacations</tspan><tspan font-size="22" fill-opacity=".8">.com</tspan></text>
    ${t.ai ? `<text x="${W - 64}" y="${H - 62}" text-anchor="end" font-family="DejaVu Sans, Arial, sans-serif" font-size="18" fill="#FFF8F0" fill-opacity=".6">AI-generated image</text>` : ''}
  </svg>`;
  const jpg = await sharp({ create: { width: W, height: H, channels: 3, background: '#0B1F3A' } })
    .composite([{ input: photo, top: 0, left: 0 }, { input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  return new Response(new Uint8Array(jpg), { headers: { 'Content-Type': 'image/jpeg' } });
};
