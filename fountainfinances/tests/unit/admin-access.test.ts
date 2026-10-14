// Verifies the admin gate with real RSA signatures: valid sessions pass, anything else fails closed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { authorize, verifyAccessJwt } from '../../functions/_lib/access.ts';
import { csvCell, csvText, rangeFrom, parseRange } from '../../functions/_lib/admin-ui.ts';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' };
const TEAM = 'example-team.cloudflareaccess.com';
const AUD = 'test-audience-tag';

const b64u = (buf: Buffer | string) => Buffer.from(buf).toString('base64url');

function token(overrides: Record<string, unknown> = {}, opts: { alg?: string; key?: typeof privateKey; kid?: string } = {}) {
  const header = { alg: opts.alg ?? 'RS256', kid: opts.kid ?? 'test-key', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: [AUD], iss: `https://${TEAM}`, exp: now + 600, nbf: now - 10, email: 'owner@example.com', ...overrides };
  const signingInput = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(payload))}`;
  const sig = sign('RSA-SHA256', Buffer.from(signingInput), opts.key ?? privateKey).toString('base64url');
  return `${signingInput}.${sig}`;
}

const env = {
  ACCESS_TEAM_DOMAIN: TEAM,
  ACCESS_AUD: AUD,
  ACCESS_JWKS_JSON: JSON.stringify({ keys: [jwk] }),
} as unknown as Parameters<typeof verifyAccessJwt>[1];

const req = (headers: Record<string, string> = {}) => new Request('https://fountainfinances.com/admin', { headers });

test('a valid, unexpired session is accepted and lower-cases the email', async () => {
  const id = await verifyAccessJwt(token({ email: 'Owner@Example.com' }), env);
  assert.deepEqual(id, { email: 'owner@example.com' });
});

test('a token signed by a different key is rejected', async () => {
  const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  assert.equal(await verifyAccessJwt(token({}, { key: other }), env), null);
});

test('a tampered payload is rejected', async () => {
  const t = token();
  const [h, , s] = t.split('.');
  const forged = b64u(JSON.stringify({ aud: [AUD], iss: `https://${TEAM}`, exp: 9999999999, email: 'attacker@example.com' }));
  assert.equal(await verifyAccessJwt(`${h}.${forged}.${s}`, env), null);
});

test('expired, wrong-audience, wrong-issuer and not-yet-valid tokens are rejected', async () => {
  const past = Math.floor(Date.now() / 1000) - 60;
  assert.equal(await verifyAccessJwt(token({ exp: past }), env), null);
  assert.equal(await verifyAccessJwt(token({ aud: ['someone-else'] }), env), null);
  assert.equal(await verifyAccessJwt(token({ iss: 'https://evil.example' }), env), null);
  assert.equal(await verifyAccessJwt(token({ nbf: Math.floor(Date.now() / 1000) + 3600 }), env), null);
});

test('non-RS256 algorithms are rejected, including "none"', async () => {
  assert.equal(await verifyAccessJwt(token({}, { alg: 'HS256' }), env), null);
  const none = `${b64u(JSON.stringify({ alg: 'none' }))}.${b64u(JSON.stringify({ email: 'x@y.z', exp: 9999999999, aud: [AUD], iss: `https://${TEAM}` }))}.`;
  assert.equal(await verifyAccessJwt(none, env), null);
});

test('authorize fails closed without a token or without configuration', async () => {
  const none = await authorize(req(), env);
  assert.equal(none.ok, false);
  const unconfigured = await authorize(req({ 'Cf-Access-Jwt-Assertion': token() }), {} as Parameters<typeof authorize>[1]);
  assert.equal(unconfigured.ok, false);
});

test('authorize accepts a valid session and enforces the ADMIN_EMAILS allowlist', async () => {
  const ok = await authorize(req({ 'Cf-Access-Jwt-Assertion': token() }), env);
  assert.deepEqual(ok, { ok: true, email: 'owner@example.com' });

  const allowed = { ...env, ADMIN_EMAILS: 'someone@example.com, owner@example.com' } as typeof env;
  assert.equal((await authorize(req({ 'Cf-Access-Jwt-Assertion': token() }), allowed)).ok, true);

  const blocked = { ...env, ADMIN_EMAILS: 'someone@example.com' } as typeof env;
  assert.equal((await authorize(req({ 'Cf-Access-Jwt-Assertion': token() }), blocked)).ok, false);
});

test('CSV cells are quoted and guarded against spreadsheet formula injection', () => {
  assert.equal(csvCell('plain'), 'plain');
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(csvCell('+1'), "'+1");
  assert.equal(csvText([['a', 'b'], [1, null]]), 'a,b\r\n1,\r\n');
});

test('date ranges default to today and map to UTC boundaries', () => {
  assert.equal(parseRange(null), 'today');
  assert.equal(parseRange('bogus'), 'today');
  assert.equal(parseRange('7d'), '7d');
  assert.equal(rangeFrom('all'), 0);
  assert.ok(rangeFrom('today') <= Math.floor(Date.now() / 1000));
  assert.ok(rangeFrom('7d') < rangeFrom('today'));
});
