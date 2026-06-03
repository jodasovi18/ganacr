import { test, expect } from '@playwright/test';
import { login, abrirLote } from './helpers';
import { LOTE_PROPIO } from './fixtures';

test.describe('Areteo y filtro', () => {
  test('el Dashboard avisa de animales sin arete', async ({ page }) => {
    await login(page);
    await expect(page.getByText(/sin arete SENASA registrado/i)).toBeVisible();
  });

  test('filtra animales por raza dentro del lote', async ({ page }) => {
    await login(page);
    await abrirLote(page, LOTE_PROPIO.nombre);
    await page.getByRole('button', { name: /Filtros/i }).click();
    await page.locator('select').first().selectOption({ label: 'Charolais' });
    await expect(page.getByText('BP-003').first()).toBeVisible();
    await expect(page.locator('tr', { hasText: 'BP-001' })).toHaveCount(0);
  });
});
