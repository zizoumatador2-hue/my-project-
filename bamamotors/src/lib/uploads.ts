import { MAX_IMAGE_BYTES, sniffImage } from './security';
import { randomToken } from './crypto';

export type UploadResult = { ok: true; key: string } | { ok: false; error: string };

/** Validates an uploaded image by magic bytes + size and stores it in R2 under a random key. */
export async function storeImage(bucket: R2Bucket, file: FormDataEntryValue | null, prefix: string, suffix: string): Promise<UploadResult> {
  if (!file || typeof file === 'string') return { ok: false, error: 'No image received.' };
  if (file.size === 0) return { ok: false, error: 'The image is empty.' };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: 'Images must be 8 MB or smaller.' };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return { ok: false, error: 'Only JPEG, PNG or WebP images are allowed.' };
  const key = `${prefix}/${randomToken(12)}-${suffix}.${kind.ext}`;
  await bucket.put(key, bytes, { httpMetadata: { contentType: kind.type, cacheControl: 'public, max-age=31536000, immutable' } });
  return { ok: true, key };
}

export async function deleteImages(bucket: R2Bucket, keys: (string | null | undefined)[]): Promise<void> {
  const unique = [...new Set(keys.filter((k): k is string => !!k))];
  if (unique.length) await bucket.delete(unique);
}
