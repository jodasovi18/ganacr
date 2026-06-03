import { test, expect } from '@playwright/test';
import { login, abrirLote } from './helpers';
import { LOTE_PROPIO } from './fixtures';

test.describe('Sanidad', () => {
  test('registra un evento sanitario', async ({ page }) => {
    await login(page);
    await abrirLote(page, LOTE_PROPIO.nombre);
    await page.getByRole('tab', { name: /Sanidad/i }).click();
    await page.getByRole('button', { name: /Registrar|Nuevo evento|evento/i }).first().click();
    await page.getByLabel(/Producto|Nombre/i).first().fill('Vacuna E2E');
    await page.getByLabel(/Costo/i).fill('15000');
    await page.getByRole('button', { name: /Registrar|Guardar/i }).click();
    await expect(page.getByText('Vacuna E2E')).toBeVisible({ timeout: 10_000 });
  });
});
