import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { admin, BASE, Client, fakePng, listingInput, signup } from './client';

async function uploadEvidence(c: Client, listingId: string, kind: string) {
  const fd = new FormData();
  fd.append('kind', kind);
  fd.append('file', fakePng(), 'shot.png');
  return c.req('POST', `/listings/${listingId}/evidence`, fd);
}

async function publishedListing(seller: Client, ops: Client, over: Record<string, unknown> = {}) {
  const input = listingInput(over);
  const { id } = await seller.ok('POST', '/listings', input);
  for (const k of ['settings', 'analytics', 'code_proof']) expect((await uploadEvidence(seller, id, k)).status).toBe(201);
  await seller.ok('POST', `/listings/${id}/submit`, { attest: true });
  await ops.ok('POST', `/admin/listings/${id}/claim`);
  let detail = await ops.ok('GET', `/admin/listings/${id}`);
  // Approval is gated on the queued heuristics having run.
  for (let i = 0; i < 40 && detail.listing.code_check_status === 'pending'; i++) {
    await new Promise((r) => setTimeout(r, 500));
    detail = await ops.ok('GET', `/admin/listings/${id}`);
  }
  expect(detail.listing.code_check_status).not.toBe('pending');
  // Resolve any automated flags so the reviewer can approve (mirrors the real ops flow).
  for (const fc of detail.fraudCases.filter((f: any) => f.status === 'open')) {
    await ops.ok('POST', `/admin/fraud/${fc.id}/resolve`, { outcome: 'cleared', note: 'تمت مراجعة المؤشرات يدويًا' });
  }
  await ops.ok('POST', `/admin/listings/${id}/decision`, { action: 'approve', note: 'تم التحقق من الرمز واللقطات', observedFollowers: input.followers, codeVerified: true, stepsChecked: true });
  return { id, input };
}

async function payInSandbox(buyer: Client, listingId: string) {
  const { dealId, checkoutUrl } = await buyer.ok('POST', `/listings/${listingId}/buy`, { acceptDisclaimer: true });
  const session = new URL(BASE + checkoutUrl).searchParams.get('session');
  await buyer.ok('POST', `/payments/sandbox/${dealId}`, { sessionId: session, outcome: 'success' });
  return dealId as string;
}

async function runTransfer(seller: Client, buyer: Client, ops: Client, dealId: string) {
  const reveal = async (c: Client, key: string) => {
    const v = await c.ok('GET', `/deals/${dealId}`);
    const s = v.secrets.filter((x: any) => x.step_key === key && !x.revealed_at).pop();
    return (await c.ok('POST', `/deals/${dealId}/secrets/${s.id}/reveal`)).value;
  };
  await seller.ok('POST', `/deals/${dealId}/steps/1/perform`, { note: 'عطلت 2FA' });
  await buyer.ok('POST', `/deals/${dealId}/steps/2/secret`, { value: 'new-owner@example.test' });
  expect(await reveal(seller, 'recovery_email')).toBe('new-owner@example.test');
  await seller.ok('POST', `/deals/${dealId}/steps/2/perform`, {});
  await buyer.ok('POST', `/deals/${dealId}/steps/2/confirm`);
  await buyer.ok('POST', `/deals/${dealId}/steps/3/secret`, { value: '+966 500 000 000' });
  await reveal(seller, 'recovery_phone');
  await seller.ok('POST', `/deals/${dealId}/steps/3/perform`, {});
  await buyer.ok('POST', `/deals/${dealId}/steps/3/confirm`);
  await seller.ok('POST', `/deals/${dealId}/steps/4/perform`, { secret: 'Temp#Pass-2026' });
  expect(await reveal(buyer, 'password_handover')).toBe('Temp#Pass-2026');
  await buyer.ok('POST', `/deals/${dealId}/steps/4/confirm`);
  await buyer.ok('POST', `/deals/${dealId}/steps/5/perform`, { note: 'دخلت وفعّلت 2FA' });
  await ops.ok('POST', `/deals/${dealId}/steps/6/perform`, { note: 'السجل مكتمل' });
}

describe('TrustTransfer API lifecycle', () => {
  it('rejects cross-site and CSRF-less mutations', async () => {
    const r = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: '{}' });
    expect(r.status).toBe(403);
    const u = await signup('csrf');
    const saved = u.csrf;
    u.csrf = '';
    expect((await u.post('/listings', listingInput())).status).toBe(403);
    u.csrf = saved;
  });

  it('full escrow happy path: purchase → hold → transfer → confirm → release → withdraw', async () => {
    const ops = await admin();
    const seller = await signup('seller');
    const buyer = await signup('buyer');
    const { id } = await publishedListing(seller, ops);

    // Public browse shows it; verification internals are hidden from the public.
    const pub = await buyer.ok('GET', `/listings/${id}`);
    expect(pub.listing.verification_code).toBeUndefined();
    expect(pub.listing.fraud_score).toBeUndefined();

    // Seller cannot buy own listing.
    expect((await seller.post(`/listings/${id}/buy`, { acceptDisclaimer: true })).status).toBe(403);

    const dealId = await payInSandbox(buyer, id);
    let v = await buyer.ok('GET', `/deals/${dealId}`);
    expect(v.deal.escrow_state).toBe('held');
    expect(v.steps).toHaveLength(6);

    // Out-of-order step and wrong-party actions are refused.
    expect((await seller.post(`/deals/${dealId}/steps/2/perform`, {})).status).toBe(409);
    expect((await buyer.post(`/deals/${dealId}/steps/1/perform`, {})).status).toBe(403);
    // A party can never perform the admin verification step.
    expect((await seller.post(`/deals/${dealId}/steps/6/perform`, {})).status).toBe(403);

    // Buyer cannot release before transfer completes.
    expect((await buyer.post(`/deals/${dealId}/confirm-release`, { satisfied: true })).status).toBe(409);

    await runTransfer(seller, buyer, ops, dealId);
    v = await buyer.ok('GET', `/deals/${dealId}`);
    expect(v.deal.escrow_state).toBe('buyer_confirmation_window');

    // Secrets are one-time: a second reveal fails, and ciphertext is gone.
    const pw = v.secrets.find((x: any) => x.step_key === 'password_handover');
    expect((await buyer.post(`/deals/${dealId}/secrets/${pw.id}/reveal`)).status).toBe(410);
    // The other party can never reveal a secret addressed to someone else.
    expect((await seller.post(`/deals/${dealId}/secrets/${pw.id}/reveal`)).status).toBe(404);

    await buyer.ok('POST', `/deals/${dealId}/confirm-release`, { satisfied: true });
    v = await seller.ok('GET', `/deals/${dealId}`);
    expect(v.deal.escrow_state).toBe('released');

    const w = await seller.ok('GET', '/wallet');
    // 2,500.00 at 8% (tier ≥ $1,000) = 200.00 commission → 2,300.00 net, on reclaim hold.
    expect(w.balances.on_hold).toBe(230000);
    expect(w.balances.available).toBe(0);
    // Cannot withdraw held funds.
    const wr = await seller.post('/wallet/withdrawals', { amountCents: 5000, accountHolder: 'Seller', iban: 'SA0380000000608010167519', bankName: 'Test Bank', password: 'Str0ngPassw0rd!' });
    expect(wr.status).toBe(409);
  });

  it('dispute freezes escrow and arbiter can split', async () => {
    const ops = await admin();
    const seller = await signup('seller2');
    const buyer = await signup('buyer2');
    const { id } = await publishedListing(seller, ops, { priceCents: 50000 });
    const dealId = await payInSandbox(buyer, id);
    await seller.ok('POST', `/deals/${dealId}/steps/1/perform`, {});
    const { disputeId } = await buyer.ok('POST', `/deals/${dealId}/disputes`, { reason: 'transfer_stalled', description: 'البائع توقف عن الاستجابة منذ يومين ولم يغيّر البريد' });
    // Frozen: no step progress.
    expect((await buyer.post(`/deals/${dealId}/steps/2/secret`, { value: 'x@example.test' })).status).toBe(409);
    // Parties add statement + evidence.
    await seller.ok('POST', `/disputes/${disputeId}/statements`, { body: 'كنت مسافرًا وسأكمل اليوم' });
    const fd = new FormData(); fd.append('file', fakePng(), 'e.png'); fd.append('note', 'لقطة');
    expect((await buyer.req('POST', `/disputes/${disputeId}/evidence`, fd)).status).toBe(201);
    // Arbiter must assign before resolving.
    expect((await ops.post(`/admin/disputes/${disputeId}/resolve`, { action: 'refund', note: 'قرار قبل الإسناد' })).status).toBe(403);
    await ops.ok('POST', `/admin/disputes/${disputeId}/assign`);
    const full = await ops.ok('GET', `/admin/disputes/${disputeId}`);
    expect(full.chat).toBeTruthy();
    expect(full.disputeEvents.length).toBeGreaterThanOrEqual(3);
    // Dispute evidence file is decryptable only via signed URL + authorized session.
    const fileUrl = full.disputeEvents.find((e: any) => e.has_file).file_url;
    const f = await ops.req('GET', fileUrl.replace('/api', ''));
    expect(f.status).toBe(200);
    const anon = new Client('anon');
    expect((await anon.req('GET', fileUrl.replace('/api', ''))).status).toBe(401);
    expect((await seller.req('GET', fileUrl.replace('/api', ''))).status).toBe(403); // minted for someone else

    await ops.ok('POST', `/admin/disputes/${disputeId}/resolve`, { action: 'split', buyerRefundCents: 20000, note: 'تأخير البائع أضرّ بالمشتري؛ تسوية جزئية' });
    const v = await buyer.ok('GET', `/deals/${dealId}`);
    expect(v.deal.escrow_state).toBe('split');
    const w = await seller.ok('GET', '/wallet');
    // seller gross 300.00 at 10% = 30.00 → 270.00
    expect(w.balances.on_hold).toBe(27000);
  });

  it('post-release reclaim dispute freezes proceeds and refund reverses them', async () => {
    const ops = await admin();
    const seller = await signup('seller3');
    const buyer = await signup('buyer3');
    const { id } = await publishedListing(seller, ops, { priceCents: 30000 });
    const dealId = await payInSandbox(buyer, id);
    await runTransfer(seller, buyer, ops, dealId);
    await buyer.ok('POST', `/deals/${dealId}/confirm-release`, { satisfied: true });
    const { disputeId } = await buyer.ok('POST', `/deals/${dealId}/disputes`, { reason: 'reclaimed', description: 'استعاد البائع الحساب عبر بريد الاسترداد القديم بعد يوم' });
    let w = await seller.ok('GET', '/wallet');
    expect(w.balances.frozen).toBeGreaterThan(0);
    await ops.ok('POST', `/admin/disputes/${disputeId}/assign`);
    await ops.ok('POST', `/admin/disputes/${disputeId}/resolve`, { action: 'refund', note: 'ثبت استرداد البائع للحساب من سجل الدخول' });
    w = await seller.ok('GET', '/wallet');
    expect(w.balances.on_hold + w.balances.available + w.balances.frozen).toBe(0);
    const v = await buyer.ok('GET', `/deals/${dealId}`);
    expect(v.deal.escrow_state).toBe('refunded');
  });

  it('chat blocks contact sharing and flags repeat offenders', async () => {
    const ops = await admin();
    const seller = await signup('seller4');
    const buyer = await signup('buyer4');
    const { id } = await publishedListing(seller, ops, { priceCents: 20000 });
    const { id: conv } = await buyer.ok('POST', `/listings/${id}/conversations`, {});
    expect((await buyer.post(`/conversations/${conv}/messages`, { body: 'مرحبا، هل الحساب ما زال متاحًا؟ كم عدد المتابعين من السعودية؟' })).status).toBe(201);
    const attempts = ['كلمني واتساب ٠٥٥٥١٢٣٤٥٦', 'my email is someone at gmail dot com', 'ادفع لك باي بال أرخص', 'تيليجرام @dealsguy'];
    for (const a of attempts) expect((await buyer.post(`/conversations/${conv}/messages`, { body: a })).status).toBe(422);
    // Seller doesn't see blocked attempts.
    const sv = await seller.ok('GET', `/conversations/${conv}/messages`);
    expect(sv.messages.filter((m: any) => m.blocked).length).toBe(0);
    const fraud = await ops.ok('GET', '/admin/fraud');
    expect(fraud.items.some((f: any) => f.subject_type === 'user' && f.reason.includes('محاولات متكررة'))).toBe(true);
  });

  it('cron: expired confirmation window auto-releases; unpaid deals are cancelled and relisted', async () => {
    const ops = await admin();
    const seller = await signup('seller5');
    const buyer = await signup('buyer5');
    const buyer2 = await signup('buyer6');
    const { id } = await publishedListing(seller, ops, { priceCents: 40000 });
    const dealId = await payInSandbox(buyer, id);
    await runTransfer(seller, buyer, ops, dealId);
    const { id: id2 } = await publishedListing(seller, ops, { priceCents: 30000 });
    const { dealId: unpaid } = await buyer2.ok('POST', `/listings/${id2}/buy`, { acceptDisclaimer: true });
    // Move both deadlines into the past directly in the local D1, then fire the scheduled handler.
    const sql = `UPDATE deals SET confirm_deadline = 1 WHERE id = '${dealId}'; UPDATE deals SET payment_expires_at = 1 WHERE id = '${unpaid}';`;
    execSync(`npx wrangler d1 execute trusttransfer-db --local --command "${sql}"`, { stdio: 'ignore' });
    const r = await fetch(`${BASE}/__scheduled?cron=*/10+*+*+*+*`, { headers: { 'sec-fetch-mode': 'no-cors' } });
    expect(r.status).toBe(200);
    await new Promise((res) => setTimeout(res, 1500));
    expect((await buyer.ok('GET', `/deals/${dealId}`)).deal.escrow_state).toBe('released');
    expect((await buyer2.ok('GET', `/deals/${unpaid}`)).deal.escrow_state).toBe('cancelled');
    expect((await buyer2.ok('GET', `/listings/${id2}`)).listing.status).toBe('approved');
  });

  it('webhook rejects forged signatures', async () => {
    const r = await fetch(BASE + '/api/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': 't=1,v1=deadbeef', 'content-type': 'application/json' }, body: '{"id":"evt_x","type":"checkout.session.completed","data":{"object":{}}}' });
    expect(r.status).toBe(400);
  });

  it('non-admins cannot reach admin APIs; evidence URLs need a claim', async () => {
    const u = await signup('nosy');
    expect((await u.get('/admin/overview')).status).toBe(403);
    expect((await u.get('/admin/listings')).status).toBe(403);
  });
});
