import { test, expect } from '@playwright/test';
import { login, abrirLote } from './helpers';
import { LOTE_PROPIO } from './fixtures';

test.describe('Areteo y filtro', () => {
  test('el Dashboard avisa de animales sin arete (La Esperanza)', async ({ page }) => {
    await login(page);
    // El lote propio tiene 2 de 3 activos sin areteSenasa
    await expect(page.getByText(/sin arete/i)).toBeVisible();
  });

  test('filtra animales por raza dentro del lote', async ({ page }) => {
    await login(page);
    await abrirLote(page, LOTE_PROPIO.nombre);
    await page.getByRole('button', { name: /Filtrar|Filtros/i }).first().click();
    await page.getByLabel(/Raza/i).fill('Charolais');
    await expect(page.getByText('BP-003')).toBeVisible();
    await expect(page.getByText('BP-001')).toHaveCount(0);
  });
});
