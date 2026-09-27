import { expect, test } from '@playwright/test';
import { person, shot, signup, uid } from './helpers';

test('server errors show a retryable error state; transient failures are retried', async ({ browser }, info) => {
  const page = await person(browser, info.project);
  let calls = 0;
  await page.route('**/api/listings?*', async (route) => {
    calls++;
    if (calls <= 3) return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"unavailable","message":"الخادم غير متاح حاليًا."}' });
    return route.continue();
  });
  await page.goto('/listings');
  await expect(page.getByText('تعذّر التحميل')).toBeVisible({ timeout: 20000 });
  expect(calls).toBe(3); // one request + two automatic retries with backoff
  await shot(page, `${info.project.name}-error-state`);
  await page.getByRole('button', { name: 'إعادة المحاولة' }).click();
  await expect(page.getByText('تعذّر التحميل')).toHaveCount(0);
});

test('offline: banner appears and mutations fail with a clear message', async ({ browser }, info) => {
  const page = await person(browser, info.project);
  await signup(page, 'مستخدم الشبكة', `net-${uid()}@example.test`);
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/account');
  await expect(page.getByLabel('كلمة المرور الحالية')).toBeVisible();
  await page.context().setOffline(true);
  await expect(page.getByText(/أنت غير متصل بالإنترنت/)).toBeVisible();
  await page.getByLabel('كلمة المرور الحالية').fill('Str0ngPassw0rd!');
  await page.getByLabel('كلمة المرور الجديدة').fill('N3wPassw0rd!!');
  await page.getByRole('button', { name: 'تغيير' }).click();
  await expect(page.getByText(/لا يوجد اتصال بالإنترنت/)).toBeVisible();
  await shot(page, `${info.project.name}-offline`);
  await page.context().setOffline(false);
  await expect(page.getByText(/أنت غير متصل بالإنترنت/)).toHaveCount(0);
});

test('a page chunk that fails to load (connection drop) shows a retry, not a blank screen', async ({ browser }, info) => {
  const page = await person(browser, info.project);
  await page.goto('/');
  await page.route('**/assets/Policies-*.js', (r) => r.abort('internetdisconnected'));
  await page.getByRole('link', { name: 'الشروط' }).first().click();
  await expect(page.getByText('تعذّر تحميل الصفحة')).toBeVisible();
  await shot(page, `${info.project.name}-chunk-error`);
});

test('slow network (3G-like latency) still completes page loads', async ({ browser }, info) => {
  const page = await person(browser, info.project);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: (750 * 1024) / 8, uploadThroughput: (250 * 1024) / 8 });
  await page.goto('/listings');
  await expect(page.getByRole('heading', { name: 'تصفح الحسابات الموثّقة' })).toBeVisible({ timeout: 30000 });
  await page.goto('/policies/disclaimer');
  await expect(page.getByRole('heading', { name: 'إخلاء المسؤولية' })).toBeVisible({ timeout: 30000 });
  await shot(page, `${info.project.name}-disclaimer`, true);
});

test('unauthorized users are redirected and blocked from admin', async ({ browser }, info) => {
  const page = await person(browser, info.project);
  await page.goto('/deals');
  await expect(page).toHaveURL(/\/login\?next=%2Fdeals/);
  await signup(page, 'فضولي', `nosy-${uid()}@example.test`);
  await page.goto('/admin');
  await expect(page.getByText('ليست لديك صلاحية')).toBeVisible();
});
