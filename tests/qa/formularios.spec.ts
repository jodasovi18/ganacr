import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Validación de formularios', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test('crear lote sin nombre no avanza (campo required)', async ({ page }) => {
    // Abrir modal de crear lote
    await page.locator(
      'button:has-text("Nuevo lote"), button:has-text("Crear lote"), button:has-text("+ Lote"), button:has-text("Lote")'
    ).first().click();
    const modal = page.locator('[class*="modal"], [class*="Modal"], dialog').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Intentar enviar sin llenar el nombre
    await modal.locator('button[type="submit"], button:has-text("Crear")').first().click();

    // El input de nombre debe quedar inválido (required nativo del browser)
    const nombreInput = modal.locator('input[required], input').first();
    await expect(nombreInput).toHaveJSProperty('validity.valueMissing', true);

    // El modal debe seguir visible (no se cerró)
    await expect(modal).toBeVisible();
  });

  test('agregar animal con arete duplicado muestra error', async ({ page }) => {
    await page.locator('text=Lote Brahman Norte').first().click();
    await page.waitForSelector('text=BN-001', { timeout: 12_000 });

    // Abrir modal de agregar animal
    await page.locator(
      'button:has-text("+ Agregar"), button:has-text("Agregar animal"), button:has-text("Animal")'
    ).first().click();
    const modal = page.locator('[class*="modal"], [class*="Modal"], dialog').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Usar arete que ya existe en el lote (placeholder real: "Ej: CR-001234")
    await modal.locator('input[placeholder*="CR-"]').fill('BN-001');
    // Raza es un <select> con clase form-select
    await modal.locator('select.form-select').selectOption('Brahman');
    // Campos numéricos: peso y precio
    const numberInputs = modal.locator('input[type="number"]');
    await numberInputs.nth(0).fill('350');
    await numberInputs.nth(1).fill('250000');

    await modal.locator('button[type="submit"]').click();

    // Debe mostrar un mensaje de error (arete duplicado) — clase real: div.form-error
    await expect(modal.locator('div.form-error')).toBeVisible({ timeout: 8_000 });
  });

  test('modal de venta solo muestra animales activos (no los vendidos)', async ({ page }) => {
    // Lote 2: CS-001, CS-002, CS-003 son vendidos; CS-004..CS-008 activos
    await page.locator('text=Lote Charolais Sur').first().click();
    await page.waitForSelector('text=CS-004', { timeout: 12_000 });

    // Abrir modal de venta
    await page.locator(
      'button:has-text("Vender"), button:has-text("+ Venta"), button:has-text("Venta")'
    ).first().click();
    const modal = page.locator('[class*="modal"], [class*="Modal"], dialog').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Animales vendidos NO deben aparecer en la lista de selección
    await expect(modal.locator('text=CS-001')).toHaveCount(0);
    await expect(modal.locator('text=CS-002')).toHaveCount(0);
    await expect(modal.locator('text=CS-003')).toHaveCount(0);

    // Animales activos SÍ deben estar disponibles
    await expect(modal.locator('text=CS-004')).toBeVisible();
    await expect(modal.locator('text=CS-005')).toBeVisible();
  });
});
