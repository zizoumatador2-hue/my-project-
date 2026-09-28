import type { Role } from '../../shared/domain';

export interface Env {
  DB: D1Database;
  CONFIG: KVNamespace;
  EVIDENCE: R2Bucket;
  ASSETS: Fetcher;
  VERIFY_QUEUE: Queue<VerifyMessage>;
  TRANSFER_QUEUE: Queue<TransferMessage>;

  ENVIRONMENT: 'production' | 'development' | 'test';
  PAYMENT_PROVIDER: 'stripe' | 'sandbox';
  APP_URL: string;

  SESSION_SECRET?: string;
  DATA_ENCRYPTION_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  CHARGILY_SECRET_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_SITE_KEY?: string;
  BOOTSTRAP_ADMIN_EMAIL?: string;
}

export type VerifyMessage =
  | { type: 'listing_submitted'; listingId: string }
  | { type: 'recompute_trust'; userId: string };

export type TransferMessage =
  | { type: 'deal_event'; dealId: string; event: string; actorId?: string | null }
  | { type: 'recompute_trust'; userId: string };

export interface SessionUser {
  id: string;
  email: string;
  display_name: string;
  role: Role;
  status: 'active' | 'suspended';
}

export interface AppVars {
  user: SessionUser | null;
  sessionId: string | null;
  csrf: string | null;
}

export type AppEnv = { Bindings: Env; Variables: AppVars };
