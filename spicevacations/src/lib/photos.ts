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
  /** Library the photo came from ("Pexels", "Pixabay" or "AI"); older manifests omit it. */
  source?: string;
  /** True for images generated with AI (scripts/generate-ai-photos.mjs); always labeled on the page. */
  ai?: boolean;
}

function readJson(file: string): Record<string, Photo> {
  const p = join(process.cwd(), 'src/data', file);
  try {
    return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as Record<string, Photo>) : {};
  } catch {
    return {};
  }
}

let cache: Record<string, Photo> | undefined;
export function photos(): Record<string, Photo> {
  if (cache) return cache;
  // Resolved from the project root: this module is bundled into dist/ during the build.
  // Committed AI images take precedence over fetched stock photos for the same page.
  cache = { ...readJson('photos.json'), ...readJson('ai-photos.json') };
  return cache;
}

export const photoFor = (key?: string): Photo | undefined => (key ? photos()[key] : undefined);
/** URL of the closest generated width that does not exceed `w` (falls back to the smallest). */
export const srcOf = (p: Photo, w = Infinity) => {
  const fit = [...p.widths].sort((a, b) => a - b).filter((x) => x <= w);
  return `${p.base}-${fit.at(-1) ?? Math.min(...p.widths)}.webp`;
};
export const srcsetOf = (p: Photo) => p.widths.map((w) => `${p.base}-${w}.webp ${w}w`).join(', ');
