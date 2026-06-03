import { test, expect } from '@playwright/test';
import { login, abrirLote } from './helpers';
import { LOTE_PROPIO } from './fixtures';

test.describe('Muerte / baja', () => {
  test('registra la muerte de un animal con aviso fiscal', async ({ page }) => {
    await login(page);
    await abrirLote(page, LOTE_PROPIO.nombre);
    // abrir acciones del animal BP-003 → registrar muerte
    const fila = page.locator('tr, div').filter({ hasText: 'BP-003' }).first();
    await fila.getByRole('button', { name: /muerte|baja|⋮|acciones/i }).first().click().catch(() => {});
    await page.getByText(/Registrar muerte/i).click();
    await expect(page.getByText(/Ley 7092|deducible|declaración de renta/i)).toBeVisible();
    await page.getByRole('button', { name: /Registrar muerte|Confirmar/i }).click();
    await expect(page.getByText(/muerto/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
