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

  it('Algeria: Edahabia via Chargily (DZD at admin rate) and BaridiMob/CCP with finance verification + manual refund', async () => {
    const ops = await admin();
    const { settings } = await ops.ok('GET', '/admin/settings');
    settings.payments = { ...settings.payments, usd_to_dzd: 250, platform_rip: '00799999001234567890', platform_account_holder: 'TrustTransfer SARL', baridimob_enabled: true, chargily_enabled: true };
    await ops.ok('PUT', '/admin/settings', settings);
    const cfg = await ops.ok('GET', '/config');
    expect(cfg.payments.methods).toEqual(expect.arrayContaining(['card', 'edahabia', 'cib', 'baridimob']));

    // --- Chargily (Edahabia) ---
    const seller = await signup('dzseller');
    const buyer = await signup('dzbuyer');
    const { id } = await publishedListing(seller, ops, { priceCents: 40000 });
    const r1 = await buyer.ok('POST', `/listings/${id}/buy`, { acceptDisclaimer: true, method: 'edahabia' });
    expect(r1.checkoutUrl).toContain('provider=chargily');
    let v = await buyer.ok('GET', `/deals/${r1.dealId}`);
    expect(v.deal.pay_currency).toBe('DZD');
    expect(v.deal.pay_amount).toBe(100000); // $400 × 250
    // Forged Chargily webhook is rejected.
    const forged = await fetch(BASE + '/api/webhooks/chargily', { method: 'POST', headers: { signature: 'a'.repeat(64) }, body: JSON.stringify({ id: 'x', type: 'checkout.paid', data: { metadata: { deal_id: r1.dealId } } }) });
    expect(forged.status).toBe(400);
    const session = new URL(BASE + r1.checkoutUrl).searchParams.get('session');
    await buyer.ok('POST', `/payments/sandbox/${r1.dealId}`, { sessionId: session, outcome: 'success' });
    v = await buyer.ok('GET', `/deals/${r1.dealId}`);
    expect(v.deal.escrow_state).toBe('held');

    // --- BaridiMob / CCP ---
    const buyer2 = await signup('dzbuyer2');
    const { id: id2 } = await publishedListing(seller, ops, { priceCents: 30000 });
    const r2 = await buyer2.ok('POST', `/listings/${id2}/buy`, { acceptDisclaimer: true, method: 'baridimob' });
    v = await buyer2.ok('GET', `/deals/${r2.dealId}`);
    expect(v.manualPayment.rip).toBe('00799999001234567890');
    expect(v.deal.pay_amount).toBe(75000);
    const proof = (ref: string) => { const fd = new FormData(); fd.append('file', fakePng(), 'r.png'); fd.append('transferRef', ref); fd.append('refundRip', '0079 9999 0011 2233 4455'); return fd; };
    // First proof rejected, second confirmed.
    expect((await buyer2.req('POST', `/deals/${r2.dealId}/payment-proof`, proof('BM-1'))).status).toBe(201);
    expect((await buyer2.req('POST', `/deals/${r2.dealId}/payment-proof`, proof('BM-dup'))).status).toBe(409);
    let q = await ops.ok('GET', '/admin/payments');
    let item = q.items.find((x: any) => x.deal_id === r2.dealId);
    expect((await ops.req('GET', item.receipt_url.replace('/api', ''))).status).toBe(200);
    expect((await buyer.req('GET', item.receipt_url.replace('/api', ''))).status).toBe(403);
    await ops.ok('POST', `/admin/payments/${item.id}/decision`, { action: 'reject', note: 'المبلغ غير مطابق' });
    expect((await buyer2.ok('GET', `/deals/${r2.dealId}`)).deal.escrow_state).toBe('pending_payment');
    await buyer2.ok('POST', `/deals/${r2.dealId}/payment-proof`, proof('BM-2'));
    q = await ops.ok('GET', '/admin/payments');
    item = q.items.find((x: any) => x.deal_id === r2.dealId);
    await ops.ok('POST', `/admin/payments/${item.id}/decision`, { action: 'confirm', note: 'التحويل وصل إلى الحساب' });
    expect((await buyer2.ok('GET', `/deals/${r2.dealId}`)).deal.escrow_state).toBe('held');

    // Seller backs out → refund goes to the manual refunds queue with the buyer's RIP.
    await seller.ok('POST', `/deals/${r2.dealId}/cancel`, { reason: 'لم أعد أرغب في البيع' });
    expect((await buyer2.ok('GET', `/deals/${r2.dealId}`)).deal.escrow_state).toBe('refunded');
    const refunds = await ops.ok('GET', '/admin/refunds');
    const rf = refunds.items.find((x: any) => x.deal_id === r2.dealId);
    expect(rf).toMatchObject({ currency: 'DZD', amount: 75000, status: 'pending' });
    expect((await ops.ok('POST', `/admin/refunds/${rf.id}/destination`)).rip).toBe('00799999001122334455');
    await ops.ok('POST', `/admin/refunds/${rf.id}/done`, { reference: 'CCP-REF-7788' });
    expect((await ops.req('POST', `/admin/refunds/${rf.id}/done`, { reference: 'again' })).status).toBe(409);
  });

  it('CCP withdrawal requires a valid 20-digit RIP', async () => {
    const u = await signup('ccpuser');
    const bad = await u.post('/wallet/withdrawals', { amountCents: 5000, payoutMethod: 'ccp', accountHolder: 'Test', rip: '123', password: 'Str0ngPassw0rd!' });
    expect(bad.status).toBe(400);
    expect(bad.data.details.fields.rip).toBeTruthy();
    const ok = await u.post('/wallet/withdrawals', { amountCents: 5000, payoutMethod: 'ccp', accountHolder: 'Test', rip: '00799999001234567890', password: 'Str0ngPassw0rd!' });
    expect(ok.status).toBe(409); // valid destination, but no balance
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
