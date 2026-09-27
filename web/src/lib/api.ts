// Fetch wrapper: CSRF header, timeouts, bounded retries for idempotent reads, normalized Arabic errors.

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: any) {
    super(message);
  }
  get fields(): Record<string, string> {
    return this.details?.fields ?? {};
  }
}

let csrfToken: string | null = null;
export function setCsrf(t: string | null) {
  csrfToken = t;
}

const TIMEOUT_MS = 20_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function once(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<any> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (csrfToken && method !== 'GET') headers['X-CSRF-Token'] = csrfToken;
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort('timeout'), TIMEOUT_MS);
  signal?.addEventListener('abort', () => ctrl.abort('cancelled'));
  let res: Response;
  try {
    res = await fetch('/api' + path, { method, headers, body: payload, credentials: 'same-origin', signal: ctrl.signal });
  } catch (e) {
    if (signal?.aborted) throw new ApiError(0, 'cancelled', 'أُلغي الطلب.');
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    throw new ApiError(0, ctrl.signal.aborted ? 'timeout' : 'network',
      offline ? 'لا يوجد اتصال بالإنترنت. تحقق من الشبكة وأعد المحاولة.' : ctrl.signal.aborted ? 'استغرق الطلب وقتًا طويلًا. تحقق من الاتصال وأعد المحاولة.' : 'تعذّر الاتصال بالخادم. أعد المحاولة.');
  } finally {
    clearTimeout(timer);
  }
  let data: any = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? 'http_' + res.status, data?.message ?? (res.status >= 500 ? 'الخادم غير متاح حاليًا. أعد المحاولة بعد قليل.' : 'تعذّر إتمام الطلب.'), data?.details ?? (data?.violations ? { violations: data.violations, flagged: data.flagged } : undefined));
  }
  return data;
}

export async function api<T = any>(method: string, path: string, body?: unknown, opts: { signal?: AbortSignal; retries?: number } = {}): Promise<T> {
  const retries = opts.retries ?? (method === 'GET' ? 2 : 0);
  for (let attempt = 0; ; attempt++) {
    try {
      return await once(method, path, body, opts.signal);
    } catch (e) {
      const err = e as ApiError;
      const transient = err.status === 0 && err.code !== 'cancelled' || err.status === 502 || err.status === 503;
      if (attempt >= retries || !transient) throw err;
      await sleep(600 * 2 ** attempt);
    }
  }
}

export const get = <T = any>(p: string, signal?: AbortSignal) => api<T>('GET', p, undefined, { signal });
export const post = <T = any>(p: string, b: unknown = {}) => api<T>('POST', p, b);
export const put = <T = any>(p: string, b: unknown) => api<T>('PUT', p, b);
export const del = <T = any>(p: string) => api<T>('DELETE', p);
