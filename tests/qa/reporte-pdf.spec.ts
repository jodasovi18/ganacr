import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Reporte PDF', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test('botón PDF visible en Dashboard con lotes cargados', async ({ page }) => {
    await expect(page.locator('button', { hasText: /^📄 PDF$/ })).toBeVisible({ timeout: 10_000 });
  });

  test('click en botón PDF abre dropdown con nombres de lotes', async ({ page }) => {
    await page.locator('button', { hasText: /^📄 PDF$/ }).click();
    await expect(page.locator('.pdf-dropdown')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('.pdf-dropdown-item').first()).toBeVisible();
  });

  test('click fuera del dropdown lo cierra', async ({ page }) => {
    await page.locator('button', { hasText: /^📄 PDF$/ }).click();
    await expect(page.locator('.pdf-dropdown')).toBeVisible({ timeout: 3_000 });
    await page.locator('.pdf-dropdown-overlay').click();
    await expect(page.locator('.pdf-dropdown')).not.toBeVisible({ timeout: 2_000 });
  });

  test('seleccionar lote en dropdown genera PDF sin errores de consola', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.locator('button', { hasText: /^📄 PDF$/ }).click();
    await expect(page.locator('.pdf-dropdown')).toBeVisible({ timeout: 3_000 });
    await page.locator('.pdf-dropdown-item').first().click();

    await expect(page.locator('button', { hasText: /generando/i })).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('button', { hasText: /generando/i })).not.toBeVisible({ timeout: 30_000 });

    const pdfErrors = errors.filter(e => e.toLowerCase().includes('pdf') || e.toLowerCase().includes('generando'));
    expect(pdfErrors).toHaveLength(0);
  });

  test('botón PDF visible en LoteDetalle header', async ({ page }) => {
    await page.locator('.lote-card').first().click();
    await page.waitForSelector('.detalle-acciones', { timeout: 12_000 });

    await expect(page.locator('.detalle-acciones button', { hasText: /^📄 PDF$/ })).toBeVisible({ timeout: 5_000 });
  });

  test('botón PDF en LoteDetalle no genera errores de consola', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.locator('.lote-card').first().click();
    await page.waitForSelector('.detalle-acciones', { timeout: 12_000 });
    await page.locator('.detalle-acciones button', { hasText: /^📄 PDF$/ }).click();
    await page.waitForTimeout(5_000);

    const pdfErrors = errors.filter(e => e.toLowerCase().includes('pdf'));
    expect(pdfErrors).toHaveLength(0);
  });
});
