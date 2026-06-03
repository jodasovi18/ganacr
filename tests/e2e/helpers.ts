// tests/e2e/helpers.ts — utilidades compartidas de los specs E2E.
import { Page, expect } from '@playwright/test';
import { USER, LOTE_PROPIO } from './fixtures';

export async function login(page: Page) {
  await page.goto('/');
  await page.fill('input#email', USER.email);
  await page.fill('input#password', USER.password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByText('ANIMALES')).toBeVisible({ timeout: 20_000 });
}

/** Cambia la finca activa por nombre vía el selector del navbar. */
export async function seleccionarFinca(page: Page, nombre: string) {
  await page.getByText(nombre, { exact: false }).first().click().catch(() => {});
}

/** Entra al lote por su nombre (botón "Ver lote" de su card). */
export async function abrirLote(page: Page, nombreLote: string = LOTE_PROPIO.nombre) {
  const card = page.locator('div').filter({ hasText: nombreLote }).first();
  await card.getByRole('button', { name: /Ver lote/i }).click();
  await expect(page).toHaveURL(/\/lote\//);
}
