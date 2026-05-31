import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Registro de muerte de animal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    // Lote con animales activos (seed: 8 Brahman activos)
    await page.locator('text=Lote Brahman Norte').first().click();
    await page.waitForSelector('text=BN-001', { timeout: 15_000 });
  });

  test('registrar muerte de un animal activo y luego revertirla', async ({ page }) => {
    // Aseguramos estar en la pestaña de animales
    await page.locator('button.tab-btn').filter({ hasText: /animales/i }).click();
    await page.waitForSelector('text=BN-001', { timeout: 15_000 });

    // Fila del animal activo a registrar como muerto
    const fila = page.locator('tr').filter({ hasText: 'BN-001' });

    // ── Abrir el menú ⋮ del animal y elegir "Registrar muerte" ──
    await fila.getByRole('button').last().click();
    await page.getByRole('menuitem', { name: /registrar muerte/i }).click();

    // ── Modal "Registrar muerte" ──
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 6_000 });
    await expect(modal.locator('#muerte-precio')).toBeVisible();

    // La fecha viene con default (hoy) — sólo completamos precio/kg
    await modal.locator('#muerte-precio').fill('2000');

    await modal.getByRole('button', { name: /^registrar muerte$/i }).click();
    await expect(modal).not.toBeVisible({ timeout: 20_000 });

    // ── El animal muestra badge "muerto" y control "Revertir muerte" ──
    await expect(
      fila.locator('span.badge, [class*="badge"]').filter({ hasText: /^muerto$/i }).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(fila.getByRole('button', { name: /revertir muerte/i })).toBeVisible({ timeout: 10_000 });

    // ── Revertir la muerte para no dejar datos alterados ──
    await fila.getByRole('button', { name: /revertir muerte/i }).click();

    // ConfirmarBorradoModal: labelConfirmar = "Revertir muerte"
    const confirmModal = page.locator('.modal').last();
    await expect(confirmModal).toBeVisible({ timeout: 6_000 });
    await expect(confirmModal.locator('text=BN-001')).toBeVisible();
    await confirmModal.getByRole('button', { name: /^revertir muerte$/i }).click();
    await expect(confirmModal).not.toBeVisible({ timeout: 20_000 });

    // El animal vuelve a estado activo
    await expect(
      fila.locator('span.badge, [class*="badge"]').filter({ hasText: /^activo$/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
