import { expect, type Browser, type Page } from '@playwright/test';
import { deflateSync } from 'node:zlib';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export const SHOTS = process.env.SHOTS_DIR || join(tmpdir(), 'tt-shots');
mkdirSync(SHOTS, { recursive: true });

export const uid = () => Math.random().toString(36).slice(2, 8);
const rand = () => Math.floor(Math.random() * 250) + 1;

/** Each simulated person gets its own browser context and client IP (so per-IP rate limits behave like production). */
export async function person(browser: Browser, project: { use: any }) {
  const ctx = await browser.newContext({ ...project.use, extraHTTPHeaders: { 'CF-Connecting-IP': `10.${rand()}.${rand()}.${rand()}` } });
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept());
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  (page as any).__errors = errors;
  return page;
}

export async function shot(page: Page, name: string, full = false) {
  await page.waitForTimeout(250);
  // Layout guard: no screen may scroll horizontally (RTL overflow bugs show up here first).
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(sw, `horizontal overflow on ${name}`).toBeLessThanOrEqual(cw + 1);
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: full });
}

/** Minimal real PNG (solid colour, unique per seed) so evidence renders in the admin console. */
export function pngFile(seed: string): string {
  const w = 64, h = 48;
  const c = [...seed].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = (c >> 16) & 255; raw[o + 1] = ((c >> 8) & 255) ^ (y * 3); raw[o + 2] = (c & 255) ^ (x * 2);
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => { let k = n; for (let i = 0; i < 8; i++) k = k & 1 ? 0xedb88320 ^ (k >>> 1) : k >>> 1; return k >>> 0; });
  const crc = (b: Buffer) => { let x = 0xffffffff; for (const v of b) x = crcTable[(x ^ v) & 255] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (type: string, data: Buffer) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([len, td, cr]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  const p = join(SHOTS, `ev-${seed}.png`);
  writeFileSync(p, png);
  return p;
}

export async function signup(page: Page, name: string, email: string, password = 'Str0ngPassw0rd!') {
  await page.goto('/signup');
  await page.getByLabel('الاسم الظاهر').fill(name);
  await page.getByLabel('البريد الإلكتروني').fill(email);
  await page.getByLabel('كلمة المرور').fill(password);
  await page.getByRole('checkbox').nth(0).check();
  await page.getByRole('checkbox').nth(1).check();
  await page.getByRole('button', { name: 'إنشاء الحساب' }).click();
}

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('البريد الإلكتروني').fill(email);
  await page.getByLabel('كلمة المرور').fill(password);
  await page.getByRole('button', { name: 'دخول', exact: true }).click();
}

export const ADMIN = { email: 'admin@trusttransfer.test', password: 'Adm1nPassw0rd!!' };

/** Reuses the ops session across runs (logging in every run would trip the per-account login rate limit — by design). */
export async function opsLogin(page: Page) {
  const stateFile = join(SHOTS, 'ops-cookies.json');
  if (existsSync(stateFile)) {
    await page.context().addCookies(JSON.parse(readFileSync(stateFile, 'utf8')));
    await page.goto('/admin');
    if (await page.getByRole('navigation', { name: 'لوحة العمليات' }).isVisible().catch(() => false)) return;
    await page.waitForTimeout(1500);
    if (await page.getByRole('navigation', { name: 'لوحة العمليات' }).isVisible().catch(() => false)) return;
  }
  await login(page, ADMIN.email, ADMIN.password);
  const ok = await page.waitForURL(/\/$/, { timeout: 6000 }).then(() => true, () => false);
  if (!ok) await signup(page, 'فريق العمليات', ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(/\/$/);
  writeFileSync(stateFile, JSON.stringify(await page.context().cookies()));
}

export async function createListing(page: Page, o: { handle: string; title: string; followers: string; price: string }) {
  await page.goto('/sell/new');
  await page.getByLabel('المنصة').selectOption('instagram');
  await page.getByLabel('معرّف الحساب').fill(o.handle);
  await page.getByLabel('عنوان الإعلان').fill(o.title);
  await page.getByLabel('الوصف').fill('حساب متخصص في وصفات الطبخ المنزلي، محتوى أصلي بالكامل، وجمهور خليجي متفاعل منذ سنوات.');
  await page.getByLabel('عدد المتابعين').fill(o.followers);
  await page.getByLabel('معدل التفاعل (٪)').fill('4.2');
  await page.getByLabel('المجال').selectOption('food');
  await page.getByLabel('السعر (دولار أمريكي)').fill(o.price);
  await page.getByRole('button', { name: 'حفظ والمتابعة' }).click();
  await expect(page.getByLabel('رمز التحقق', { exact: true })).toBeVisible();
  const files = page.locator('input[type=file]');
  for (let i = 0; i < 3; i++) {
    await files.nth(i).setInputFiles(pngFile(`${o.handle}-${i}`));
    await expect(page.getByText('تم رفع الملف وتشفيره').last()).toBeVisible();
  }
  const id = page.url().split('/').pop()!;
  return id;
}

export async function submitListing(page: Page) {
  await page.getByRole('checkbox', { name: /أقرّ بأنني المالك الشرعي/ }).check();
  await page.getByRole('button', { name: 'إرسال للمراجعة' }).click();
  await expect(page.getByText('الإعلان قيد المراجعة')).toBeVisible();
}

export async function approveListing(ops: Page, id: string, followers: string) {
  await ops.goto(`/admin/reviews/${id}`);
  await ops.getByRole('button', { name: 'حجز للمراجعة' }).click();
  await expect(ops.getByText('أنت المراجع المكلّف')).toBeVisible();
  await expect(ops.getByRole('button', { name: 'اعتماد ونشر' })).toBeVisible();
  await expect(ops.getByText('الفحوص الآلية قيد التنفيذ')).toHaveCount(0, { timeout: 30000 });
  await ops.getByLabel(/عدد المتابعين كما يظهر/).fill(followers);
  await ops.getByRole('checkbox', { name: /تحققت بنفسي/ }).check();
  await ops.getByRole('checkbox', { name: /لقطة الإعدادات تُظهر/ }).check();
  await ops.getByLabel('ملاحظة للبائع (تظهر له)').fill('تم التحقق من الرمز واللقطات ومطابقة الأرقام.');
  await ops.getByRole('button', { name: 'اعتماد ونشر' }).click();
  await expect(ops.getByText('تم تسجيل القرار')).toBeVisible();
}

export async function buy(buyer: Page, listingId: string) {
  await buyer.goto(`/listings/${listingId}`);
  await buyer.getByRole('button', { name: 'اشترِ عبر الضمان' }).click();
  await buyer.getByRole('dialog').getByRole('checkbox').check();
  await buyer.getByRole('button', { name: 'المتابعة للدفع' }).click();
  await expect(buyer).toHaveURL(/checkout\/sandbox/);
  const dealId = buyer.url().split('/checkout/sandbox/')[1].split('?')[0];
  return dealId;
}

export async function pay(buyer: Page) {
  await buyer.getByRole('button', { name: /^ادفع/ }).click();
  await expect(buyer.getByText('المبلغ محتجز لدى الضمان').first()).toBeVisible();
}
