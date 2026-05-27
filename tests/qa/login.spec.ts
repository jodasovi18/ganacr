import { test, expect } from '@playwright/test';
import { TEST_EMAIL, TEST_PASSWORD } from './helpers';

test.describe('Autenticación', () => {
  test('login exitoso con credenciales válidas redirige al Dashboard', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('text=Lote Brahman Norte')).toBeVisible({ timeout: 15_000 });
  });

  test('login con contraseña incorrecta muestra mensaje de error', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill('contraseña-incorrecta-xyz-999');
    await page.locator('button[type="submit"]').click();

    // Debe mostrar algún mensaje de error visible
    await expect(
      page.locator('[class*="error"], .alert, p.error, div.error, span.error').first()
    ).toBeVisible({ timeout: 10_000 });
    // No debe haber navegado fuera del login
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('formulario no envía si email está vacío (validación nativa)', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();

    // El campo email vacío activa la validación nativa del browser
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveJSProperty('validity.valueMissing', true);
    // La página no debe haber navegado
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('logout regresa al login', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('text=Lote Brahman Norte')).toBeVisible({ timeout: 15_000 });

    // Buscar botón de logout con varios selectores posibles
    await page.locator(
      'button:has-text("Salir"), button:has-text("Cerrar sesión"), button:has-text("Logout"), [aria-label*="logout"], [class*="logout"]'
    ).first().click();

    // Debe regresar al login
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
  });
});
