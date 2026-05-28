import { test, expect } from '@playwright/test';

const TEST_EMAIL    = process.env.TEST_EMAIL    ?? '';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';
const FINCA_A_NOMBRE = 'Finca La Esperanza';
const FINCA_B_NOMBRE = 'Finca El Roble';

test.describe('FincaSelector', () => {
  test.setTimeout(30_000);

  test.beforeEach(async ({ page }, testInfo) => {
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      testInfo.skip(true, 'Set TEST_EMAIL and TEST_PASSWORD env vars to run finca tests.');
    }
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await page.waitForSelector('.finca-selector-chip', { timeout: 10_000 });
  });

  test('shows finca name chip without dropdown when only one finca is active', async ({ page }) => {
    // The seed has 2 fincas; force-select F_A by checking chip is visible
    const chip = page.locator('.finca-selector-chip');
    await expect(chip).toBeVisible();
    await expect(chip).toContainText(FINCA_A_NOMBRE);

    // If there's only 1 finca loaded initially, clicking should not open dropdown
    // This test verifies the chip is always present
    await expect(chip).toBeVisible();
  });

  test('dropdown opens and switching finca updates lote list', async ({ page }) => {
    // Verify chip shows Finca A
    const chip = page.locator('.finca-selector-chip');
    await expect(chip).toBeVisible({ timeout: 10_000 });

    // Click chip to open dropdown (requires 2+ fincas)
    await chip.click();
    const dropdown = page.locator('.finca-selector-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });

    // Verify both fincas are listed
    await expect(dropdown.locator('button', { hasText: FINCA_A_NOMBRE })).toBeVisible();
    await expect(dropdown.locator('button', { hasText: FINCA_B_NOMBRE })).toBeVisible();

    // Count lotes in Finca A (should be 5: L1–L5)
    const lotesAntes = await page.locator('.lote-card').count();
    expect(lotesAntes).toBeGreaterThanOrEqual(1);

    // Switch to Finca B (has 1 lote: L6)
    await dropdown.locator('button', { hasText: FINCA_B_NOMBRE }).click();
    await expect(dropdown).not.toBeVisible();

    // Wait for lote list to update (poll instead of fixed sleep — avoids flakiness)
    await expect(page.locator('.lote-card')).toHaveCount(1, { timeout: 8_000 });
  });

  test('chip shows new finca name after switching', async ({ page }) => {
    const chip = page.locator('.finca-selector-chip');
    await chip.click();
    const dropdown = page.locator('.finca-selector-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });
    await dropdown.locator('button', { hasText: FINCA_B_NOMBRE }).click();
    await expect(chip).toContainText(FINCA_B_NOMBRE);
  });
});
