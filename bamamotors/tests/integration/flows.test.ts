import { describe, it, expect, beforeAll } from 'vitest';
import { Client, BASE, uid, PNG } from './http';

const admin = new Client();
const dealer = new Client();
const dealer2 = new Client();
const shopper = new Client();
const anon = new Client();
const tag = uid();
let dealerId = 0;
let vehicleId = 0;
let vehicleSlug = '';
let dealerSlug = '';
let otherVehicleId = 0;

async function makeIds() {
  const res = await anon.req('/api/models?make=toyota');
  const { models } = (await res.json()) as { models: { id: number; slug: string }[] };
  const camry = models.find((m) => m.slug === 'camry')!;
  const make = await (await anon.req(`/api/models?make_id=0`)).json();
  return { camry, make };
}

async function signupDealer(c: Client, name: string) {
  const res = await c.post('/signup?type=dealer', {
    dealer_name: name, dealer_phone: '(205) 555-0100', address: '100 Test Ave', city: 'Birmingham', zip: '35203',
    name: 'Test Owner', email: `${uid()}-${tag}@dealer.test`, phone: '', password: 'correct-horse-battery', terms: 'on',
  });
  expect(res.status).toBe(303);
  expect(res.headers.get('location')).toContain('/dashboard');
}

describe('BamaMotors end-to-end flows', () => {
  beforeAll(async () => {
    const ok = await fetch(`${BASE}/robots.txt`).then((r) => r.ok).catch(() => false);
    if (!ok) throw new Error(`Server not running at ${BASE}. Start it with scripts/dev-server.sh --fresh`);
  });

  it('bootstraps the admin account from BOOTSTRAP_ADMIN_EMAIL', async () => {
    let res = await admin.post('/signup', { name: 'Site Admin', email: 'admin@bamamotors.test', password: 'admin-password-123', terms: 'on' });
    if (res.status === 200) {
      // Already exists from a previous run — sign in instead.
      res = await admin.post('/login', { email: 'admin@bamamotors.test', password: 'admin-password-123' });
    }
    expect(res.status).toBe(303);
    expect((await admin.req('/admin')).status).toBe(200);
  });

  it('registers a dealer (pending) and blocks the dashboard for anonymous users', async () => {
    expect((await anon.req('/dashboard')).status).toBe(302);
    await signupDealer(dealer, `Magic City Motors ${tag}`);
    const dash = await dealer.html('/dashboard');
    expect(dash.status).toBe(200);
    expect(dash.text).toContain('pending review');
  });

  it('rejects invalid signups with field errors', async () => {
    const res = await anon.post('/signup', { name: 'X', email: 'not-an-email', password: 'short', terms: 'on' });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('Enter a valid email address');
    expect(text).toContain('Use at least 10 characters');
  });

  it('lets the dealer create a vehicle and upload a photo', async () => {
    const { camry } = await makeIds();
    const makesHtml = (await dealer.html('/dashboard/vehicles/new')).text;
    const toyotaId = makesHtml.match(/<option value="(\d+)"[^>]*>Toyota<\/option>/)![1];
    const res = await dealer.post('/dashboard/vehicles/new', {
      action: 'save', year: '2021', make_id: toyotaId, model_id: String(camry.id), trim: 'SE', condition: 'used', price: '21,995', mileage: '38500',
      vin: '4T1G11AK5MU000001', body_type: 'Sedan', fuel_type: 'Gasoline', transmission: 'Automatic', drivetrain: 'FWD',
      exterior_color: 'Blue', interior_color: 'Black', description: 'One-owner Camry with service records.', features: 'Backup camera\nApple CarPlay',
      title_status: 'clean', owners: '1', accident_free: '1', service_records: '1', status: 'active',
    });
    expect(res.status).toBe(303);
    const loc = res.headers.get('location')!;
    vehicleId = Number(loc.match(/vehicles\/(\d+)/)![1]);
    expect(vehicleId).toBeGreaterThan(0);

    const up = await dealer.req(`/api/vehicles/${vehicleId}/images`, { form: { large: new Blob([PNG], { type: 'image/png' }) }, json: true });
    expect(up.status).toBe(200);
    const bad = await dealer.req(`/api/vehicles/${vehicleId}/images`, { form: { large: new Blob(['<svg/>'], { type: 'image/png' }) }, json: true });
    expect(bad.status).toBe(400);

    const edit = await dealer.html(`/dashboard/vehicles/${vehicleId}`);
    expect(edit.text).toContain('Photos (1/30)');
    vehicleSlug = edit.text.match(/href="\/vehicles\/([a-z0-9-]+)"/)![1];
    expect(vehicleSlug).toMatch(/^2021-toyota-camry-se-birmingham-al/);
  });

  it('validates vehicle input server-side', async () => {
    const res = await dealer.post('/dashboard/vehicles/new', { action: 'save', year: '2021', make_id: '', model_id: '', price: 'abc', mileage: '', body_type: '', fuel_type: 'Gasoline', transmission: 'Automatic', drivetrain: 'FWD', condition: 'used', status: 'active' });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('Please fix the highlighted fields');
  });

  it('hides a pending dealer’s listings from the public', async () => {
    expect((await anon.req(`/vehicles/${vehicleSlug}`)).status).toBe(404);
  });

  it('prevents a dealer from editing another dealer’s vehicle', async () => {
    await signupDealer(dealer2, `Other Dealer ${tag}`);
    expect((await dealer2.req(`/dashboard/vehicles/${vehicleId}`)).status).toBe(404);
    const up = await dealer2.req(`/api/vehicles/${vehicleId}/images`, { form: { large: new Blob([PNG], { type: 'image/png' }) }, json: true });
    expect(up.status).toBe(403);
  });

  it('lets the admin approve the dealer, making listings public', async () => {
    const list = await admin.html(`/admin/dealers?q=${encodeURIComponent(`Magic City Motors ${tag}`)}`);
    dealerId = Number(list.text.match(/href="\/admin\/dealers\/(\d+)"/)![1]);
    const res = await admin.post('/admin/dealers', { ids: [String(dealerId)], status: 'active' });
    expect(res.status).toBe(303);
    const page = await anon.html(`/vehicles/${vehicleSlug}`);
    expect(page.status).toBe(200);
    expect(page.text).toContain('2021 Toyota Camry SE');
    expect(page.text).toContain('"@type":["Product","Car"]');
    dealerSlug = page.text.match(/href="\/dealers\/([a-z0-9-]+)"/)![1];
  });

  it('finds the vehicle through search, filters and SEO landing pages', async () => {
    const checks = [
      '/used-cars?make=toyota&model=camry',
      '/used-cars?zip=35203&radius=25&sort=distance',
      '/used-cars?max_price=25000&body=Sedan',
      '/used-cars/birmingham-al',
      '/used-cars/hoover-al',
      '/used-cars/toyota',
      '/used-cars/toyota/camry',
      '/used-cars/sedans',
      '/used-cars/birmingham-al/sedans',
      '/used-cars/under-30000',
    ];
    for (const path of checks) {
      const r = await anon.html(path);
      expect(r.status, path).toBe(200);
      expect(r.text, path).toContain(`/vehicles/${vehicleSlug}`);
    }
    const none = await anon.html('/used-cars?zip=36602&radius=10'); // Mobile — too far from Birmingham
    expect(none.text).not.toContain(`/vehicles/${vehicleSlug}`);
    const cheap = await anon.html('/used-cars/under-5000');
    expect(cheap.text).not.toContain(`/vehicles/${vehicleSlug}`);
  });

  it('accepts a lead from an anonymous shopper and notifies the dealer', async () => {
    const res = await anon.req('/api/leads', {
      form: { type: 'price', vehicle_id: String(vehicleId), name: 'Pat Shopper', email: `pat-${tag}@example.com`, phone: '205-555-0199', message: 'Best price?', consent: 'on', return_to: `/vehicles/${vehicleSlug}` },
      json: true,
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { ok: boolean }).ok).toBe(true);
    const leads = await dealer.html('/dashboard/leads');
    expect(leads.text).toContain('Pat Shopper');
    const leadId = Number(leads.text.match(/href="\/dashboard\/leads\/(\d+)"/)![1]);
    const upd = await dealer.post(`/dashboard/leads/${leadId}`, { action: 'status', status: 'qualified' });
    expect(upd.status).toBe(303);
    const reply = await dealer.post(`/dashboard/leads/${leadId}`, { action: 'reply', body: 'Out-the-door is $23,400.' });
    expect(reply.status).toBe(303);
    const detail = await dealer.html(`/dashboard/leads/${leadId}`);
    expect(detail.text).toContain('Out-the-door is $23,400.');
    const adminLeads = await admin.html('/admin/leads');
    expect(adminLeads.text).toContain('Pat Shopper');
    const outbox = await admin.html('/admin/messages');
    expect(outbox.text).toContain('New BamaMotors lead: Request Price');
    // Dealer B cannot open dealer A's lead.
    expect((await dealer2.req(`/dashboard/leads/${leadId}`)).status).toBe(404);
  });

  it('rejects leads without consent and silently drops honeypot spam', async () => {
    const bad = await anon.req('/api/leads', { form: { type: 'contact', vehicle_id: String(vehicleId), name: 'No Consent', email: 'x@example.com', return_to: '/' }, json: true });
    expect(bad.status).toBe(400);
    const spam = await anon.req('/api/leads', { form: { type: 'contact', vehicle_id: String(vehicleId), name: 'Bot', email: 'bot@example.com', consent: 'on', website: 'http://spam', return_to: '/' }, json: true });
    expect(spam.status).toBe(200);
    const leads = await dealer.html('/dashboard/leads');
    expect(leads.text).not.toContain('bot@example.com');
  });

  it('accepts a general financing inquiry routed to admins', async () => {
    const res = await anon.req('/api/leads', { form: { type: 'financing', name: 'Finance Fan', email: `fin-${tag}@example.com`, consent: 'on', return_to: '/financing' }, json: true });
    expect(res.status).toBe(200);
    const site = await admin.html('/admin/leads?site=1');
    expect(site.text).toContain('Finance Fan');
  });

  it('lets a shopper sign up, save a vehicle and review the dealer', async () => {
    const res = await shopper.post('/signup', { name: 'Sam Shopper', email: `sam-${tag}@example.com`, password: 'shopper-password-1', terms: 'on' });
    expect(res.status).toBe(303);
    const save = await shopper.req('/api/saved', { form: { vehicle_id: String(vehicleId), action: 'add' }, json: true });
    expect(save.status).toBe(200);
    const ids = (await (await shopper.req('/api/saved')).json()) as { ids: number[] };
    expect(ids.ids).toContain(vehicleId);
    const account = await shopper.html('/account');
    expect(account.text).toContain('Saved vehicles (1)');

    const review = await shopper.post('/api/reviews', { dealer_id: String(dealerId), rating: '5', title: 'Great experience', body: 'Honest pricing and a smooth test drive. Would buy again.' });
    expect(review.status).toBe(303);
    let page = await anon.html(`/dealers/${dealerSlug}`);
    expect(page.text).not.toContain('Great experience'); // pending moderation
    const mod = await admin.html('/admin/reviews');
    const reviewId = mod.text.match(/name="id" value="(\d+)"/)![1];
    await admin.post('/admin/reviews', { id: reviewId, action: 'approved' });
    page = await anon.html(`/dealers/${dealerSlug}`);
    expect(page.text).toContain('Great experience');
    expect(page.text).toContain('"aggregateRating"');
    expect(page.text).toContain('"@type":"AutoDealer"');
  });

  it('enforces role-based access control', async () => {
    expect((await shopper.req('/admin')).status).toBe(403);
    expect((await dealer.req('/admin/users')).status).toBe(403);
    expect((await shopper.req('/dashboard')).status).toBe(302);
    expect((await anon.req('/account')).status).toBe(302);
    const cross = await anon.req('/api/leads', { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'type=contact' });
    expect(cross.status).toBe(403);
  });

  it('supports plan requests, manual approval and featured slots', async () => {
    const req = await dealer.post('/dashboard/billing', { action: 'upgrade', plan: 'basic' });
    expect(req.status).toBe(303);
    const subs = await admin.html('/admin/subscriptions');
    const subId = subs.text.match(/name="sub_id" value="(\d+)"/)![1];
    await admin.post('/admin/subscriptions', { sub_id: subId, action: 'approve', record_payment: 'on' });
    const billing = await dealer.html('/dashboard/billing');
    expect(billing.text).toMatch(/Basic<\/div><div class="l">Current plan/);
    const feat = await dealer.post('/dashboard/vehicles', { vehicle_id: String(vehicleId), action: 'feature' });
    expect(feat.status).toBe(303);
    const home = await anon.html('/');
    expect(home.text).toContain('★ Featured');
  });

  it('enforces the free plan inventory limit', async () => {
    const { camry } = await makeIds();
    const html = (await dealer2.html('/dashboard/vehicles/new')).text;
    const toyotaId = html.match(/<option value="(\d+)"[^>]*>Toyota<\/option>/)![1];
    let last: Response | null = null;
    for (let i = 0; i < 11; i++) {
      last = await dealer2.post('/dashboard/vehicles/new', {
        action: 'save', year: '2018', make_id: toyotaId, model_id: String(camry.id), condition: 'used', price: String(9000 + i), mileage: '90000',
        body_type: 'Sedan', fuel_type: 'Gasoline', transmission: 'Automatic', drivetrain: 'FWD', status: 'draft',
      });
      if (i === 0) otherVehicleId = Number(last.headers.get('location')?.match(/vehicles\/(\d+)/)?.[1] ?? 0);
    }
    expect(otherVehicleId).toBeGreaterThan(0);
    expect(last!.status).toBe(200);
    expect(await last!.text()).toContain('plan allows 10');
  });

  it('lets admins manage vehicles, posts and settings', async () => {
    const bulk = await admin.post('/admin/vehicles', { ids: [String(otherVehicleId)], action: 'status_archived' });
    expect(bulk.status).toBe(303);
    const post = await admin.post('/admin/posts/new', {
      action: 'save', title: `Test Article ${tag} About Alabama Cars`, excerpt: 'A short excerpt that is long enough to pass validation.',
      body: '## Heading\n\nSome body text that is long enough to pass the validation rule for posts.\n\n<script>alert(1)</script>', category_id: '0', status: 'published',
      faq: 'Q: Is this a test?\nA: Yes it is.', meta_description: 'Test meta description.',
    });
    expect(post.status).toBe(303);
    const slug = `test-article-${tag}-about-alabama-cars`;
    const article = await anon.html(`/blog/${slug}`);
    expect(article.status).toBe(200);
    expect(article.text).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(article.text).not.toContain('<script>alert(1)</script>');
    expect(article.text).toContain('"@type":"FAQPage"');
    const settings = await admin.post('/admin/settings', { site_name: 'BamaMotors', tagline: 't', contact_email: 'hello@bamamotors.com', default_meta_description: 'x'.repeat(170), default_meta_keywords: '', featured_price_cents: '2900', featured_days: '30' });
    expect(settings.status).toBe(200);
    expect(await settings.text()).toContain('160 characters or fewer');
  });

  it('marks sold vehicles and keeps them out of search and sitemaps', async () => {
    const sm = await anon.html('/sitemap-vehicles.xml');
    expect(sm.text).toContain(`/vehicles/${vehicleSlug}`);
    await dealer.post('/dashboard/vehicles', { ids: [String(vehicleId)], action: 'bulk_status', status: 'sold' });
    const page = await anon.html(`/vehicles/${vehicleSlug}`);
    expect(page.status).toBe(200);
    expect(page.text).toContain('has been sold');
    expect(page.text).toContain('noindex');
    expect((await anon.html('/used-cars?make=toyota&model=camry')).text).not.toContain(`/vehicles/${vehicleSlug}`);
    expect((await anon.html('/sitemap-vehicles.xml')).text).not.toContain(`/vehicles/${vehicleSlug}`);
  });

  it('supports password reset without account enumeration', async () => {
    const a = await anon.post('/forgot-password', { email: `sam-${tag}@example.com` });
    const b = await anon.post('/forgot-password', { email: `nobody-${tag}@example.com` });
    expect(await a.text()).toContain('If an account exists');
    expect(await b.text()).toContain('If an account exists');
    const outbox = await admin.html('/admin/messages');
    const token = outbox.text.match(/reset-password\?token=([A-Za-z0-9_-]+)/)![1];
    const reset = await anon.post(`/reset-password?token=${token}`, { password: 'brand-new-password-9', confirm: 'brand-new-password-9' });
    expect(reset.status).toBe(303);
    const login = await new Client().post('/login', { email: `sam-${tag}@example.com`, password: 'brand-new-password-9' });
    expect(login.status).toBe(303);
    const reuse = await anon.post(`/reset-password?token=${token}`, { password: 'another-password-9', confirm: 'another-password-9' });
    expect(await reuse.text()).toContain('invalid or has expired');
  });
});
