import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test('muestra los 5 lotes en la lista', async ({ page }) => {
    await expect(page.locator('text=Lote Brahman Norte')).toBeVisible();
    await expect(page.locator('text=Lote Charolais Sur')).toBeVisible();
    await expect(page.locator('text=Lote Cebuinos Guanacaste')).toBeVisible();
    await expect(page.locator('text=Lote Criollo Zona Norte')).toBeVisible();
    await expect(page.locator('text=Lote Pardo Suizo Turrialba')).toBeVisible();
  });

  test('Lote 3 (todos vendidos) muestra 0 animales activos en su card', async ({ page }) => {
    const lote3Card = page
      .locator('[class*="card"], [class*="lote"], li, article')
      .filter({ hasText: 'Lote Cebuinos Guanacaste' })
      .first();
    await expect(lote3Card).toBeVisible();
    // Debe indicar 0 animales activos
    await expect(lote3Card.locator('text=0').first()).toBeVisible();
  });

  test('los montos están formateados con símbolo ₡', async ({ page }) => {
    // Al menos un monto en colones debe ser visible en el dashboard
    const colonesText = page.locator('text=/₡[\\d.,]+/').first();
    await expect(colonesText).toBeVisible();
  });

  test('clic en un lote navega al detalle', async ({ page }) => {
    await page.locator('text=Lote Brahman Norte').first().click();
    await expect(page).toHaveURL(/\/lote\//);
    await expect(page.locator('text=BN-001')).toBeVisible({ timeout: 12_000 });
  });

  test('botón crear nuevo lote abre el modal', async ({ page }) => {
    await page.locator(
      'button:has-text("Nuevo lote"), button:has-text("Crear lote"), button:has-text("+ Lote"), button:has-text("Lote")'
    ).first().click();
    await expect(
      page.locator('[class*="modal"], [class*="Modal"], dialog').first()
    ).toBeVisible({ timeout: 5_000 });
  });
});
