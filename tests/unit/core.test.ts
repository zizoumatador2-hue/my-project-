import { describe, expect, it } from 'vitest';
import { scanMessage } from '../../shared/chatFilter';
import { computeCommission, DEFAULT_SETTINGS, ESCROW_TRANSITIONS } from '../../shared/domain';
import { canTransition } from '../../worker/src/lib/escrow';
import { evaluateListing, scoreFlags } from '../../worker/src/lib/fraud';
import { signStripePayload, verifyStripeSignature } from '../../worker/src/lib/payments';
import { computeTrust } from '../../worker/src/lib/trust';
import { decryptText, encryptText, hashPassword, verifyPassword } from '../../worker/src/lib/crypto';

describe('chat filter', () => {
  const blocked = [
    ['0555123456', 'phone'], ['+966 55 512 3456', 'phone'], ['٠٥٥٥١٢٣٤٥٦', 'phone'], ['zero five five five one two three four', 'phone'],
    ['راسلني على الواتس', 'messaging_app'], ['telegram me', 'messaging_app'], ['t.me/someone', 'link'],
    ['name@gmail.com', 'email'], ['name at gmail dot com', 'email'], ['https://evil.example/pay', 'link'], ['visit mysite dot com', 'link'],
    ['pay me via paypal', 'offplatform_payment'], ['تحويل بنكي أفضل', 'offplatform_payment'], ['usdt only', 'offplatform_payment'],
    ['follow @otherguy', 'handle'], ['snap: coolguy99', 'handle'],
    ['وا​تساب', 'messaging_app'], // zero-width obfuscation
  ] as const;
  for (const [msg, code] of blocked) it(`blocks "${msg}"`, () => expect(scanMessage(msg)).toContain(code));

  const allowed = [
    'الحساب فيه 1,200,000 متابع ونسبة التفاعل 4.5%',
    'السعر 2500 دولار قابل للتفاوض بسيط',
    'هل الجمهور من السعودية؟ وكم عمر الحساب؟',
    'I can do the transfer tomorrow at 9pm',
    'الحساب @cook_home هو نفسه المعروض',
    'تم إنشاؤه في 2019 ولديه 320 منشور',
  ];
  for (const msg of allowed) it(`allows "${msg}"`, () => expect(scanMessage(msg, ['cook_home'])).toEqual([]));
});

describe('commission', () => {
  const c = DEFAULT_SETTINGS.commission;
  it('uses tier by price', () => {
    expect(computeCommission(50000, c)).toEqual({ bp: 1000, cents: 5000 });
    expect(computeCommission(250000, c)).toEqual({ bp: 800, cents: 20000 });
    expect(computeCommission(1000000, c)).toEqual({ bp: 600, cents: 60000 });
  });
  it('applies the minimum fee but never exceeds price', () => {
    expect(computeCommission(2000, c).cents).toBe(500);
    expect(computeCommission(300, { tiers: [{ min_cents: 0, bp: 1000 }], min_fee_cents: 500 }).cents).toBe(300);
  });
});

describe('escrow state machine', () => {
  it('only allows documented transitions', () => {
    expect(canTransition('pending_payment', 'held')).toBe(true);
    expect(canTransition('pending_payment', 'released')).toBe(false);
    expect(canTransition('held', 'released')).toBe(false); // must go through transfer + confirmation
    expect(canTransition('buyer_confirmation_window', 'released')).toBe(true);
    expect(canTransition('disputed', 'split')).toBe(true);
    for (const terminal of ['refunded', 'split', 'cancelled'] as const) expect(ESCROW_TRANSITIONS[terminal]).toEqual([]);
  });
});

describe('stripe signatures', () => {
  it('verifies valid, rejects tampered/stale', async () => {
    const body = '{"id":"evt_1"}';
    const header = await signStripePayload('whsec_test', body);
    expect(await verifyStripeSignature('whsec_test', body, header)).toBe(true);
    expect(await verifyStripeSignature('whsec_test', body + ' ', header)).toBe(false);
    expect(await verifyStripeSignature('whsec_other', body, header)).toBe(false);
    const old = await signStripePayload('whsec_test', body, Math.floor(Date.now() / 1000) - 3600);
    expect(await verifyStripeSignature('whsec_test', body, old)).toBe(false);
    expect(await verifyStripeSignature('whsec_test', body, null)).toBe(false);
  });
});

describe('crypto', () => {
  const key = Buffer.alloc(32, 7).toString('base64');
  it('round-trips and binds ciphertext to its context', async () => {
    const e = await encryptText(key, 'secret:a', 'hunter2');
    expect(await decryptText(key, 'secret:a', e.ciphertext, e.iv)).toBe('hunter2');
    await expect(decryptText(key, 'secret:b', e.ciphertext, e.iv)).rejects.toBeTruthy();
  });
  it('hashes passwords with salt', async () => {
    const h = await hashPassword('Str0ngPassw0rd!');
    expect(await verifyPassword('Str0ngPassw0rd!', h.hash, h.salt)).toBe(true);
    expect(await verifyPassword('wrong', h.hash, h.salt)).toBe(false);
  });
});

describe('trust score', () => {
  const base = { completed: 0, disputesOpenedAgainst: 0, disputesLost: 0, cancellations: 0, verificationsApproved: 0, verificationsRejected: 0, avgResponseMinutes: null, chatViolations: 0, accountAgeDays: 0 };
  it('starts neutral, grows with history, drops with lost disputes', () => {
    expect(computeTrust(base, 'seller').score).toBe(50);
    expect(computeTrust({ ...base, completed: 10, verificationsApproved: 5 }, 'seller').score).toBeGreaterThan(80);
    expect(computeTrust({ ...base, completed: 10, disputesLost: 2 }, 'seller').score).toBeLessThan(computeTrust({ ...base, completed: 10 }, 'seller').score);
  });
  it('is bounded 0–100', () => {
    expect(computeTrust({ ...base, disputesLost: 10, cancellations: 10, chatViolations: 10 }, 'buyer').score).toBe(0);
    expect(computeTrust({ ...base, completed: 1000, accountAgeDays: 5000, verificationsApproved: 100, avgResponseMinutes: 5 }, 'seller').score).toBeLessThanOrEqual(100);
  });
});

describe('fraud heuristics', () => {
  const now = Date.UTC(2026, 8, 1);
  const listing = { id: 'l', seller_id: 's', platform: 'instagram', handle: 'x', handle_normalized: 'x', followers: 50000, engagement_rate: 3, price_cents: 200000, account_created_year: 2020, account_created_month: 1, verification_code: 'TT', code_method: 'bio' };
  const ctx = { settings: DEFAULT_SETTINGS, nowMs: now, sellerCreatedAt: now - 1e10, duplicateClaims: 0, previouslySold: 0, reusedEvidence: 0, sellerRejected: 0, sellerLostDisputes: 0, evidenceKinds: ['settings', 'analytics'] };
  it('clean listing has no flags', () => expect(evaluateListing(listing, ctx)).toEqual([]));
  it('flags duplicates, reused evidence, new accounts and cheap large accounts', () => {
    const f = evaluateListing({ ...listing, account_created_year: 2026, account_created_month: 7, price_cents: 1000 }, { ...ctx, duplicateClaims: 1, reusedEvidence: 2 });
    const codes = f.map((x) => x.code);
    expect(codes).toEqual(expect.arrayContaining(['duplicate_claim', 'reused_evidence', 'new_account', 'price_too_low']));
    expect(scoreFlags(f)).toBeGreaterThanOrEqual(100);
  });
});
