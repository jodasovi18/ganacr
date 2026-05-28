import { Page } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL ?? '';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';

/**
 * Logs in using test credentials from environment variables.
 * Prerequisites: TEST_EMAIL and TEST_PASSWORD must be set.
 */
export async function loginAsTestUser(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
  await page.waitForSelector('.finca-selector-chip', { timeout: 10_000 });
}

/**
 * Navigates to the first lote shown on the Dashboard.
 * Assumes user is already on dashboard (after login).
 */
export async function navegarALote(page: Page) {
  // Wait for lote cards to appear
  await page.waitForSelector('.lote-card', { timeout: 10_000 });
  // Click the first lote link
  await page.locator('.lote-card').first().click();
  await page.waitForURL(/\/lote\//);
}
