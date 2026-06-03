import { test, expect } from '@playwright/test';
import { login } from './helpers';
import { LOTE_PROPIO } from './fixtures';

test.describe('Lotes', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('lista los lotes sembrados', async ({ page }) => {
    await expect(page.getByText(LOTE_PROPIO.nombre)).toBeVisible();
  });

  test('crea un lote propio nuevo', async ({ page }) => {
    await page.getByRole('button', { name: /Nuevo lote/i }).click();
    await page.getByLabel(/Nombre del lote/i).fill('QA Lote E2E');
    await page.getByRole('button', { name: /Crear lote/i }).click();
    await expect(page.getByText('QA Lote E2E')).toBeVisible({ timeout: 10_000 });
  });

  test('borra un lote (cascade)', async ({ page }) => {
    const card = page.locator('div').filter({ hasText: 'QA Lote E2E' }).first();
    await card.getByRole('button', { name: /eliminar|borrar/i }).click().catch(async () => {
      await card.getByRole('button').last().click(); // botón trash (icono)
    });
    await page.getByRole('button', { name: /Eliminar|Confirmar/i }).click();
    await expect(page.getByText('QA Lote E2E')).toHaveCount(0, { timeout: 10_000 });
  });
});
