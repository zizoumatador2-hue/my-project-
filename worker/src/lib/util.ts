export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

export const now = () => Date.now();

export function newId(prefix = ''): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return prefix ? `${prefix}_${s}` : s;
}

export function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export function clientIp(req: Request): string {
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '0.0.0.0';
}

export const HOUR = 3600_000;
export const DAY = 24 * HOUR;
