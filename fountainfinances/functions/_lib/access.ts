// Admin authorization. The admin area sits behind Cloudflare Access: Access signs each request
// with a JWT in the Cf-Access-Jwt-Assertion header. We verify that signature here, on the server,
// so the admin pages and APIs never trust the frontend or a plain header alone. Fails closed.
import type { Env } from './http';

type Jwk = JsonWebKey & { kid?: string };

export interface AdminIdentity {
  email: string;
}

let jwksCache: { team: string; at: number; keys: Jwk[] } | null = null;
const JWKS_TTL_MS = 60 * 60 * 1000;

const b64urlBytes = (s: string): Uint8Array => {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
};
const b64urlJson = <T>(s: string): T => JSON.parse(new TextDecoder().decode(b64urlBytes(s))) as T;

async function loadKeys(env: Env): Promise<Jwk[]> {
  // Optional static key set, for tests or a locked-down deployment. Owner-controlled config only.
  if (env.ACCESS_JWKS_JSON) return (JSON.parse(env.ACCESS_JWKS_JSON) as { keys: Jwk[] }).keys;
  const team = env.ACCESS_TEAM_DOMAIN as string;
  if (jwksCache && jwksCache.team === team && Date.now() - jwksCache.at < JWKS_TTL_MS) return jwksCache.keys;
  const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`Access certs unavailable (${res.status})`);
  const { keys } = (await res.json()) as { keys: Jwk[] };
  jwksCache = { team, at: Date.now(), keys };
  return keys;
}

/** Verifies an Access JWT: RS256 signature, issuer, audience, expiry. Returns the identity or null. */
export async function verifyAccessJwt(token: string, env: Env): Promise<AdminIdentity | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const header = b64urlJson<{ alg?: string; kid?: string }>(parts[0]);
  if (header.alg !== 'RS256') return null;
  const payload = b64urlJson<{ aud?: string[] | string; iss?: string; exp?: number; nbf?: number; email?: string }>(parts[1]);
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return null;

  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(env.ACCESS_AUD)) return null;
  if (payload.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) return null;
  const t = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < t) return null;
  if (payload.nbf && payload.nbf > t + 60) return null;
  if (!payload.email) return null;

  const keys = await loadKeys(env);
  const jwk = keys.find((k) => k.kid === header.kid) ?? (keys.length === 1 ? keys[0] : undefined);
  if (!jwk || !jwk.n || !jwk.e) return null;
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    b64urlBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  return valid ? { email: payload.email.toLowerCase() } : null;
}

export type AuthResult = { ok: true; email: string } | { ok: false; reason: string };

/** Full admin gate: a valid Access session, plus the optional ADMIN_EMAILS allowlist. */
export async function authorize(req: Request, env: Env): Promise<AuthResult> {
  const token = req.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return { ok: false, reason: 'Sign in through Cloudflare Access to open the admin area.' };
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
    return { ok: false, reason: 'Admin access is not configured yet. Set ACCESS_TEAM_DOMAIN and ACCESS_AUD.' };
  }
  let identity: AdminIdentity | null = null;
  try {
    identity = await verifyAccessJwt(token, env);
  } catch {
    return { ok: false, reason: 'Could not verify your session. Try signing in again.' };
  }
  if (!identity) return { ok: false, reason: 'Your session is not valid. Sign in again.' };

  const allow = (env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (allow.length && !allow.includes(identity.email)) {
    return { ok: false, reason: 'This account is not authorized for the admin area.' };
  }
  return { ok: true, email: identity.email };
}
