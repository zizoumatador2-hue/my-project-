import { test, expect } from '@playwright/test';
import { noHorizontalOverflow } from './helpers';

const SHOTS = process.env.SHOTS_DIR ?? 'test-results/shots';

test.describe('public site', () => {
  test('homepage: hero search, sections, no overflow, no console errors', async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Used Cars for Sale in Alabama');
    await expect(page.getByRole('button', { name: /Find Your Car/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Featured used cars in Alabama' })).toBeVisible();
    expect(await noHorizontalOverflow(page)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-home.png`, fullPage: true });
    expect(errors).toEqual([]);
  });

  test('search → filters → vehicle detail → request price lead', async ({ page }, info) => {
    await page.goto('/');
    await page.selectOption('#hero-make', 'ford');
    await expect(page.locator('#hero-model option', { hasText: 'F-150' })).toBeAttached();
    await page.selectOption('#hero-model', 'f-150');
    await page.getByRole('button', { name: /Find Your Car/ }).click();
    await expect(page).toHaveURL(/\/used-cars\?make=ford&model=f-150/);
    await expect(page.locator('.vcard')).toHaveCount(1);
    expect(await noHorizontalOverflow(page)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-search.png`, fullPage: true });

    await page.locator('.vcard-title a').first().click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('2020 Ford F-150 XLT SuperCrew');
    await expect(page.locator('[data-gallery-img]')).toBeVisible();
    // Gallery navigation
    await page.locator('[data-thumb="1"]').click();
    await expect(page.locator('[data-gallery-count]')).toHaveText('2 / 2');
    expect(await noHorizontalOverflow(page)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-vehicle.png`, fullPage: true });

    await page.locator('aside a[data-open-lead="price"]').click();
    await expect(page.locator('[data-lead-type="price"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#lead-form-message')).toHaveValue(/out-the-door price/);
    await page.fill('#lead-form-name', `E2E ${info.project.name}`);
    await page.fill('#lead-form-email', `e2e-${info.project.name}@example.com`);
    await page.locator('#lead-form input[name="consent"]').check();
    await page.locator('[data-lead-submit]').click();
    await expect(page.locator('[data-lead-success]')).toBeVisible();
  });

  test('lead form shows validation errors without consent', async ({ page }) => {
    await page.goto('/used-cars/ford/f-150');
    await page.locator('.vcard-title a').first().click();
    await page.fill('#lead-form-name', 'No Consent');
    await page.fill('#lead-form-email', 'nc@example.com');
    await page.locator('[data-lead-submit]').click();
    await expect(page.locator('[data-lead-error]')).toContainText('consent');
  });

  test('landing pages and guides render and fit the screen', async ({ page }, info) => {
    for (const [path, h1] of [
      ['/used-cars/hoover-al', 'Used Cars for Sale in Hoover, AL'],
      ['/used-cars/trucks', 'Used Trucks for Sale in Alabama'],
      ['/used-cars/under-10000', 'Used Cars Under $10,000 for Sale in Alabama'],
      ['/dealers', 'Car Dealerships in Alabama'],
      ['/blog/how-to-buy-a-used-car-in-alabama', 'How to Buy a Used Car in Alabama'],
      ['/financing', 'Car financing in Alabama'],
      ['/for-dealers', 'Sell more cars to Alabama shoppers'],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(h1);
      expect(await noHorizontalOverflow(page), path).toBeLessThanOrEqual(0);
    }
    await page.goto('/used-cars/hoover-al');
    await expect(page.locator('.snippet')).toContainText('used cars for sale in Hoover, AL');
    await expect(page.locator('table').first()).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-city.png`, fullPage: true });
    await page.goto('/blog/how-to-buy-a-used-car-in-alabama');
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-article.png`, fullPage: true });
  });

  test('financing calculator computes a payment', async ({ page }) => {
    await page.goto('/financing');
    await page.fill('#c-price', '20000');
    await page.fill('#c-down', '0');
    await page.fill('#c-apr', '6');
    await page.selectOption('#c-term', '60');
    await expect(page.locator('[data-c-monthly]')).toHaveText('$387');
  });

  test('mobile navigation opens', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile only');
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.locator('#mobile-nav')).toBeVisible();
    await page.locator('#mobile-nav').getByRole('link', { name: 'Dealers', exact: true }).click();
    await expect(page).toHaveURL(/\/dealers$/);
  });

  test('saving requires sign-in', async ({ page }) => {
    await page.goto('/used-cars');
    await page.locator('.save-btn').first().click();
    await expect(page).toHaveURL(/\/login\?next=.*reason=save/);
  });
});

test.describe('dashboards', () => {
  test('dealer dashboard and admin console render on this viewport', async ({ page }, info) => {
    await page.goto('/login');
    await page.fill('#email', 'e2e-dealer@bamamotors.test');
    await page.fill('#password', 'e2e-dealer-password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Riverchase');
    expect(await noHorizontalOverflow(page)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-dealer-dashboard.png`, fullPage: true });
    await page.goto('/dashboard/leads');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leads');
    expect(await noHorizontalOverflow(page)).toBeLessThanOrEqual(0);
    await page.goto('/dashboard/vehicles');
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-dealer-inventory.png`, fullPage: true });
    await page.context().clearCookies();
    await page.goto('/login');
    await page.fill('#email', 'admin@bamamotors.test');
    await page.fill('#password', 'admin-password-123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin/);
    expect(await noHorizontalOverflow(page)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-admin.png`, fullPage: true });
    await page.goto('/admin/reports');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Reports');
  });
});
