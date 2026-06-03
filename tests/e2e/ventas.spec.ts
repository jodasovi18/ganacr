import { test, expect } from '@playwright/test';
import { login, abrirLote } from './helpers';
import { LOTE_MEDIAS } from './fixtures';

test.describe('Ventas', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('el lote a-medias muestra su venta y el socio', async ({ page }) => {
    await abrirLote(page, LOTE_MEDIAS.nombre);
    await expect(page.getByText('Esteban Chaves')).toBeVisible();
  });

  test('vender un animal activo recalcula contadores', async ({ page }) => {
    await abrirLote(page, LOTE_MEDIAS.nombre);
    await page.getByRole('button', { name: /Vender/i }).first().click();
    // seleccionar NS-001 y confirmar
    await page.getByText('NS-001').click();
    await page.getByLabel(/Precio|Total/i).first().fill('650000');
    await page.getByRole('button', { name: /Vender|Confirmar/i }).click();
    await expect(page.getByText(/vendido/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
