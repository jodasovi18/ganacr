import { test, expect } from '@playwright/test';
import { login, abrirLote } from './helpers';
import { LOTE_PROPIO } from './fixtures';

test.describe('Animales', () => {
  test.beforeEach(async ({ page }) => { await login(page); await abrirLote(page, LOTE_PROPIO.nombre); });

  test('muestra los animales sembrados con su arete y DIIO', async ({ page }) => {
    await expect(page.getByText('BP-001').first()).toBeVisible();
    await expect(page.getByText(/DIIO: CR-DIIO-001/).first()).toBeVisible();
  });

  test('abre el modal de agregar animal', async ({ page }) => {
    await page.getByRole('button', { name: 'Animal', exact: true }).first().click();
    await expect(page.getByPlaceholder('Ej: CR-001234')).toBeVisible();
    await page.getByPlaceholder('Ej: CR-001234').fill('BP-099');
    await expect(page.getByPlaceholder('Ej: CR-001234')).toHaveValue('BP-099');
  });
});
