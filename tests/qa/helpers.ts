import { Page } from '@playwright/test';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

export const TEST_EMAIL    = process.env.TEST_EMAIL    ?? '';
export const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';

/**
 * Hace login en la app y espera a que el Dashboard sea visible.
 */
export async function loginAs(page: Page, email = TEST_EMAIL, password = TEST_PASSWORD) {
  await page.goto('/');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  // Esperar a que cargue el dashboard (cualquiera de los lotes de prueba)
  await page.waitForSelector('text=Lote Brahman Norte', { timeout: 15_000 });
}
