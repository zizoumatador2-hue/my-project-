import type { ImageMetadata } from 'astro';

const art = import.meta.glob<{ default: ImageMetadata }>('/src/assets/articles/*.{jpg,jpeg,png,webp}', { eager: true });
const photos = import.meta.glob<{ default: ImageMetadata }>('/src/assets/photos/*.{jpg,jpeg,png,webp}', { eager: true });

const byName = (rec: Record<string, { default: ImageMetadata }>, slug: string) => {
  const key = Object.keys(rec).find((k) => k.split('/').pop()!.replace(/\.[a-z]+$/, '') === slug);
  return key ? rec[key].default : undefined;
};

/** Prefer a licensed photo (from `npm run images:pexels`); fall back to the original illustration. */
export function imageFor(slug: string): { image: ImageMetadata; photo: boolean } | undefined {
  const p = byName(photos, slug);
  if (p) return { image: p, photo: true };
  const a = byName(art, slug);
  return a ? { image: a, photo: false } : undefined;
}
