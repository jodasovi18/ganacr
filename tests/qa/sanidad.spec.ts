import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Módulo Sanidad', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.locator('text=Lote Brahman Norte').first().click();
    await page.waitForSelector('text=BN-001', { timeout: 12_000 });
  });

  test('tab Sanidad es visible en LoteDetalle', async ({ page }) => {
    await expect(page.locator('button.tab-btn').filter({ hasText: /sanidad/i })).toBeVisible();
  });

  test('tab Sanidad muestra estado vacío al inicio', async ({ page }) => {
    await page.locator('button.tab-btn').filter({ hasText: /sanidad/i }).click();
    await expect(page.locator('text=Sin eventos sanitarios')).toBeVisible({ timeout: 8_000 });
  });

  test('crear evento a nivel de lote → aparece en tab Sanidad', async ({ page }) => {
    await page.locator('button.tab-btn').filter({ hasText: /sanidad/i }).click();
    await page.locator('button', { hasText: /agregar evento/i }).first().click();

    // Rellenar modal — lote completo por defecto
    await expect(page.locator('.modal-bottom-sheet')).toBeVisible({ timeout: 6_000 });

    // Tipo: Vacuna ya está seleccionado por defecto
    await page.locator('.tipo-evento-btn', { hasText: /vacuna/i }).click();

    await page.locator('input[placeholder*="Ivomec"]').fill('Ivomec Test E2E');
    await page.locator('input[type="date"]').first().fill('2026-06-01');
    await page.locator('input[type="number"]').fill('15000');

    await page.locator('button', { hasText: /guardar evento/i }).click();

    // Modal se cierra y evento aparece en lista
    await expect(page.locator('.modal-bottom-sheet')).not.toBeVisible({ timeout: 8_000 });
    await expect(page.locator('text=Ivomec Test E2E')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Lote completo')).toBeVisible();

    // Cleanup: eliminar el evento creado
    await page.locator('.evento-card').filter({ hasText: 'Ivomec Test E2E' }).locator('button[title="Eliminar"]').click();
    await page.locator('button', { hasText: /confirmar|eliminar/i }).last().click();
    await expect(page.locator('text=Ivomec Test E2E')).not.toBeVisible({ timeout: 8_000 });
  });

  test('crear evento para animal específico → aparece con arete en tab Sanidad', async ({ page }) => {
    await page.locator('button.tab-btn').filter({ hasText: /sanidad/i }).click();
    await page.locator('button', { hasText: /agregar evento/i }).first().click();

    await expect(page.locator('.modal-bottom-sheet')).toBeVisible({ timeout: 6_000 });

    // Cambiar a animal específico
    await page.locator('.toggle-btn', { hasText: /animal específico/i }).click();
    await page.locator('input[placeholder*="arete"]').fill('BN-001');
    await page.locator('.animal-search-result').first().click();

    await page.locator('.tipo-evento-btn', { hasText: /tratamiento/i }).click();
    await page.locator('input[placeholder*="Ivomec"]').fill('Oxitetraciclina E2E');
    await page.locator('input[type="date"]').first().fill('2026-06-01');
    await page.locator('input[type="number"]').fill('4500');

    await page.locator('button', { hasText: /guardar evento/i }).click();

    await expect(page.locator('.modal-bottom-sheet')).not.toBeVisible({ timeout: 8_000 });
    await expect(page.locator('text=Oxitetraciclina E2E')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=BN-001')).toBeVisible();

    // Cleanup
    await page.locator('.evento-card').filter({ hasText: 'Oxitetraciclina E2E' }).locator('button[title="Eliminar"]').click();
    await page.locator('button', { hasText: /confirmar|eliminar/i }).last().click();
    await expect(page.locator('text=Oxitetraciclina E2E')).not.toBeVisible({ timeout: 8_000 });
  });

  test('validación: botón guardar bloqueado sin nombre de producto', async ({ page }) => {
    await page.locator('button.tab-btn').filter({ hasText: /sanidad/i }).click();
    await page.locator('button', { hasText: /agregar evento/i }).first().click();

    await expect(page.locator('.modal-bottom-sheet')).toBeVisible({ timeout: 6_000 });

    // Solo llenar fecha y costo — sin nombre
    await page.locator('input[type="date"]').first().fill('2026-06-01');
    await page.locator('input[type="number"]').fill('5000');

    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test('chip de próxima dosis vencida aparece en rojo', async ({ page }) => {
    await page.locator('button.tab-btn').filter({ hasText: /sanidad/i }).click();
    await page.locator('button', { hasText: /agregar evento/i }).first().click();

    await expect(page.locator('.modal-bottom-sheet')).toBeVisible({ timeout: 6_000 });

    await page.locator('input[placeholder*="Ivomec"]').fill('VacunaVencidaE2E');
    await page.locator('input[type="date"]').first().fill('2025-01-01');
    await page.locator('input[type="number"]').fill('1000');
    // Próxima dosis en el pasado
    const proximaInput = page.locator('input[type="date"]').nth(1);
    await proximaInput.fill('2025-02-01');

    await page.locator('button', { hasText: /guardar evento/i }).click();
    await expect(page.locator('.modal-bottom-sheet')).not.toBeVisible({ timeout: 8_000 });

    await expect(page.locator('.evento-proxima--vencida')).toBeVisible({ timeout: 10_000 });

    // Cleanup
    await page.locator('.evento-card').filter({ hasText: 'VacunaVencidaE2E' }).locator('button[title="Eliminar"]').click();
    await page.locator('button', { hasText: /confirmar|eliminar/i }).last().click();
  });
});
