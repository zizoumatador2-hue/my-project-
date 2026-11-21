/** Minimal cookie-aware HTTP client for testing the running worker (scripts/dev-server.sh). */
export const BASE = process.env.BM_BASE_URL ?? 'http://127.0.0.1:8788';

export class Client {
  cookies = new Map<string, string>();

  async req(path: string, init: RequestInit & { form?: Record<string, string | string[] | Blob>; json?: boolean } = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    if (!headers.has('Origin')) headers.set('Origin', BASE);
    if (this.cookies.size) headers.set('Cookie', [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '));
    if (init.json) headers.set('Accept', 'application/json');
    let body = init.body;
    if (init.form) {
      const fd = new FormData();
      for (const [k, v] of Object.entries(init.form)) {
        if (Array.isArray(v)) v.forEach((x) => fd.append(k, x));
        else fd.append(k, v as string | Blob);
      }
      body = fd;
    }
    const res = await fetch(BASE + path, { ...init, headers, body, redirect: 'manual', method: init.method ?? (init.form ? 'POST' : 'GET') });
    for (const c of res.headers.getSetCookie()) {
      const [pair, ...attrs] = c.split(';');
      const [k, v] = pair.split('=');
      const expired = attrs.some((a) => /expires=Thu, 01 Jan 1970/i.test(a) || /max-age=0/i.test(a));
      if (expired || v === '') this.cookies.delete(k.trim());
      else this.cookies.set(k.trim(), v);
    }
    return res;
  }

  async html(path: string): Promise<{ status: number; text: string }> {
    const res = await this.req(path);
    return { status: res.status, text: await res.text() };
  }

  post(path: string, form: Record<string, string | string[] | Blob>, json = false) {
    return this.req(path, { form, json });
  }
}

export const uid = () => Math.random().toString(36).slice(2, 8);

/** 1×1 PNG for upload tests. */
export const PNG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));
