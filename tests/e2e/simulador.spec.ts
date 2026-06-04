import { test, expect } from '@playwright/test';
import { login, abrirLote } from './helpers';
import { LOTE_PROPIO } from './fixtures';

test.describe('Simulador', () => {
  test('la pestaña Simulador abre y muestra un veredicto', async ({ page }) => {
    await login(page);
    await abrirLote(page, LOTE_PROPIO.nombre);
    await page.getByRole('tab', { name: /Simulador/i }).click();
    await expect(page.getByText(/Conviene (esperar|vender)/i)).toBeVisible();
  });

  test('cambiar los días recalcula', async ({ page }) => {
    await login(page);
    await abrirLote(page, LOTE_PROPIO.nombre);
    await page.getByRole('tab', { name: /Simulador/i }).click();
    await page.getByLabel('Días').fill('60');
    await expect(page.getByText('Ingreso en 60 días')).toBeVisible();
  });
});
