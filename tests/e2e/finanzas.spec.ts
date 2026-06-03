import { test, expect } from '@playwright/test';
import { login, abrirLote } from './helpers';
import { LOTE_PROPIO } from './fixtures';

test.describe('Finanzas', () => {
  test('comparativa de finca muestra los lotes', async ({ page }) => {
    await login(page);
    await page.getByRole('tab', { name: /Finanzas/i }).click();
    await expect(page.getByText(/Resultado estimado total/i)).toBeVisible();
    await expect(page.getByText(LOTE_PROPIO.nombre)).toBeVisible();
  });

  test('detalle financiero del lote muestra métricas', async ({ page }) => {
    await login(page);
    await abrirLote(page, LOTE_PROPIO.nombre);
    await page.getByRole('tab', { name: /Finanzas/i }).click();
    await expect(page.getByText(/Resultado estimado/i).first()).toBeVisible();
    await expect(page.getByText(/Costo de engorde/i)).toBeVisible();
  });
});
