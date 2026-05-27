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
    // En stats: "0 Activos"
    await expect(page.locator('.stat-card').filter({ hasText: /activos/i }).locator('.stat-value')).toHaveText('0');
  });

  test('pestaña ventas: utilidad bruta = ₡530.000', async ({ page }) => {
    await page.locator('button.tab-btn').filter({ hasText: /ventas/i }).click();
    await page.waitForSelector('.venta-card', { timeout: 15_000 });
    // Badge de utilidad en la venta card (usa formatColones → separador puede ser espacio, punto o coma)
    await expect(page.locator('.venta-card').locator('text=/530.000/').first()).toBeVisible({ timeout: 8_000 });
  });

  test('pestaña ventas: socio Rolando Fallas recibe ₡212.000 (40%)', async ({ page }) => {
    await page.locator('button.tab-btn').filter({ hasText: /ventas/i }).click();
    await page.waitForSelector('.venta-card', { timeout: 15_000 });
    await expect(page.locator('.venta-card').locator('text=/212.000/').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('.venta-card').locator(`text=${LOTE3_EXPECTED.socioNombre}`)).toBeVisible();
  });

  test('pestaña ventas: propietario recibe ₡318.000 (60%)', async ({ page }) => {
    await page.locator('button.tab-btn').filter({ hasText: /ventas/i }).click();
    await page.waitForSelector('.venta-card', { timeout: 15_000 });
    await expect(page.locator('.venta-card').locator('text=/318.000/').first()).toBeVisible({ timeout: 8_000 });
  });

  test('el lote refleja totalVenta de ₡2.855.000', async ({ page }) => {
    await page.locator('button.tab-btn').filter({ hasText: /ventas/i }).click();
    await page.waitForSelector('.venta-card', { timeout: 15_000 });
    // "Venta total" row in venta-detalle
    await expect(page.locator('.venta-card').locator('text=/2.855.000/').first()).toBeVisible({ timeout: 8_000 });
  });

  test('pestaña ventas: gastos proporcionales = ₡290.000', async ({ page }) => {
    await page.locator('button.tab-btn').filter({ hasText: /ventas/i }).click();
    await page.waitForSelector('.venta-card', { timeout: 15_000 });
    // "Gastos prop." row in venta-detalle
    await expect(page.locator('.venta-card').locator('text=/290.000/').first()).toBeVisible({ timeout: 8_000 });
  });

  test('cantidadAnimales en la venta = 7', async ({ page }) => {
    await page.locator('button.tab-btn').filter({ hasText: /ventas/i }).click();
    await page.waitForSelector('.venta-card', { timeout: 15_000 });
    // Venta card header: "7 animales — fecha"
    await expect(page.locator('.venta-card').locator('text=7 animales')).toBeVisible({ timeout: 8_000 });
  });
});
