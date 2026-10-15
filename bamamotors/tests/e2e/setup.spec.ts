import { test, expect } from '@playwright/test';
import { ADMIN, DEALER, login, makePhoto } from './helpers';

/** Creates real data through the UI: admin, an approved dealer, and vehicles with photos. */
test('seed through the UI: admin, dealer, inventory with photos', async ({ page, request }) => {
  // Admin (bootstrap email) — create or reuse.
  await page.goto('/signup');
  await page.fill('#name', 'Site Admin');
  await page.fill('#email', ADMIN.email);
  await page.fill('#password', ADMIN.password);
  await page.check('input[name="terms"]');
  await page.click('button[type="submit"]');
  if (page.url().includes('/signup')) await login(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(/\/(account|admin)/);
  await page.context().clearCookies();

  // Dealer sign-up via the For Dealers page.
  await page.goto('/for-dealers');
  const exists = (await request.get('/dealers?q=Riverchase')).ok() && (await (await request.get('/dealers?q=Riverchase')).text()).includes('Riverchase Auto Sales');
  if (!exists) {
    await page.fill('#ds-dealer_name', DEALER.name);
    await page.fill('#ds-dealer_phone', '(205) 555-0142');
    await page.fill('#ds-address', '2000 Riverchase Galleria');
    await page.fill('#ds-city', 'Hoover');
    await page.fill('#ds-zip', '35244');
    await page.fill('#ds-name', 'Jordan Lee');
    await page.fill('#ds-email', DEALER.email);
    await page.fill('#ds-password', DEALER.password);
    await page.check('input[name="terms"]');
    await page.click('button:has-text("Create dealer account")');
    if (page.url().includes('/signup')) await login(page, DEALER.email, DEALER.password);
  } else {
    await login(page, DEALER.email, DEALER.password);
  }
  await expect(page).toHaveURL(/\/dashboard/);

  const cars = [
    { make: 'Ford', model: 'F-150', year: '2020', trim: 'XLT SuperCrew', price: '31995', miles: '58210', body: 'Truck', drive: '4WD', hue: 210 },
    { make: 'Honda', model: 'CR-V', year: '2019', trim: 'EX', price: '22450', miles: '47120', body: 'SUV', drive: 'AWD', hue: 0 },
    { make: 'Toyota', model: 'Corolla', year: '2017', trim: 'LE', price: '9800', miles: '98800', body: 'Sedan', drive: 'FWD', hue: 120 },
  ];
  const inv = await page.goto('/dashboard/vehicles');
  const existing = (await inv!.text()).match(/F-150/);
  if (!existing) {
    for (const car of cars) {
      await page.goto('/dashboard/vehicles/new');
      await page.selectOption('#v-year', car.year);
      await page.selectOption('#v-make', { label: car.make });
      await expect(page.locator('#v-model option', { hasText: car.model }).first()).toBeAttached();
      await page.selectOption('#v-model', { label: car.model });
      await page.fill('#v-trim', car.trim);
      await page.fill('#v-price', car.price);
      await page.fill('#v-mileage', car.miles);
      await page.selectOption('#v-body', car.body);
      await page.selectOption('#v-drive', car.drive);
      await page.selectOption('#v-ext', 'White');
      await page.fill('#v-desc', `Clean ${car.year} ${car.make} ${car.model} with service records. Test listing created by the automated test suite.`);
      await page.fill('#v-features', 'Backup camera\nBluetooth\nCruise control');
      await page.selectOption('#v-title', 'clean');
      await page.click('button:has-text("Save & add photos")');
      await expect(page).toHaveURL(/\/dashboard\/vehicles\/\d+/);
      const photos = [await makePhoto(page, car.hue), await makePhoto(page, car.hue + 60)];
      await page.setInputFiles('[data-files]', photos.map((buffer, i) => ({ name: `photo-${i}.png`, mimeType: 'image/png', buffer })));
      await expect(page.getByRole('heading', { name: 'Photos (2/30)' })).toBeVisible({ timeout: 20_000 });
    }
  }

  // Admin approves the dealer.
  await page.context().clearCookies();
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto('/admin/dealers?q=Riverchase');
  await page.locator('input[name="ids"]').first().check();
  await page.selectOption('#bs', 'active');
  await page.click('button:has-text("Apply to selected")');
  await expect(page.locator('td .badge-ok', { hasText: 'active' }).first()).toBeVisible();
});
