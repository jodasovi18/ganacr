import { test, expect } from '@playwright/test';
import { login, seleccionarFinca } from './helpers';
import { FINCA_ROBLE } from './fixtures';

test.describe('Auth & Dashboard', () => {
  test('login muestra el Dashboard con los lotes sembrados', async ({ page }) => {
    await login(page);
    await expect(page.getByText('Brahman Propio')).toBeVisible();
    await expect(page.getByText('Nelore Socio')).toBeVisible();
  });

  test('el selector de finca cambia el contexto', async ({ page }) => {
    await login(page); // La Esperanza activa (muestra los lotes)
    await seleccionarFinca(page, FINCA_ROBLE.nombre); // El Roble está vacía
    await expect(page.getByText('No tenés lotes todavía.')).toBeVisible({ timeout: 10_000 });
  });
});
