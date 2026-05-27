import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';
import { LOTE3_EXPECTED, LOTE3_NOMBRE } from '../../scripts/seed-data';

test.describe('Cálculos financieros — Lote 3 (valores exactos al centavo)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    // Navegar al Lote Cebuinos Guanacaste
    await page.locator(`text=${LOTE3_NOMBRE}`).first().click();
    await page.waitForSelector('text=CG-001', { timeout: 12_000 });
  });

  test('el lote muestra 0 animales activos (todos vendidos)', async ({ page }) => {
    // Debe haber 0 animales en estado activo
    const activosBadges = page.locator('[class*="badge"], td, span').filter({ hasText: /activo/i });
    await expect(activosBadges).toHaveCount(0);
  });

  test('pestaña ventas: utilidad bruta = ₡530.000', async ({ page }) => {
    await page.locator('[class*="tab"], button, a').filter({ hasText: /ventas/i }).first().click();
    // Separador de miles puede ser punto, coma o espacio según locale del navegador
    await expect(page.locator('text=/530[., ]000/').first()).toBeVisible({ timeout: 8_000 });
  });

  test('pestaña ventas: socio Rolando Fallas recibe ₡212.000 (40%)', async ({ page }) => {
    await page.locator('[class*="tab"], button, a').filter({ hasText: /ventas/i }).first().click();
    await expect(page.locator('text=/212[., ]000/').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator(`text=${LOTE3_EXPECTED.socioNombre}`)).toBeVisible();
  });

  test('pestaña ventas: propietario recibe ₡318.000 (60%)', async ({ page }) => {
    await page.locator('[class*="tab"], button, a').filter({ hasText: /ventas/i }).first().click();
    await expect(page.locator('text=/318[., ]000/').first()).toBeVisible({ timeout: 8_000 });
  });

  test('el lote refleja totalVenta de ₡2.855.000', async ({ page }) => {
    await page.locator('[class*="tab"], button, a').filter({ hasText: /ventas/i }).first().click();
    // El total de venta debe aparecer en la pestaña ventas
    await expect(page.locator('text=/2[., ]855[., ]000/').first()).toBeVisible({ timeout: 8_000 });
  });

  test('pestaña ventas: gastos proporcionales = ₡290.000', async ({ page }) => {
    await page.locator('[class*="tab"], button, a').filter({ hasText: /ventas/i }).first().click();
    await expect(page.locator('text=/290[., ]000/').first()).toBeVisible({ timeout: 8_000 });
  });

  test('cantidadAnimales en la venta = 7', async ({ page }) => {
    await page.locator('[class*="tab"], button, a').filter({ hasText: /ventas/i }).first().click();
    // La venta debe indicar que se vendieron 7 animales
    await expect(page.locator('text=7').first()).toBeVisible({ timeout: 8_000 });
  });
});
