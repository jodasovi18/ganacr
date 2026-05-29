import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Export a Excel', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test('botón Excel visible en Dashboard con lotes cargados', async ({ page }) => {
    await expect(page.locator('button', { hasText: /excel/i })).toBeVisible({ timeout: 10_000 });
  });

  test('botón Excel en Dashboard dispara descarga sin errores de consola', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.locator('button', { hasText: /excel/i }).first().click();

    // Wait for "Exportando..." to appear and disappear
    await expect(page.locator('button', { hasText: /exportando/i })).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('button', { hasText: /exportando/i })).not.toBeVisible({ timeout: 20_000 });

    // No new errors should have appeared
    const exportErrors = errors.filter(e => e.includes('exportando') || e.includes('Excel'));
    expect(exportErrors).toHaveLength(0);
  });

  test('botón Excel visible en LoteDetalle header', async ({ page }) => {
    await page.locator('text=Lote Brahman Norte').first().click();
    await page.waitForSelector('text=BN-001', { timeout: 12_000 });

    const excelBtn = page.locator('.detalle-acciones button', { hasText: /excel/i });
    await expect(excelBtn).toBeVisible({ timeout: 5_000 });
  });

  test('botón Excel en LoteDetalle no genera errores de consola', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.locator('text=Lote Brahman Norte').first().click();
    await page.waitForSelector('text=BN-001', { timeout: 12_000 });

    await page.locator('.detalle-acciones button', { hasText: /excel/i }).click();
    await page.waitForTimeout(1_000);

    const exportErrors = errors.filter(e => e.toLowerCase().includes('excel') || e.toLowerCase().includes('export'));
    expect(exportErrors).toHaveLength(0);
  });
});
