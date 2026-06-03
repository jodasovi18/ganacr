import { test, expect } from '@playwright/test';
import { login, abrirLote } from './helpers';
import { LOTE_PROPIO } from './fixtures';

// Corre solo en el project "mobile" (Pixel 5, 393px) por el testMatch del config.
test.describe('Responsive (mobile, con datos)', () => {
  test('Dashboard no tiene overflow horizontal y muestra navbar móvil', async ({ page }) => {
    await login(page);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(ov).toBeLessThanOrEqual(2);
    await expect(page.getByText('ANIMALES')).toBeVisible();
  });

  test('LoteDetalle no tiene overflow horizontal', async ({ page }) => {
    await login(page);
    await abrirLote(page, LOTE_PROPIO.nombre);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(ov).toBeLessThanOrEqual(2);
  });
});
