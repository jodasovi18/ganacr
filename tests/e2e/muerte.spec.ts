import { test, expect } from '@playwright/test';
import { login, abrirLote, abrirMenuAnimal } from './helpers';
import { LOTE_PROPIO } from './fixtures';

test.describe('Muerte / baja', () => {
  test('el menú del animal abre el modal de muerte con aviso fiscal', async ({ page }) => {
    await login(page);
    await abrirLote(page, LOTE_PROPIO.nombre);
    await abrirMenuAnimal(page, 'BP-003');
    await page.getByRole('menuitem', { name: /Registrar muerte/i }).click();
    await expect(page.getByText(/Registrar muerte/i).first()).toBeVisible();
    await expect(page.getByText(/Ley 7092|deducible|declaración de renta/i)).toBeVisible();
  });
});
