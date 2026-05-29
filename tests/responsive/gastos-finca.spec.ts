import { test, expect } from '@playwright/test';

const EMAIL    = process.env.TEST_EMAIL    ?? '';
const PASSWORD = process.env.TEST_PASSWORD ?? '';

test.describe('Gastos a nivel de finca', () => {
  test.skip(!EMAIL || !PASSWORD, 'TEST_EMAIL / TEST_PASSWORD not set');
  test.setTimeout(30_000);

  async function login(page: import('@playwright/test').Page) {
    await page.goto('/login');
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    // Wait for dashboard — finca chip appears once auth + finca data load
    await page.waitForSelector('.finca-selector-chip', { timeout: 20_000 });
  }

  async function goToGastosFincaTab(page: import('@playwright/test').Page) {
    // Tab button text includes emoji: "💸 Gastos de Finca (N)"
    await page.locator('button.dashboard-tab', { hasText: 'Gastos de Finca' }).click();
    await expect(page.locator('.gastos-finca-tab')).toBeVisible({ timeout: 8_000 });
  }

  async function ensureVacunacionGasto(page: import('@playwright/test').Page) {
    const cardSelector = '.gasto-finca-card';
    const matchText    = 'Vacunación E2E test';
    const existing = page.locator(cardSelector, { hasText: matchText });
    if ((await existing.count()) > 0) return;

    await page.click('button:has-text("+ Nuevo gasto")');
    await expect(page.locator('.gasto-finca-modal')).toBeVisible({ timeout: 8_000 });
    await page.fill('input[placeholder="Ej: Vacunación masiva"]', matchText);
    await page.locator('.gasto-finca-modal').locator('input[type="number"]').fill('150000');
    await page.click('button:has-text("Registrar gasto")');
    await expect(page.locator('.gasto-finca-modal')).not.toBeVisible({ timeout: 10_000 });
  }

  test('creates a finca gasto and distributes it across lotes', async ({ page }) => {
    await login(page);
    await goToGastosFincaTab(page);

    // Open modal
    await page.click('button:has-text("+ Nuevo gasto")');
    await expect(page.locator('.gasto-finca-modal')).toBeVisible({ timeout: 8_000 });

    // Fill form
    await page.fill('input[placeholder="Ej: Vacunación masiva"]', 'Vacunación E2E test');
    await page.locator('.gasto-finca-modal').locator('input[type="number"]').fill('150000');
    // fecha has a default (today), leave it

    // Distribution preview appears when monto > 0 and at least one lote is selected
    await expect(page.locator('.distribucion-resumen')).toBeVisible({ timeout: 5_000 });

    // Submit
    await page.click('button:has-text("Registrar gasto")');
    await expect(page.locator('.gasto-finca-modal')).not.toBeVisible({ timeout: 10_000 });

    // Verify it appears in the tab list
    await expect(page.locator('.gastos-finca-list')).toBeVisible();
    await expect(
      page.locator('.gasto-finca-card', { hasText: 'Vacunación E2E test' })
    ).toBeVisible();
  });

  test('distributed gasto shows chip in LoteDetalle', async ({ page }) => {
    await login(page);
    await goToGastosFincaTab(page);
    await ensureVacunacionGasto(page);

    // Navigate to Lotes tab and open first lote
    await page.locator('button.dashboard-tab', { hasText: 'Lotes' }).click();
    await page.locator('.lote-card').first().click();
    await page.waitForURL(/\/lote\//);

    // Switch to Gastos tab in LoteDetalle (💸 Gastos)
    await page.locator('button', { hasText: 'Gastos' }).first().click();

    // Should see the 📌 Finca badge somewhere in the gastos list
    await expect(page.locator('.badge-finca')).toBeVisible({ timeout: 10_000 });

    // Edit and delete buttons should NOT be visible for finca gastos (hidden by CSS/conditional render)
    const fincaRow = page.locator('tr', { has: page.locator('.badge-finca') }).first();
    await expect(fincaRow.locator('button[title="Editar gasto"]')).not.toBeVisible();
    await expect(fincaRow.locator('button[title="Eliminar gasto"]')).not.toBeVisible();
  });

  test('deletes a finca gasto and removes the card', async ({ page }) => {
    await login(page);
    await goToGastosFincaTab(page);
    await ensureVacunacionGasto(page);

    const card = page.locator('.gasto-finca-card', { hasText: 'Vacunación E2E test' }).first();

    // Click the delete button on the card
    await card.locator('button[title="Eliminar gasto de finca"]').click();

    // ConfirmarBorradoModal uses .modal-overlay
    const overlay = page.locator('.modal-overlay');
    await expect(overlay).toBeVisible({ timeout: 5_000 });

    // Confirm button has text "Eliminar" (default labelConfirmar)
    await overlay.locator('button', { hasText: 'Eliminar' }).click();

    // Card should disappear
    await expect(
      page.locator('.gasto-finca-card', { hasText: 'Vacunación E2E test' })
    ).not.toBeVisible({ timeout: 10_000 });
  });
});
