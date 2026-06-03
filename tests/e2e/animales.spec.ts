import { test, expect } from '@playwright/test';
import { login, abrirLote } from './helpers';
import { LOTE_PROPIO } from './fixtures';

test.describe('Animales', () => {
  test.beforeEach(async ({ page }) => { await login(page); await abrirLote(page, LOTE_PROPIO.nombre); });

  test('muestra los animales sembrados con su arete', async ({ page }) => {
    await expect(page.getByText('BP-001')).toBeVisible();
    await expect(page.getByText('CR-DIIO-001')).toBeVisible(); // DIIO SENASA
  });

  test('agrega un animal comprado con arete SENASA', async ({ page }) => {
    await page.getByRole('button', { name: /Agregar animal/i }).click();
    await page.getByLabel(/N.*arete/i).first().fill('BP-099');
    await page.getByLabel(/Raza/i).fill('Brahman');
    await page.getByLabel(/Arete.*SENASA|DIIO/i).fill('CR-DIIO-099');
    await page.getByRole('button', { name: /Agregar|Guardar/i }).click();
    await expect(page.getByText('BP-099')).toBeVisible({ timeout: 10_000 });
  });
});
