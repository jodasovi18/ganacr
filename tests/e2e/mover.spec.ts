import { test, expect } from '@playwright/test';
import { login, abrirLote } from './helpers';
import { LOTE_PROPIO } from './fixtures';

test.describe('Mover animales', () => {
  test('abre el modal de mover desde el lote', async ({ page }) => {
    await login(page);
    await abrirLote(page, LOTE_PROPIO.nombre);
    await page.getByRole('button', { name: /Mover/i }).first().click();
    await expect(page.getByText(/Mover animales/i)).toBeVisible();
  });
});
