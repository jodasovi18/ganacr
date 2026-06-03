import { test, expect } from '@playwright/test';
import { login } from './helpers';
import { LOTE_PROPIO } from './fixtures';

test.describe('Lotes', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('lista los lotes sembrados', async ({ page }) => {
    await expect(page.getByText(LOTE_PROPIO.nombre)).toBeVisible();
  });

  test('crea y borra un lote propio', async ({ page }) => {
    // crear
    await page.getByRole('button', { name: /Nuevo lote/i }).click();
    await page.getByPlaceholder(/Ej: Lote/i).fill('QA Lote E2E');
    await page.locator('[role=dialog] button[type=submit]').click();
    const card = page.locator('div')
      .filter({ has: page.getByRole('button', { name: /Ver lote/i }) })
      .filter({ hasText: 'QA Lote E2E' })
      .last();
    await expect(card).toBeVisible({ timeout: 10_000 });
    // borrar (botón trash de la card → confirmar en el diálogo)
    await card.getByRole('button').last().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByText('QA Lote E2E')).toHaveCount(0, { timeout: 10_000 });
  });
});
