import type { Env } from '../env';
import { HttpError, now } from './util';

/**
 * Fixed-window rate limiter stored in D1 (strongly consistent, unlike KV).
 * One atomic UPSERT per check: a new window resets the counter, otherwise it increments.
 */
export async function rateLimit(env: Env, bucket: string, id: string, limit: number, windowMs: number): Promise<void> {
  const key = `${bucket}:${id}`;
  const t = now();
  const windowStart = t - (t % windowMs);
  const row = await env.DB.prepare(
    `INSERT INTO rate_limits (key, window_start, count) VALUES (?1, ?2, 1)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN rate_limits.window_start = ?2 THEN rate_limits.count + 1 ELSE 1 END,
       window_start = ?2
     RETURNING count`,
  ).bind(key, windowStart).first<{ count: number }>();
  if (row && row.count > limit) {
    const retry = Math.ceil((windowStart + windowMs - t) / 1000);
    throw new HttpError(429, 'rate_limited', `محاولات كثيرة. حاول مجددًا بعد ${retry} ثانية.`, { retryAfter: retry });
  }
}
