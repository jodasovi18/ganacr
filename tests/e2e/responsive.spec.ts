import { test, expect } from '@playwright/test';
import { login, abrirLote } from './helpers';
import { LOTE_PROPIO } from './fixtures';

const overflow = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

// Corre solo en el project "mobile" (Pixel 5, 393px) por el testMatch del config.
test.describe('Responsive (mobile, con datos)', () => {
  test('Dashboard sin overflow horizontal', async ({ page }) => {
    await login(page);
    expect(await overflow(page)).toBeLessThanOrEqual(2);
    await expect(page.getByText(LOTE_PROPIO.nombre).first()).toBeVisible();
  });

  test('LoteDetalle sin overflow horizontal', async ({ page }) => {
    await login(page);
    await abrirLote(page, LOTE_PROPIO.nombre);
    expect(await overflow(page)).toBeLessThanOrEqual(2);
  });
});
