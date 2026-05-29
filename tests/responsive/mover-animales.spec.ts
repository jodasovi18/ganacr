import { test, expect } from '@playwright/test';
import { loginAsTestUser, navegarALote } from './helpers';

const hasCredentials = !!(process.env.TEST_EMAIL && process.env.TEST_PASSWORD);

test.describe('Mover Animales', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasCredentials, 'TEST_EMAIL / TEST_PASSWORD not set');
    await loginAsTestUser(page);
    await navegarALote(page);
    // Make sure we're on the animales tab
    await page.click('[class*="tab-btn"]:has-text("Animales")');
  });

  test('botón Seleccionar visible en tab Animales', async ({ page }) => {
    await expect(page.locator('.mover-seleccionar-btn')).toBeVisible();
  });

  test('activar modo selección muestra barra bottom solo al seleccionar', async ({ page }) => {
    await page.click('.mover-seleccionar-btn');
    // Bottom bar NOT visible yet (no animals selected)
    await expect(page.locator('.mover-select-bar')).not.toBeVisible();
    // Select first active animal card on mobile, or check first checkbox on desktop
    const cards = page.locator('.animal-card--seleccionable');
    const firstCard = cards.first();
    if (await firstCard.count() > 0) {
      await firstCard.click();
      await expect(page.locator('.mover-select-bar')).toBeVisible();
      await expect(page.locator('.mover-select-count')).toContainText('1 animal');
    } else {
      // Desktop: use checkbox
      await page.locator('input[type="checkbox"]').first().check();
      await expect(page.locator('.mover-select-bar')).toBeVisible();
    }
  });

  test('cancelar selección limpia el estado', async ({ page }) => {
    await page.click('.mover-seleccionar-btn');
    // Select and then cancel
    const card = page.locator('.animal-card--seleccionable').first();
    if (await card.count() > 0) {
      await card.click();
      await page.locator('.mover-select-bar .btn-ghost').click();
      await expect(page.locator('.mover-select-bar')).not.toBeVisible();
      await expect(page.locator('.animal-card--seleccionado')).toHaveCount(0);
    }
  });

  test('abre MoverAnimalesModal desde multi-select', async ({ page }) => {
    await page.click('.mover-seleccionar-btn');
    const card = page.locator('.animal-card--seleccionable').first();
    if (await card.count() > 0) {
      await card.click();
      await page.locator('.mover-select-bar .btn-primary').click();
      await expect(page.locator('.mover-modal')).toBeVisible();
      await expect(page.locator('.mover-modal h2')).toContainText('Mover');
    }
  });

  test('modal muestra lotes destino y lote origen deshabilitado', async ({ page }) => {
    // Open modal via individual "mover" button
    const moverBtn = page.locator('.animal-card-actions button[title="Mover a otro lote"]').first();
    if (await moverBtn.count() > 0) {
      await moverBtn.click();
      await expect(page.locator('.mover-modal')).toBeVisible();
      // At least one lote option should be present (the current lote is excluded)
      // Either a lote option or the "no hay otros lotes" message
      const hasOptions = await page.locator('.mover-lote-option').count() > 0;
      const hasEmpty = await page.locator('.mover-empty').count() > 0;
      expect(hasOptions || hasEmpty).toBeTruthy();
    }
  });

  test('botón Mover deshabilitado sin destino ni precio', async ({ page }) => {
    const moverBtn = page.locator('.animal-card-actions button[title="Mover a otro lote"]').first();
    if (await moverBtn.count() > 0) {
      await moverBtn.click();
      await expect(page.locator('.mover-modal button[type="submit"]')).toBeDisabled();
    }
  });

  test('total estimado se calcula en tiempo real', async ({ page }) => {
    const moverBtn = page.locator('.animal-card-actions button[title="Mover a otro lote"]').first();
    if (await moverBtn.count() > 0) {
      await moverBtn.click();
      const priceInput = page.locator('.mover-precio-input');
      await priceInput.fill('1000');
      // Total estimado should appear (non-zero animal weight)
      await expect(page.locator('.mover-total-estimado')).toBeVisible();
      await expect(page.locator('.mover-total-estimado')).toContainText('₡');
    }
  });

  test('cerrar modal no cambia el lote', async ({ page }) => {
    const moverBtn = page.locator('.animal-card-actions button[title="Mover a otro lote"]').first();
    if (await moverBtn.count() > 0) {
      await moverBtn.click();
      await page.locator('.modal-close').click();
      await expect(page.locator('.mover-modal')).not.toBeVisible();
      // Still on the same lote page
      await expect(page).toHaveURL(/\/lote\//);
    }
  });

  test('cambiar de tab limpia la selección', async ({ page }) => {
    await page.click('.mover-seleccionar-btn');
    const card = page.locator('.animal-card--seleccionable').first();
    if (await card.count() > 0) {
      await card.click();
      await expect(page.locator('.mover-select-bar')).toBeVisible();
      // Switch to Gastos tab
      await page.click('[class*="tab-btn"]:has-text("Gastos")');
      // Switch back
      await page.click('[class*="tab-btn"]:has-text("Animales")');
      // Bar should be gone
      await expect(page.locator('.mover-select-bar')).not.toBeVisible();
    }
  });
});
