import type { Page } from '@playwright/test';

export const ADMIN = { email: 'admin@bamamotors.test', password: 'admin-password-123' };
export const DEALER = { email: 'e2e-dealer@bamamotors.test', password: 'e2e-dealer-password', name: 'Riverchase Auto Sales (E2E)' };

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith('/login')), page.click('button[type="submit"]')]);
}

/** Generates a car-photo-sized PNG in the browser (tests the client-side resize pipeline). */
export async function makePhoto(page: Page, hue: number): Promise<Buffer> {
  const dataUrl = await page.evaluate((h) => {
    const c = document.createElement('canvas');
    c.width = 2400; c.height = 1800;
    const g = c.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 2400, 1800);
    grad.addColorStop(0, `hsl(${h} 60% 45%)`); grad.addColorStop(1, `hsl(${h + 40} 60% 20%)`);
    g.fillStyle = grad; g.fillRect(0, 0, 2400, 1800);
    g.fillStyle = 'rgba(255,255,255,.85)'; g.font = 'bold 160px sans-serif'; g.fillText('TEST PHOTO', 420, 960);
    return c.toDataURL('image/png');
  }, hue);
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

export async function noHorizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}
