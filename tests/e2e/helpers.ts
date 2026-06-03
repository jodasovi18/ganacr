// tests/e2e/helpers.ts — utilidades compartidas de los specs E2E.
import { Page, expect } from '@playwright/test';
import { USER, LOTE_PROPIO } from './fixtures';

export async function login(page: Page) {
  await page.goto('/');
  await page.fill('input#email', USER.email);
  await page.fill('input#password', USER.password);
  await page.locator('button[type="submit"]').click();
  // esperar a que cargue la data (finca activa + lotes), no solo el shell del Dashboard
  await expect(page.getByText(LOTE_PROPIO.nombre)).toBeVisible({ timeout: 20_000 });
}

/** Cambia la finca activa abriendo el dropdown del navbar y eligiendo la finca. */
export async function seleccionarFinca(page: Page, nombre: string) {
  await page.getByRole('button', { name: /La Esperanza|El Roble/ }).first().click();
  await page.getByRole('menuitem', { name: new RegExp(nombre) }).click();
}

/** Entra al lote por su nombre (botón "Ver lote" de su card). */
export async function abrirLote(page: Page, nombreLote: string = LOTE_PROPIO.nombre) {
  const card = page.locator('div')
    .filter({ has: page.getByRole('button', { name: /Ver lote/i }) })
    .filter({ hasText: nombreLote })
    .last();
  await card.getByRole('button', { name: /Ver lote/i }).click();
  await expect(page).toHaveURL(/\/lote\//);
}
