import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Gastos de finca', () => {
  test('registra un gasto de finca con distribución', async ({ page }) => {
    await login(page);
    await page.getByRole('tab', { name: /Gastos de Finca/i }).click();
    await page.getByRole('button', { name: /Registrar gasto|Nuevo gasto/i }).click();
    await page.getByLabel(/Concepto/i).fill('Camino E2E');
    await page.getByLabel(/Monto/i).fill('60000');
    await page.getByRole('button', { name: /Registrar|Guardar/i }).click();
    await expect(page.getByText('Camino E2E')).toBeVisible({ timeout: 10_000 });
  });
});
