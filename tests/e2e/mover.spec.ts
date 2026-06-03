import { test, expect } from '@playwright/test';
import { login, abrirLote, abrirMenuAnimal } from './helpers';
import { LOTE_PROPIO } from './fixtures';

test.describe('Mover animales', () => {
  test('abre el modal de mover desde el menú del animal', async ({ page }) => {
    await login(page);
    await abrirLote(page, LOTE_PROPIO.nombre);
    await abrirMenuAnimal(page, 'BP-001');
    await page.getByRole('menuitem', { name: /Mover a otro lote/i }).click();
    await expect(page.getByText(/Mover 1 animal/i)).toBeVisible();
  });
});
