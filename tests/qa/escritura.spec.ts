/**
 * Flujos de escritura E2E
 *
 * Verifica que crear lotes, agregar animales, registrar pesajes y registrar ventas
 * persisten en Firestore y se reflejan en la UI en tiempo real.
 *
 * beforeAll / afterAll ejecutan cleanup + seed para aislar estos tests del resto
 * de la suite. Con workers: 1 la ejecución es secuencial: calculos y dashboard
 * corren antes (sobre datos limpios), estos tests modifican datos, afterAll restaura
 * el estado limpio para formularios, login y lote-detalle.
 */
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { loginAs } from './helpers';

test.describe.configure({ mode: 'serial' });

// Ejecuta un script de npm de forma síncrona desde la raíz del proyecto
function runScript(script: 'cleanup' | 'seed') {
  execSync(`npm run ${script}`, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: true,
  });
}

test.describe('Flujos de escritura — crear, registrar y vender', () => {

  test.beforeAll(() => {
    // Estado limpio antes de empezar (por si un run anterior dejó datos)
    runScript('cleanup');
    runScript('seed');
  });

  test.afterAll(() => {
    // Restaurar estado canónico para los specs que siguen (formularios, login, lote-detalle)
    runScript('cleanup');
    runScript('seed');
  });

  // ── 1. Crear lote ──────────────────────────────────────────────────────────
  test('crear lote nuevo → aparece en el dashboard', async ({ page }) => {
    await loginAs(page);

    // Abrir modal de crear lote
    await page.locator(
      'button:has-text("Nuevo lote"), button:has-text("Crear lote"), button:has-text("+ Lote"), button:has-text("Lote")'
    ).first().click();

    const modal = page.locator('.modal').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Llenar nombre y enviar
    await modal.locator('input[placeholder*="Ej: Lote"]').fill('Lote E2E Escritura');
    await modal.locator('button:has-text("Crear Lote")').click();

    // Modal cierra y el nuevo lote aparece en el dashboard
    await expect(modal).not.toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Lote E2E Escritura').first()).toBeVisible({ timeout: 12_000 });
  });

  // ── 2. Agregar animal ──────────────────────────────────────────────────────
  test('agregar animal → aparece en la tabla del lote', async ({ page }) => {
    await loginAs(page);
    await page.locator('text=Lote Brahman Norte').first().click();
    await page.waitForSelector('text=BN-001', { timeout: 12_000 });

    // Abrir modal
    await page.locator(
      'button:has-text("+ Animal"), button:has-text("Agregar animal"), button:has-text("Animal")'
    ).first().click();

    const modal = page.locator('.modal').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Llenar datos del animal (arete único para no chocar con los seeded)
    await modal.locator('input[placeholder*="CR-"]').fill('BN-E2E-099');
    await modal.locator('select.form-select').selectOption('Brahman');
    const numInputs = modal.locator('input[type="number"]');
    await numInputs.nth(0).fill('340');     // peso inicial (kg)
    await numInputs.nth(1).fill('265000');  // precio compra (₡)

    await modal.locator('button:has-text("Agregar Animal")').click();

    // Modal cierra y animal aparece en tabla
    await expect(modal).not.toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=BN-E2E-099')).toBeVisible({ timeout: 12_000 });
  });

  // ── 3. Registrar pesaje ────────────────────────────────────────────────────
  test('registrar pesaje → modal cierra y peso actualizado en tabla', async ({ page }) => {
    await loginAs(page);
    await page.locator('text=Lote Brahman Norte').first().click();
    await page.waitForSelector('text=BN-001', { timeout: 12_000 });

    // Clic en botón de peso de la fila BN-001
    const filaBN001 = page.locator('tr').filter({ hasText: 'BN-001' });
    await filaBN001.locator('button:has-text("Peso"), button:has-text("⚖️")').click();

    const modal = page.locator('.modal').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // El modal muestra el arete correcto
    await expect(modal.locator('text=BN-001')).toBeVisible();

    // Ingresar nuevo peso y guardar
    await modal.locator('input[type="number"]').first().fill('455');
    await modal.locator('button:has-text("Registrar Peso")').click();

    // Modal cierra = escritura en Firestore exitosa (batch: pesos + animales en una sola op)
    await expect(modal).not.toBeVisible({ timeout: 30_000 });

    // El peso actual de BN-001 se actualiza vía onSnapshot (420 → 455)
    const filaActualizada = page.locator('tr').filter({ hasText: 'BN-001' });
    await expect(filaActualizada.locator('text=455')).toBeVisible({ timeout: 10_000 });
  });

  // ── 4. Registrar venta ─────────────────────────────────────────────────────
  test('registrar venta → aparece en pestaña Ventas con cantidad correcta', async ({ page }) => {
    await loginAs(page);

    // Usar Lote Criollo Zona Norte (8 activos, sin ventas previas)
    await page.locator('text=Lote Criollo Zona Norte').first().click();
    await page.waitForSelector('text=CZN-001', { timeout: 12_000 });

    // Abrir modal de vender
    await page.locator('button:has-text("Vender")').first().click();
    const modal = page.locator('.modal').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Seleccionar CZN-001 y asignar precio de venta
    const filaCZN001 = modal.locator('tr').filter({ hasText: 'CZN-001' });
    await filaCZN001.locator('input[type="checkbox"]').check();
    // El campo precio usa placeholder="0"
    await filaCZN001.locator('input[placeholder="0"]').fill('350000');

    // Registrar venta
    await modal.locator('button:has-text("Registrar Venta")').click();

    // Modal cierra = venta persistida en Firestore
    await expect(modal).not.toBeVisible({ timeout: 15_000 });

    // Navegar a pestaña Ventas → aparece la venta-card con 1 animal
    await page.locator('button.tab-btn').filter({ hasText: /ventas/i }).click();
    await expect(page.locator('.venta-card')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.venta-card').locator('text=1 animal')).toBeVisible();
  });

});
