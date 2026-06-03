import { test, expect } from '@playwright/test';
import { login, seleccionarFinca } from './helpers';
import { FINCA_ESPERANZA, FINCA_ROBLE } from './fixtures';

test.describe('Auth & Dashboard', () => {
  test('login muestra el Dashboard con stats', async ({ page }) => {
    await login(page);
    await expect(page.getByText('LOTES')).toBeVisible();
    await expect(page.getByText('ANIMALES')).toBeVisible();
    await expect(page.getByText('INVERTIDO')).toBeVisible();
    await expect(page.getByText('UTILIDAD')).toBeVisible();
  });

  test('el selector de finca cambia el contexto', async ({ page }) => {
    await login(page);
    await expect(page.getByText(FINCA_ESPERANZA.nombre).first()).toBeVisible();
    await seleccionarFinca(page, FINCA_ROBLE.nombre);
    await expect(page.getByText(FINCA_ROBLE.nombre).first()).toBeVisible();
  });
});
