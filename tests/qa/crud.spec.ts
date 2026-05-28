// tests/qa/crud.spec.ts
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { loginAs } from './helpers';

test.describe.configure({ mode: 'serial' });
test.setTimeout(60_000);

function runScript(script: 'cleanup' | 'seed') {
  execSync(`npm run ${script}`, { cwd: process.cwd(), stdio: 'inherit', shell: true });
}

test.describe('CRUD — edición y borrado', () => {

  test.beforeAll(() => {
    runScript('cleanup');
    runScript('seed');
  });

  test.afterAll(() => {
    runScript('cleanup');
    runScript('seed');
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GASTOS — Lote Charolais Sur
  // ────────────────────────────────────────────────────────────────────────────

  test.describe('Gastos', () => {

    test('G1: botón ✏️ abre modal con datos pre-llenados (concepto + monto + tipo)', async ({ page }) => {
      await loginAs(page);
      await page.locator('text=Lote Charolais Sur').first().click();
      await page.waitForSelector('text=CS-001', { timeout: 15_000 });
      await page.locator('button.tab-btn').filter({ hasText: /gastos/i }).click();
      await page.waitForSelector('text=Alimento febrero', { timeout: 10_000 });

      const filaGasto = page.locator('tr').filter({ hasText: 'Alimento febrero' });
      await filaGasto.locator('button[title="Editar gasto"]').click();

      const modal = page.locator('.modal').last();
      await expect(modal).toBeVisible({ timeout: 5_000 });
      // concepto pre-llenado
      await expect(modal.locator('input[placeholder*="concepto"], input[placeholder*="Ej:"]').first()).toHaveValue('Alimento febrero');
      // monto pre-llenado (seed: 200000)
      await expect(modal.locator('input[type="number"]').first()).toHaveValue('200000');
      // tipo pre-llenado (alimento)
      await expect(modal.locator('select')).toHaveValue('alimento');
    });

    test('G2: guardar cambios actualiza monto en tabla y stat totalGastos del lote', async ({ page }) => {
      await loginAs(page);
      await page.locator('text=Lote Charolais Sur').first().click();
      await page.waitForSelector('text=CS-001', { timeout: 15_000 });
      await page.locator('button.tab-btn').filter({ hasText: /gastos/i }).click();
      await page.waitForSelector('text=Alimento febrero', { timeout: 10_000 });

      // Capturar stat de gastos antes
      const gastosCard = page.locator('.stat-card').filter({ hasText: 'Gastos' });
      const gastosAntes = await gastosCard.locator('.stat-value').textContent();

      const filaGasto = page.locator('tr').filter({ hasText: 'Alimento febrero' });
      await filaGasto.locator('button[title="Editar gasto"]').click();

      const modal = page.locator('.modal').last();
      await expect(modal).toBeVisible({ timeout: 5_000 });

      // Cambiar monto a 250000 (+50000 diff)
      await modal.locator('input[type="number"]').first().fill('250000');
      await modal.locator('button:has-text("Guardar cambios")').click();
      await expect(modal).not.toBeVisible({ timeout: 20_000 });

      // Stat totalGastos cambió
      await expect(gastosCard.locator('.stat-value')).not.toHaveText(gastosAntes ?? '', { timeout: 10_000 });
    });

    test('G3: cancelar modal NO modifica el gasto', async ({ page }) => {
      // depends on G2 — "Alimento febrero" monto is now 250000 (edited in G2)
      await loginAs(page);
      await page.locator('text=Lote Charolais Sur').first().click();
      await page.waitForSelector('text=CS-001', { timeout: 15_000 });
      await page.locator('button.tab-btn').filter({ hasText: /gastos/i }).click();
      await page.waitForSelector('text=Alimento febrero', { timeout: 10_000 });

      const filaGasto = page.locator('tr').filter({ hasText: 'Alimento febrero' });
      await filaGasto.locator('button[title="Editar gasto"]').click();

      const modal = page.locator('.modal').last();
      await expect(modal).toBeVisible({ timeout: 5_000 });
      await modal.locator('button:has-text("Cancelar")').click();
      await expect(modal).not.toBeVisible({ timeout: 5_000 });

      // El gasto sigue en la tabla (no se borró ni cambió)
      await expect(page.locator('tr').filter({ hasText: 'Alimento febrero' })).toBeVisible();
    });

    test('G4: botón 🗑️ abre ConfirmarBorradoModal con descripción del gasto', async ({ page }) => {
      await loginAs(page);
      await page.locator('text=Lote Charolais Sur').first().click();
      await page.waitForSelector('text=CS-001', { timeout: 15_000 });
      await page.locator('button.tab-btn').filter({ hasText: /gastos/i }).click();
      await page.waitForSelector('text=Transporte a subasta', { timeout: 10_000 });

      const filaGasto = page.locator('tr').filter({ hasText: 'Transporte a subasta' });
      await filaGasto.locator('button[title="Eliminar gasto"]').click();

      const modal = page.locator('.modal').last();
      await expect(modal).toBeVisible({ timeout: 5_000 });
      await expect(modal.locator('text=¿Eliminar este gasto?')).toBeVisible();
      // Descripción incluye el nombre del gasto
      await expect(modal.locator('text=Transporte a subasta')).toBeVisible();
    });

    test('G5: confirmar borrado elimina gasto de la tabla y actualiza totalGastos', async ({ page }) => {
      await loginAs(page);
      await page.locator('text=Lote Charolais Sur').first().click();
      await page.waitForSelector('text=CS-001', { timeout: 15_000 });
      await page.locator('button.tab-btn').filter({ hasText: /gastos/i }).click();
      await page.waitForSelector('text=Transporte a subasta', { timeout: 10_000 });

      const gastosCard = page.locator('.stat-card').filter({ hasText: 'Gastos' });
      const gastosAntes = await gastosCard.locator('.stat-value').textContent();

      const filaGasto = page.locator('tr').filter({ hasText: 'Transporte a subasta' });
      await filaGasto.locator('button[title="Eliminar gasto"]').click();

      const modal = page.locator('.modal').last();
      await expect(modal).toBeVisible({ timeout: 5_000 });
      await modal.locator('button:has-text("Eliminar")').click();
      await expect(modal).not.toBeVisible({ timeout: 20_000 });

      // Fila desaparece de la tabla
      await expect(page.locator('tr').filter({ hasText: 'Transporte a subasta' })).not.toBeVisible({ timeout: 10_000 });
      // Stat totalGastos bajó
      await expect(gastosCard.locator('.stat-value')).not.toHaveText(gastosAntes ?? '', { timeout: 10_000 });
    });

  });

  // ────────────────────────────────────────────────────────────────────────────
  // ANIMALES — Lote Brahman Norte (120 animales)
  // ────────────────────────────────────────────────────────────────────────────

  test.describe('Animales', () => {

    test('A1: botón ✏️ abre modal pre-llenado; campo arete está disabled', async ({ page }) => {
      await loginAs(page);
      await page.locator('text=Lote Brahman Norte').first().click();
      await page.waitForSelector('text=BN-001', { timeout: 15_000 });

      const filaBN001 = page.locator('tr').filter({ hasText: 'BN-001' });
      await filaBN001.locator('button[title="Editar animal"]').click();

      const modal = page.locator('.modal').last();
      await expect(modal).toBeVisible({ timeout: 5_000 });

      // Arete es el único input disabled en el modal de edición
      const areteInput = modal.locator('input[disabled]');
      await expect(areteInput).toBeVisible();
      await expect(areteInput).toHaveValue('BN-001');
      // Arete es inmutable en modo edición
      await expect(areteInput).toBeDisabled();
    });

    test('A2: guardar cambios (raza + precio) se refleja en tabla y actualiza totalInvertido', async ({ page }) => {
      await loginAs(page);
      await page.locator('text=Lote Brahman Norte').first().click();
      await page.waitForSelector('text=BN-001', { timeout: 15_000 });

      const invertidoCard = page.locator('.stat-card').filter({ hasText: 'Invertido' });
      const invertidoAntes = await invertidoCard.locator('.stat-value').textContent();

      const filaBN001 = page.locator('tr').filter({ hasText: 'BN-001' });
      await filaBN001.locator('button[title="Editar animal"]').click();

      const modal = page.locator('.modal').last();
      await expect(modal).toBeVisible({ timeout: 5_000 });

      // Cambiar raza a Angus
      await modal.locator('select.form-select').selectOption('Angus');
      // Cambiar precioCompra a 350000 (era 295000 → diff +55000)
      // El segundo input type=number es precioCompra (el primero es pesoInicial)
      await modal.locator('input[type="number"]').nth(1).fill('350000');
      await modal.locator('button:has-text("Guardar cambios")').click();
      await expect(modal).not.toBeVisible({ timeout: 20_000 });

      // Raza actualizada en tabla
      await expect(page.locator('tr').filter({ hasText: 'BN-001' }).locator('text=Angus')).toBeVisible({ timeout: 10_000 });
      // Stat totalInvertido cambió (+55000 sobre los ~34M del lote con 120 animales)
      await expect(invertidoCard.locator('.stat-value')).not.toHaveText(invertidoAntes ?? '', { timeout: 10_000 });
    });

    test('A3: botón 🗑️ abre ConfirmarBorradoModal con el arete del animal en el título', async ({ page }) => {
      await loginAs(page);
      await page.locator('text=Lote Brahman Norte').first().click();
      await page.waitForSelector('text=BN-001', { timeout: 15_000 });

      // BN-120 es el último animal bulk (el que se borrará en A4)
      const filaBN120 = page.locator('tr').filter({ hasText: 'BN-120' });
      await filaBN120.locator('button[title="Eliminar animal"]').click();

      const modal = page.locator('.modal').last();
      await expect(modal).toBeVisible({ timeout: 5_000 });
      // El título del modal incluye el arete
      await expect(modal.locator('text=BN-120')).toBeVisible();
    });

    test('A4: confirmar borrado elimina animal de tabla y decrece contador Activos', async ({ page }) => {
      await loginAs(page);
      await page.locator('text=Lote Brahman Norte').first().click();
      await page.waitForSelector('text=BN-001', { timeout: 15_000 });

      const activosCard = page.locator('.stat-card').filter({ hasText: 'Activos' });
      const activosAntes = await activosCard.locator('.stat-value').textContent();

      const filaBN120 = page.locator('tr').filter({ hasText: 'BN-120' });
      await filaBN120.locator('button[title="Eliminar animal"]').click();

      const modal = page.locator('.modal').last();
      await expect(modal).toBeVisible({ timeout: 5_000 });
      await modal.locator('button:has-text("Eliminar")').click();
      await expect(modal).not.toBeVisible({ timeout: 20_000 });

      // BN-120 desaparece de la tabla
      await expect(page.locator('tr').filter({ hasText: 'BN-120' })).not.toBeVisible({ timeout: 10_000 });
      // Contador Activos decreció (de 120 a 119)
      await expect(activosCard.locator('.stat-value')).not.toHaveText(activosAntes ?? '', { timeout: 10_000 });
    });

  });

  // ────────────────────────────────────────────────────────────────────────────
  // LOTES — Dashboard
  // ────────────────────────────────────────────────────────────────────────────

  test.describe('Lotes', () => {

    test('L1: botón ✏️ en lote-card abre modal pre-llenado SIN navegar al lote', async ({ page }) => {
      await loginAs(page);

      const loteCard = page.locator('.lote-card').filter({ hasText: 'Lote Criollo Zona Norte' });
      await loteCard.locator('button[title="Editar lote"]').click();

      const modal = page.locator('.modal').last();
      await expect(modal).toBeVisible({ timeout: 5_000 });
      // Modal pre-llena el nombre del lote (primer input del form)
      await expect(modal.locator('input').first()).toHaveValue('Lote Criollo Zona Norte');
      // La URL NO cambió (stopPropagation funcionó)
      await expect(page).toHaveURL('/');
    });

    test('L2: guardar cambios de nombre se refleja en el Dashboard', async ({ page }) => {
      await loginAs(page);

      const loteCard = page.locator('.lote-card').filter({ hasText: 'Lote Criollo Zona Norte' });
      await loteCard.locator('button[title="Editar lote"]').click();

      const modal = page.locator('.modal').last();
      await expect(modal).toBeVisible({ timeout: 5_000 });

      const nombreInput = modal.locator('input').first();
      await expect(nombreInput).toHaveValue('Lote Criollo Zona Norte');
      await nombreInput.fill('Lote Criollo Editado');
      await modal.locator('button:has-text("Guardar cambios")').click();
      await expect(modal).not.toBeVisible({ timeout: 20_000 });

      // Nuevo nombre visible en Dashboard
      await expect(page.locator('text=Lote Criollo Editado').first()).toBeVisible({ timeout: 10_000 });
      // Nombre anterior ya no aparece
      await expect(page.locator('text=Lote Criollo Zona Norte')).not.toBeVisible();
    });

    test('L3: cascade delete — crear lote con animal, borrar desde Dashboard, desaparece', async ({ page }) => {
      await loginAs(page);

      // ── Crear lote temporal ──
      await page.locator('button:has-text("+ Nuevo Lote"), button:has-text("Nuevo Lote")').first().click();
      const modalCrear = page.locator('.modal').last();
      await expect(modalCrear).toBeVisible({ timeout: 5_000 });
      await modalCrear.locator('input[placeholder*="Ej: Lote"]').fill('Lote E2E Cascade Delete');
      await modalCrear.locator('button:has-text("Crear Lote")').click();
      await expect(modalCrear).not.toBeVisible({ timeout: 15_000 });
      await expect(page.locator('text=Lote E2E Cascade Delete').first()).toBeVisible({ timeout: 10_000 });

      // ── Navegar al lote y agregar 1 animal ──
      await page.locator('text=Lote E2E Cascade Delete').first().click();
      await page.waitForURL(/\/lote\//, { timeout: 10_000 });
      await page.locator('button:has-text("+ Animal")').click();

      const modalAnimal = page.locator('.modal').last();
      await expect(modalAnimal).toBeVisible({ timeout: 5_000 });
      await modalAnimal.locator('input[placeholder*="CR-"]').fill('TEMP-001');
      await modalAnimal.locator('select.form-select').selectOption('Brahman');
      await modalAnimal.locator('input[type="number"]').nth(0).fill('300');
      await modalAnimal.locator('input[type="number"]').nth(1).fill('200000');
      await modalAnimal.locator('button:has-text("Agregar Animal")').click();
      await expect(modalAnimal).not.toBeVisible({ timeout: 15_000 });
      await expect(page.locator('text=TEMP-001')).toBeVisible({ timeout: 10_000 });

      // ── Volver al Dashboard ──
      await page.locator('button:has-text("← Volver")').click();
      await page.waitForURL('/', { timeout: 10_000 });

      // ── Eliminar el lote con cascade ──
      const cardTemp = page.locator('.lote-card').filter({ hasText: 'Lote E2E Cascade Delete' });
      await cardTemp.locator('button[title="Eliminar lote"]').click();

      const modalConfirm = page.locator('.modal').last();
      await expect(modalConfirm).toBeVisible({ timeout: 5_000 });
      // Advertencia de cascade visible
      await expect(modalConfirm.locator('text=Se eliminarán TODOS')).toBeVisible();
      await modalConfirm.locator('button:has-text("Eliminar")').click();
      await expect(modalConfirm).not.toBeVisible({ timeout: 25_000 });

      // El lote desaparece del Dashboard
      await expect(page.locator('text=Lote E2E Cascade Delete')).not.toBeVisible({ timeout: 10_000 });
    });

  });

  // ────────────────────────────────────────────────────────────────────────────
  // VENTAS — Lote Nelore Stress (90 animales en una venta)
  // ────────────────────────────────────────────────────────────────────────────

  test.describe('Ventas', () => {

    test('V1: botón "Anular" abre ConfirmarBorradoModal con texto de advertencia', async ({ page }) => {
      await loginAs(page);
      await page.locator('text=Lote Nelore Stress').first().click();
      await page.waitForSelector('text=NS-001', { timeout: 15_000 });

      await page.locator('button.tab-btn').filter({ hasText: /ventas/i }).click();
      await page.waitForSelector('.venta-card', { timeout: 10_000 });

      await page.locator('.venta-card').locator('button:has-text("Anular")').click();

      const modal = page.locator('.modal').last();
      await expect(modal).toBeVisible({ timeout: 5_000 });
      await expect(modal.locator('text=¿Anular esta venta?')).toBeVisible();
      // Advertencia de restauración de animales
      await expect(modal.locator('text=Los animales volverán a estado activo')).toBeVisible();
    });

    test('V2: confirmar anulación elimina la venta-card; tab muestra Ventas (0)', async ({ page }) => {
      await loginAs(page);
      await page.locator('text=Lote Nelore Stress').first().click();
      await page.waitForSelector('text=NS-001', { timeout: 15_000 });

      await page.locator('button.tab-btn').filter({ hasText: /ventas/i }).click();
      await page.waitForSelector('.venta-card', { timeout: 10_000 });

      await page.locator('.venta-card').locator('button:has-text("Anular")').click();

      const modal = page.locator('.modal').last();
      await expect(modal).toBeVisible({ timeout: 5_000 });
      await modal.locator('button:has-text("Anular venta")').click();

      // Timeout mayor: 90-animal batch commit puede tardar ~15-20 seg en Firestore
      await expect(modal).not.toBeVisible({ timeout: 35_000 });
      await expect(page.locator('.venta-card')).not.toBeVisible({ timeout: 10_000 });

      // La pestaña refleja 0 ventas
      await expect(
        page.locator('button.tab-btn').filter({ hasText: /ventas \(0\)/i })
      ).toBeVisible({ timeout: 10_000 });
    });

    test('V3: tras anular, los animales de la venta tienen badge activo (no vendido)', async ({ page }) => {
      await loginAs(page);
      await page.locator('text=Lote Nelore Stress').first().click();
      await page.waitForURL(/\/lote\//, { timeout: 10_000 });

      // Navegar explícitamente a la pestaña Animales
      await page.locator('button.tab-btn').filter({ hasText: /animales/i }).click();
      await page.waitForSelector('text=NS-001', { timeout: 15_000 });

      // depends on V2 — la venta de 90 animales fue anulada; todos deben ser activos ahora
      // Esperar a que los 90 animales cambien de vendido → activo (batch write de V2)
      const activoBadges = page.locator('span.badge').filter({ hasText: /^activo$/i });
      await expect(activoBadges).toHaveCount(100, { timeout: 20_000 }); // 10 originales + 90 restaurados

      // No debe haber ningún badge "vendido"
      const vendidoBadges = page.locator('span.badge').filter({ hasText: /^vendido$/i });
      await expect(vendidoBadges).toHaveCount(0, { timeout: 10_000 });

      // NS-011 era vendido → ahora debe tener badge activo
      const filaNS011 = page.locator('tr').filter({ hasText: 'NS-011' });
      await expect(filaNS011.locator('span.badge').filter({ hasText: /^activo$/i })).toBeVisible({ timeout: 10_000 });
    });

  });

});
