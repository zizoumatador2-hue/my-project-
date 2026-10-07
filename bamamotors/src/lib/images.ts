import manifest from '../data/images.json';

/**
 * Licensed photos: Pexels (scripts/fetch-pexels.mjs) or Wikimedia Commons CC0/PD/CC BY(-SA)
 * (scripts/fetch-commons.mjs), written to public/images and src/data/images.json. Always credited.
 * Every helper returns null when an image hasn't been fetched yet, so pages degrade gracefully.
 */
export interface SiteImage {
  src: string; // largest WebP
  srcset: string;
  width: number;
  height: number;
  alt: string;
  author: string;
  sourceUrl: string;
  source: 'Pexels' | 'Wikimedia Commons';
  license?: string;
  licenseUrl?: string;
}

const images = manifest as Record<string, SiteImage>;

export const image = (key: string): SiteImage | null => images[key] ?? null;
export const cityImage = (slug: string) => image(`city-${slug}`) ?? image('city-default');
export const postImage = (slug: string) => image(`post-${slug}`) ?? image('post-default');
export const bodyImage = (slug: string) => image(`body-${slug}`);
export const allImages = () => images;
