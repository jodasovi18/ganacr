import { test, expect } from '@playwright/test';
import { loginAsTestUser, navegarALote } from './helpers';

/**
 * End-to-end tests for the Pesos tab feature.
 * Requires at least one lote with at least one animal in the test account.
 * The seed data creates lotes with animals — use those.
 */

test.describe('Tab Pesos', () => {
  test.setTimeout(30_000);

  test.beforeEach(async ({ page }, testInfo) => {
    const TEST_EMAIL = process.env.TEST_EMAIL ?? '';
    const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      testInfo.skip(true, 'Set TEST_EMAIL and TEST_PASSWORD env vars to run Pesos tab tests.');
    }

    await loginAsTestUser(page);
    await navegarALote(page);
  });

  test('Pesos tab appears and is clickable', async ({ page }) => {
    // The Pesos tab button should be visible
    const pesosTab = page.getByRole('button', { name: /Pesos/i });
    await expect(pesosTab).toBeVisible();

    // Click it
    await pesosTab.click();

    // Verify the semáforo list appears
    await expect(page.locator('.pesos-animal-list')).toBeVisible();
  });

  test('semáforo list shows animal rows', async ({ page }) => {
    await page.getByRole('button', { name: /Pesos/i }).click();
    await page.waitForSelector('.pesos-animal-list', { timeout: 5000 });

    // At least one animal row should appear
    const rows = page.locator('.pesos-animal-row');
    await expect(rows.first()).toBeVisible();

    // Each row has a peso value (formatKg produces "X kg")
    await expect(rows.first().locator('.pesos-animal-peso')).toContainText('kg');
  });

  test('clicking an animal row opens AnimalPesoModal', async ({ page }) => {
    await page.getByRole('button', { name: /Pesos/i }).click();
    await page.waitForSelector('.pesos-animal-row', { timeout: 5000 });

    // Click the first animal
    await page.locator('.pesos-animal-row').first().click();

    // The modal should open
    await expect(page.locator('.animal-peso-modal')).toBeVisible();

    // Modal header should contain the arete number
    await expect(page.locator('.animal-peso-modal .modal-header h2')).toBeVisible();
  });

  test('AnimalPesoModal shows stat cards or empty state', async ({ page }) => {
    await page.getByRole('button', { name: /Pesos/i }).click();
    await page.waitForSelector('.pesos-animal-row', { timeout: 5000 });
    await page.locator('.pesos-animal-row').first().click();
    await page.waitForSelector('.animal-peso-modal', { timeout: 3000 });

    // Stat cards appear (either pesos exist or the empty state)
    const hasStats = await page
      .locator('.peso-stat-grid')
      .isVisible()
      .catch(() => false);
    const hasEmpty = await page
      .locator('.peso-primer-estado')
      .isVisible()
      .catch(() => false);

    expect(hasStats || hasEmpty).toBe(true);
  });

  test('AnimalPesoModal can be closed', async ({ page }) => {
    await page.getByRole('button', { name: /Pesos/i }).click();
    await page.waitForSelector('.pesos-animal-row', { timeout: 5000 });
    await page.locator('.pesos-animal-row').first().click();
    await page.waitForSelector('.animal-peso-modal', { timeout: 3000 });

    // Close via × button
    await page.locator('.animal-peso-modal .modal-close').click();
    await expect(page.locator('.animal-peso-modal')).not.toBeVisible();
  });

  test('lote avg chart renders in Pesos tab', async ({ page }) => {
    await page.getByRole('button', { name: /Pesos/i }).click();
    await page.waitForSelector('.pesos-avg-card', { timeout: 5000 });

    // Either a chart or the empty message
    const hasChart = await page
      .locator('.lote-avg-chart')
      .isVisible()
      .catch(() => false);
    const hasEmptyMsg = await page
      .locator('.chart-empty-msg')
      .isVisible()
      .catch(() => false);

    expect(hasChart || hasEmptyMsg).toBe(true);
  });
});

test.describe('Threshold configuration', () => {
  test.setTimeout(30_000);

  test.beforeEach(async ({ page }, testInfo) => {
    const TEST_EMAIL = process.env.TEST_EMAIL ?? '';
    const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      testInfo.skip(true, 'Set TEST_EMAIL and TEST_PASSWORD env vars to run Pesos tab tests.');
    }

    await loginAsTestUser(page);
  });

  test('settings button opens threshold modal', async ({ page }) => {
    const ajustesBtn = page.locator('button[title="Ajustes de la finca"]');
    await expect(ajustesBtn).toBeVisible();
    await ajustesBtn.click();

    await expect(page.locator('.modal')).toBeVisible();
    await expect(page.getByText(/días sin pesar/i).first()).toBeVisible();
  });

  test('saving thresholds persists to Firestore', async ({ page }) => {
    await page.locator('button[title="Ajustes de la finca"]').click();
    await page.waitForSelector('.modal', { timeout: 3000 });

    // Change amarillo to 10, rojo to 25
    const inputs = page.locator('.modal input[type="number"]');
    await inputs.nth(0).fill('10');
    await inputs.nth(1).fill('25');

    await page.getByRole('button', { name: /Guardar/i }).click();

    // Modal closes after save
    await expect(page.locator('.modal')).not.toBeVisible({ timeout: 5000 });

    // Re-open and verify values persisted
    await page.locator('button[title="Ajustes de la finca"]').click();
    await page.waitForSelector('.modal', { timeout: 3000 });
    await expect(inputs.nth(0)).toHaveValue('10');
    await expect(inputs.nth(1)).toHaveValue('25');

    // Restore defaults for cleanup
    await inputs.nth(0).fill('15');
    await inputs.nth(1).fill('30');
    await page.getByRole('button', { name: /Guardar/i }).click();
  });
});
