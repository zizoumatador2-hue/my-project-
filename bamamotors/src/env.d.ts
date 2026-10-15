/// <reference types="astro/client" />

// Cloudflare binding types, imported as a module so they don't clash with the DOM lib.
type D1Database = import('@cloudflare/workers-types/index').D1Database;
type D1Result<T = unknown> = import('@cloudflare/workers-types/index').D1Result<T>;
type D1PreparedStatement = import('@cloudflare/workers-types/index').D1PreparedStatement;
type R2Bucket = import('@cloudflare/workers-types/index').R2Bucket;
type Fetcher = import('@cloudflare/workers-types/index').Fetcher;

interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
  SITE_URL: string;
  ENVIRONMENT?: string;
  PUBLIC_CACHE_TTL?: string;
  EMAIL_FROM?: string;
  SESSION_SECRET?: string;
  BOOTSTRAP_ADMIN_EMAIL?: string;
  RESEND_API_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_BASIC?: string;
  STRIPE_PRICE_PRO?: string;
  STRIPE_PRICE_FEATURED?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
}

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    user: import('./lib/auth').SessionUser | null;
    dealer: import('./lib/dealers').DealerRow | null;
    settings: Record<string, string>;
  }
}
