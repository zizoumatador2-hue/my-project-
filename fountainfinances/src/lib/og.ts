import photos from '@/data/photos.json';

/**
 * Social/preview image for a page: the first photo slot that exists, rendered at 1200×630 JPEG
 * by scripts/postbuild.mjs. Returns undefined so callers fall back to the site-wide image.
 */
export const ogImage = (...slots: (string | undefined)[]) => {
  const slot = slots.find((s) => !!s && s in photos);
  return slot ? `/images/og/${slot}.jpg` : undefined;
};
