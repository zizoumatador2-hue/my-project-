// Minimal cookie-aware API client for integration tests against `wrangler dev`.
export const BASE = process.env.API_BASE || 'http://localhost:8787';

const rand = () => Math.floor(Math.random() * 250) + 1;

export class Client {
  cookie = '';
  csrf = '';
  ip = `10.${rand()}.${rand()}.${rand()}`;
  constructor(public name = 'client') {}

  async req(method: string, path: string, body?: unknown, extra: Record<string, string> = {}) {
    const headers: Record<string, string> = { Origin: BASE, 'CF-Connecting-IP': this.ip, ...extra };
    if (this.cookie) headers.Cookie = this.cookie;
    if (this.csrf) headers['X-CSRF-Token'] = this.csrf;
    let payload: BodyInit | undefined;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
    const r = await fetch(BASE + '/api' + path, { method, headers, body: payload, redirect: 'manual' });
    const set = r.headers.get('set-cookie');
    if (set) {
      const m = set.match(/(tt_session=[^;]*)/);
      if (m) this.cookie = m[1].endsWith('=') ? '' : m[1];
    }
    const ct = r.headers.get('content-type') || '';
    const data = ct.includes('json') ? await r.json() : await r.arrayBuffer();
    if ((data as any)?.csrf) this.csrf = (data as any).csrf;
    return { status: r.status, data: data as any, headers: r.headers };
  }
  get(p: string) { return this.req('GET', p); }
  post(p: string, b: unknown = {}) { return this.req('POST', p, b); }
  put(p: string, b: unknown) { return this.req('PUT', p, b); }
  del(p: string) { return this.req('DELETE', p); }

  async ok(method: string, path: string, body?: unknown) {
    const r = await this.req(method, path, body);
    if (r.status >= 300) throw new Error(`${this.name} ${method} ${path} -> ${r.status} ${JSON.stringify(r.data)}`);
    return r.data;
  }
}

export function uniq() {
  return Math.random().toString(36).slice(2, 10);
}

/** A valid PNG header followed by unique bytes (the server sniffs magic bytes; content uniqueness avoids reuse flags). */
export function fakePng(seed = uniq()): Blob {
  const head = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const tail = new TextEncoder().encode('tt-test-' + seed + '-' + Date.now());
  return new Blob([new Uint8Array([...head, ...tail])], { type: 'image/png' });
}

export async function signup(name: string, email = `${name}-${uniq()}@example.test`) {
  const c = new Client(name);
  await c.ok('POST', '/auth/signup', { email, password: 'Str0ngPassw0rd!', displayName: name, acceptTerms: true, confirmAdult: true });
  return c;
}

export const ADMIN_EMAIL = 'admin@trusttransfer.test';

let adminClient: Client | null = null;
/** One ops session per test run — logging in per test would trip the per-account login rate limit (by design). */
export async function admin() {
  if (adminClient) return adminClient;
  const c = new Client('admin');
  adminClient = c;
  const r = await c.req('POST', '/auth/login', { email: ADMIN_EMAIL, password: 'Adm1nPassw0rd!!' });
  if (r.status === 200) return c;
  await c.ok('POST', '/auth/signup', { email: ADMIN_EMAIL, password: 'Adm1nPassw0rd!!', displayName: 'فريق العمليات', acceptTerms: true, confirmAdult: true });
  return c;
}

export function listingInput(over: Record<string, unknown> = {}) {
  return {
    platform: 'instagram', handle: `acct_${uniq()}`, title: 'حساب طبخ منزلي بجمهور خليجي متفاعل',
    description: 'حساب متخصص في وصفات الطبخ المنزلي، محتوى أصلي بالكامل، جمهور من السعودية والإمارات بنسبة عالية.',
    followers: 48200, engagementRate: 4.2, category: 'food', country: 'SA', language: 'ar',
    accountCreatedYear: 2019, accountCreatedMonth: 3, priceCents: 250000, codeMethod: 'bio', ...over,
  };
}
