import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Licensed Pexels photos fetched at build time (scripts/fetch-photos.mjs). Empty → illustrations. */
export interface Photo {
  id: number;
  base: string;
  widths: number[];
  alt: string;
  avg: string;
  photographer: string;
  photographerUrl: string;
  url: string;
  representative?: boolean;
}

let cache: Record<string, Photo> | undefined;
export function photos(): Record<string, Photo> {
  if (cache) return cache;
  // Resolved from the project root: this module is bundled into dist/ during the build.
  const p = join(process.cwd(), 'src/data/photos.json');
  try {
    cache = existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as Record<string, Photo>) : {};
  } catch {
    cache = {};
  }
  return cache;
}

export const photoFor = (key?: string): Photo | undefined => (key ? photos()[key] : undefined);
export const srcOf = (p: Photo, w = 1600) => `${p.base}-${w}.webp`;
export const srcsetOf = (p: Photo) => p.widths.map((w) => `${p.base}-${w}.webp ${w}w`).join(', ');
