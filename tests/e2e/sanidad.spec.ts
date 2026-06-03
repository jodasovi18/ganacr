import { test, expect } from '@playwright/test';
import { login, abrirLote, abrirMenuAnimal } from './helpers';
import { LOTE_PROPIO } from './fixtures';

test.describe('Sanidad', () => {
  test('el menú del animal abre el modal de evento sanitario', async ({ page }) => {
    await login(page);
    await abrirLote(page, LOTE_PROPIO.nombre);
    await abrirMenuAnimal(page, 'BP-001');
    await page.getByRole('menuitem', { name: /Evento sanitario/i }).click();
    await expect(page.locator('[role=dialog]').getByText('Agregar evento sanitario')).toBeVisible();
    await page.getByPlaceholder(/Ivomec/i).fill('Vacuna E2E');
    await expect(page.getByPlaceholder(/Ivomec/i)).toHaveValue('Vacuna E2E');
  });
});
