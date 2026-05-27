import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Detalle de Lote', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test('Lote 1: muestra los 8 animales Brahman', async ({ page }) => {
    await page.locator('text=Lote Brahman Norte').first().click();
    await page.waitForSelector('text=BN-001', { timeout: 12_000 });

    for (const arete of ['BN-001', 'BN-002', 'BN-003', 'BN-004', 'BN-005', 'BN-006', 'BN-007', 'BN-008']) {
      await expect(page.locator(`text=${arete}`)).toBeVisible();
    }
  });

  test('Lote 1: muestra peso inicial y peso actual distintos (BN-001: 380 → 420 kg)', async ({ page }) => {
    await page.locator('text=Lote Brahman Norte').first().click();
    await page.waitForSelector('text=BN-001', { timeout: 12_000 });

    await expect(page.locator('text=380').first()).toBeVisible();
    await expect(page.locator('text=420').first()).toBeVisible();
  });

  test('Lote 2: muestra 3 animales vendidos y 5 activos', async ({ page }) => {
    await page.locator('text=Lote Charolais Sur').first().click();
    await page.waitForSelector('text=CS-001', { timeout: 12_000 });

    // Los 8 aretes deben estar visibles
    for (const arete of ['CS-001', 'CS-002', 'CS-003', 'CS-004', 'CS-005']) {
      await expect(page.locator(`text=${arete}`)).toBeVisible();
    }

    // Debe haber exactamente 3 spans con badge de "vendido" (no "Vendidos" plural del stat)
    const vendidoBadges = page.locator('span.badge').filter({ hasText: /^vendido$/i });
    await expect(vendidoBadges).toHaveCount(3);
  });

  test('Lote 2: pestaña de gastos muestra los 4 gastos', async ({ page }) => {
    await page.locator('text=Lote Charolais Sur').first().click();
    await page.waitForSelector('text=CS-001', { timeout: 12_000 });

    // Navegar a pestaña de gastos
    await page.locator('button.tab-btn').filter({ hasText: /gastos/i }).click();

    await expect(page.locator('text=Alimento febrero')).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('text=Veterinario general')).toBeVisible();
    await expect(page.locator('text=Mano de obra')).toBeVisible();
    await expect(page.locator('text=Transporte a subasta')).toBeVisible();
  });

  test('Lote 3: pestaña de ventas muestra la venta total (7 animales)', async ({ page }) => {
    await page.locator('text=Lote Cebuinos Guanacaste').first().click();
    await page.waitForSelector('text=CG-001', { timeout: 12_000 });

    // Navegar a pestaña de ventas
    await page.locator('button.tab-btn').filter({ hasText: /ventas/i }).click();

    // Verificar que aparece exactamente 1 venta-card con 7 animales
    await expect(page.locator('.venta-card')).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('text=7 animales')).toBeVisible();
  });
});
