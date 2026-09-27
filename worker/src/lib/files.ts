import type { Env } from '../env';
import { b64url, decryptBytes, encryptBytes, hmacB64url, sha256Hex, timingSafeEqual, unb64url } from './crypto';
import { HttpError, now } from './util';

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const SIGNED_URL_TTL_MS = 2 * 60 * 1000; // short-lived by design

export function requireKeys(env: Env) {
  if (!env.DATA_ENCRYPTION_KEY) throw new HttpError(503, 'encryption_unconfigured', 'التشفير غير مهيأ على الخادم.');
  if (!env.SESSION_SECRET) throw new HttpError(503, 'secret_unconfigured', 'مفتاح التوقيع غير مهيأ على الخادم.');
  return { dek: env.DATA_ENCRYPTION_KEY, sig: env.SESSION_SECRET };
}

/** Sniff real content type from magic bytes — never trust the client-declared MIME. */
export function sniffMime(bytes: Uint8Array): string | null {
  const b = bytes;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf';
  return null;
}

export async function readUpload(file: File | string | null | undefined, allowPdf: boolean) {
  if (!file || typeof file === 'string') throw new HttpError(400, 'file_required', 'الملف مطلوب.');
  if (file.size === 0) throw new HttpError(400, 'file_empty', 'الملف فارغ.');
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, 'file_too_large', 'الحد الأقصى لحجم الملف 8 ميغابايت.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(bytes);
  if (!mime || (mime === 'application/pdf' && !allowPdf)) {
    throw new HttpError(415, 'file_type', allowPdf ? 'الصيغ المسموحة: PNG أو JPG أو WEBP أو PDF.' : 'الصيغ المسموحة: PNG أو JPG أو WEBP.');
  }
  return { bytes, mime, size: bytes.length, sha256: await sha256Hex(bytes) };
}

/** Encrypts with a per-object derived key and stores in R2. The plaintext never reaches R2. */
export async function putEncrypted(env: Env, key: string, bytes: Uint8Array, mime: string) {
  const { dek } = requireKeys(env);
  const { ciphertext, iv } = await encryptBytes(dek, `r2:${key}`, bytes);
  await env.EVIDENCE.put(key, ciphertext, { customMetadata: { iv, mime, enc: 'aes-256-gcm/hkdf-v1' } });
}

export async function getDecrypted(env: Env, key: string): Promise<{ body: ArrayBuffer; mime: string } | null> {
  const { dek } = requireKeys(env);
  const obj = await env.EVIDENCE.get(key);
  if (!obj) return null;
  const iv = obj.customMetadata?.iv;
  if (!iv) return null;
  const body = await decryptBytes(dek, `r2:${key}`, await obj.arrayBuffer(), iv);
  return { body, mime: obj.customMetadata?.mime || 'application/octet-stream' };
}

export interface FileGrant { k: string; u: string; c: string; e: number }

/** Mints a short-lived URL bound to one R2 object, one viewer and one authorization context. */
export async function signFileUrl(env: Env, grant: Omit<FileGrant, 'e'>): Promise<string> {
  const { sig } = requireKeys(env);
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ ...grant, e: now() + SIGNED_URL_TTL_MS })));
  const mac = await hmacB64url(sig, `file:${payload}`);
  return `/api/files/${payload}.${mac}`;
}

export async function verifyFileToken(env: Env, token: string): Promise<FileGrant> {
  const { sig } = requireKeys(env);
  const [payload, mac] = token.split('.');
  if (!payload || !mac) throw new HttpError(400, 'bad_token', 'رابط غير صالح.');
  const expected = await hmacB64url(sig, `file:${payload}`);
  if (!timingSafeEqual(mac, expected)) throw new HttpError(403, 'bad_signature', 'رابط غير صالح.');
  const grant = JSON.parse(new TextDecoder().decode(unb64url(payload))) as FileGrant;
  if (grant.e < now()) throw new HttpError(410, 'expired', 'انتهت صلاحية الرابط. أعد فتح الملف.');
  return grant;
}
