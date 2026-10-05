import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Licensed stock photos (Pexels or Pixabay) fetched at build time (scripts/fetch-photos.mjs). Empty → illustrations. */
export interface Photo {
  id: number | string;
  base: string;
  widths: number[];
  alt: string;
  avg: string;
  photographer: string;
  photographerUrl: string;
  url: string;
  representative?: boolean;
  /** Library the photo came from ("Pexels" or "Pixabay"); older manifests omit it. */
  source?: string;
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
/** URL of the closest generated width that does not exceed `w` (falls back to the smallest). */
export const srcOf = (p: Photo, w = Infinity) => {
  const fit = [...p.widths].sort((a, b) => a - b).filter((x) => x <= w);
  return `${p.base}-${fit.at(-1) ?? Math.min(...p.widths)}.webp`;
};
export const srcsetOf = (p: Photo) => p.widths.map((w) => `${p.base}-${w}.webp ${w}w`).join(', ');
