import { test, expect } from '@playwright/test';

test('homepage communicates purpose and links to tools', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Make Smarter Money Decisions');
  await expect(page.getByRole('link', { name: 'Explore Financial Tools' })).toHaveAttribute('href', '/calculators/');
  await expect(page.locator('#personal-finance-guide')).toBeVisible();
});

test('budget calculator recalculates as the user types', async ({ page }) => {
  await page.goto('/calculators/budget/');
  const out = page.locator('[data-out="remaining"]');
  await expect(out).toHaveText('$980');
  await page.fill('#income', '6000');
  await expect(out).toHaveText('$1,780');
  await expect(page).toHaveURL(/income=6000/);
  await page.fill('#income', 'abc');
  await expect(page.locator('#income')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('[data-invalid-msg]')).toBeVisible();
});

test('loan calculator matches the amortization formula', async ({ page }) => {
  await page.goto('/calculators/loan/?amount=10000&apr=10&term=36');
  await expect(page.locator('[data-out="payment"]')).toHaveText('$322.67');
});

test('mortgage calculator drops PMI at 20% down', async ({ page }) => {
  await page.goto('/calculators/mortgage/');
  await page.fill('#down', '80000');
  await expect(page.locator('[data-out="pmi"]')).toHaveText('Not required');
});

test('credit card calculator warns when payment never covers interest', async ({ page }) => {
  await page.goto('/calculators/credit-card-payoff/');
  await page.fill('#payment', '50');
  await expect(page.locator('[data-out="months"]')).toHaveText('Never');
  await expect(page.locator('[data-out="warn"]')).toBeVisible();
});

test('search finds calculators and filters by type', async ({ page }) => {
  await page.goto('/search/?q=mortgage');
  await expect(page.locator('#results li').first()).toBeVisible();
  await page.getByRole('button', { name: /Calculators/ }).click();
  const types = await page.locator('#results .type').allTextContents();
  expect(types.length).toBeGreaterThan(0);
  expect(new Set(types)).toEqual(new Set(['Calculator']));
});

test('newsletter form validates consent before submitting', async ({ page }) => {
  await page.goto('/newsletter/');
  const form = page.locator('form.nl-form').first();
  await form.locator('input[type="email"]').fill('reader@example.com');
  await form.getByRole('button', { name: 'Subscribe' }).click();
  await expect(form.locator('.form-status')).toContainText('confirm you would like');
});

test('comparison pages label every provider link', async ({ page }) => {
  await page.goto('/best/high-yield-savings-accounts/');
  const links = page.locator('.product-foot a.btn');
  expect(await links.count()).toBeGreaterThanOrEqual(3);
  for (const l of await links.all()) await expect(l).toHaveAttribute('rel', /noopener/);
  await expect(page.locator('.disclosure').first()).toContainText('Advertiser disclosure');
});

test('mobile menu opens and navigates', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only');
  await page.goto('/');
  await page.getByLabel('Open menu').click();
  await page.getByRole('navigation', { name: 'Mobile' }).getByRole('link', { name: 'Credit' }).click();
  await expect(page).toHaveURL('/credit/');
});
