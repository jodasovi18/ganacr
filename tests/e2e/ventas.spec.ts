import { test, expect } from '@playwright/test';
import { login, abrirLote } from './helpers';
import { LOTE_MEDIAS } from './fixtures';

test.describe('Ventas', () => {
  test('el lote a-medias muestra su socio', async ({ page }) => {
    await login(page);
    await abrirLote(page, LOTE_MEDIAS.nombre);
    await expect(page.getByText('Esteban Chaves').first()).toBeVisible();
  });

  test('abre el modal de vender desde el header', async ({ page }) => {
    await login(page);
    await abrirLote(page, LOTE_MEDIAS.nombre);
    // menú ⋮ del header: el div de acciones que contiene los botones "Animal" y "Gasto"
    const header = page.locator('div')
      .filter({ has: page.getByRole('button', { name: 'Animal' }) })
      .filter({ has: page.getByRole('button', { name: 'Gasto' }) })
      .last();
    await header.getByRole('button').last().click();
    await page.getByRole('menuitem', { name: /Vender animales/i }).click();
    await expect(page.locator('[role=dialog]').getByText('Vender Animales')).toBeVisible();
  });
});
