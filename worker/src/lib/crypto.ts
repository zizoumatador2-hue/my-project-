// Web Crypto helpers. No secret or plaintext produced here is ever logged.

const enc = new TextEncoder();
const dec = new TextDecoder();

export function b64(bytes: ArrayBuffer | Uint8Array): string {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
}

export function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function b64url(bytes: ArrayBuffer | Uint8Array): string {
  return b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function unb64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return unb64(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
}

export function hex(bytes: ArrayBuffer | Uint8Array): string {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of u) s += b.toString(16).padStart(2, '0');
  return s;
}

export function randomToken(bytes = 32): string {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256Hex(data: string | ArrayBuffer | Uint8Array): Promise<string> {
  const buf = typeof data === 'string' ? enc.encode(data) : data;
  return hex(await crypto.subtle.digest('SHA-256', buf));
}

/** Constant-time comparison of two strings. */
export function timingSafeEqual(a: string, b: string): boolean {
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  let diff = ab.length ^ bb.length;
  const len = Math.max(ab.length, bb.length);
  for (let i = 0; i < len; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

// ---------- Passwords (PBKDF2-SHA256; 100k is the Workers runtime maximum) ----------
const PBKDF2_ITERATIONS = 100_000;

export async function hashPassword(password: string, saltB64?: string): Promise<{ hash: string; salt: string }> {
  const salt = saltB64 ? unb64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS }, key, 256);
  return { hash: b64(bits), salt: b64(salt) };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const { hash: h } = await hashPassword(password, salt);
  return timingSafeEqual(h, hash);
}

// ---------- HMAC ----------
async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

export async function hmacHex(secret: string, message: string): Promise<string> {
  return hex(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(message)));
}

export async function hmacB64url(secret: string, message: string): Promise<string> {
  return b64url(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(message)));
}

// ---------- AES-256-GCM envelope with per-purpose derived keys ----------
// Master key (DATA_ENCRYPTION_KEY, 32 bytes base64) never touches data directly: a subkey is derived per
// "context" (e.g. `evidence:<id>`, `secret:<deal>`) via HKDF, so a leaked subkey exposes only one object.

async function deriveKey(masterB64: string, context: string): Promise<CryptoKey> {
  const master = unb64(masterB64);
  if (master.length !== 32) throw new Error('DATA_ENCRYPTION_KEY must be 32 bytes (base64)');
  const ikm = await crypto.subtle.importKey('raw', master, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: enc.encode('trusttransfer/v1'), info: enc.encode(context) },
    ikm,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptBytes(masterB64: string, context: string, data: ArrayBuffer | Uint8Array): Promise<{ ciphertext: ArrayBuffer; iv: string }> {
  const key = await deriveKey(masterB64, context);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(context) }, key, data);
  return { ciphertext, iv: b64(iv) };
}

export async function decryptBytes(masterB64: string, context: string, ciphertext: ArrayBuffer | Uint8Array, ivB64: string): Promise<ArrayBuffer> {
  const key = await deriveKey(masterB64, context);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(ivB64), additionalData: enc.encode(context) }, key, ciphertext);
}

export async function encryptText(masterB64: string, context: string, text: string): Promise<{ ciphertext: string; iv: string }> {
  const r = await encryptBytes(masterB64, context, enc.encode(text));
  return { ciphertext: b64(r.ciphertext), iv: r.iv };
}

export async function decryptText(masterB64: string, context: string, ciphertextB64: string, ivB64: string): Promise<string> {
  return dec.decode(await decryptBytes(masterB64, context, unb64(ciphertextB64), ivB64));
}
