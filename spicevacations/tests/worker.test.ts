import { describe, expect, it } from 'vitest';
import worker, { sameOrigin, type Env } from '../worker/index';

const store = new Map<string, string>();
const kv = {
  get: async (k: string) => store.get(k) ?? null,
  put: async (k: string, v: string) => void store.set(k, v),
} as unknown as KVNamespace;
const index = { items: [] };
const goMap = { 'resort/x/resort': { url: 'https://www.booking.com/searchresults.html?ss=X', partner: 'booking', fallback: '/resorts/x/' } };
const env: Env = {
  ASSETS: { fetch: async (u: string | URL | Request) => new Response(JSON.stringify(String(u).includes('go-map') ? goMap : index)) } as unknown as Fetcher,
  DATA: kv,
  SITE_URL: 'https://spicevacations.com',
};
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as unknown as ExecutionContext;
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://spicevacations.com${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Origin: 'https://spicevacations.com', ...headers },
    body: JSON.stringify(body),
  });

describe('worker', () => {
  it('blocks cross-site POSTs (CSRF)', async () => {
    const res = await worker.fetch(post('/api/newsletter', { email: 'a@b.co' }, { Origin: 'https://evil.example' }), env, ctx);
    expect(res.status).toBe(403);
    expect(sameOrigin(post('/api/contact', {}), env)).toBe(true);
  });
  it('subscribes to the newsletter and sets security headers', async () => {
    const res = await worker.fetch(post('/api/newsletter', { email: 'Ana@Example.com' }), env, ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect([...store.keys()].some((k) => k.startsWith('newsletter:'))).toBe(true);
  });
  it('validates contact form input server-side', async () => {
    const res = await worker.fetch(post('/api/contact', { name: 'A', email: 'bad', message: 'short' }), env, ctx);
    expect(res.status).toBe(400);
  });
  it('redirects /go/ links and never echoes unknown ids', async () => {
    const hit = await worker.fetch(new Request('https://spicevacations.com/go/resort/x/resort/'), env, ctx);
    expect(hit.status).toBe(302);
    expect(hit.headers.get('Location')).toContain('booking.com');
    const miss = await worker.fetch(new Request('https://spicevacations.com/go/nope/'), env, ctx);
    expect(miss.headers.get('Location')).toBe('/');
  });
  it('rejects empty planner requests', async () => {
    const res = await worker.fetch(post('/api/plan', {}), env, ctx);
    expect(res.status).toBe(400);
  });
});
