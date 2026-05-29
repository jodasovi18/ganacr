# Export a Excel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exportar inventario de animales y ventas por lote a un archivo Excel (.xlsx) descargable desde el Dashboard y desde LoteDetalle.

**Architecture:** Función utilitaria pura `exportarLotesExcel` en `src/utils/exportExcel.ts` usando SheetJS. El Dashboard hace queries puntuales a Firestore para obtener animales y ventas de todos los lotes antes de exportar. LoteDetalle usa los datos ya cargados en memoria para exportar instantáneamente.

**Tech Stack:** React 18, TypeScript, SheetJS (`xlsx`), Firebase Firestore (`getDocs`)

---

## File Map

| Archivo | Acción |
|---|---|
| `src/utils/exportExcel.ts` | Crear — función `exportarLotesExcel` con SheetJS |
| `src/pages/Dashboard.tsx` | Modificar — botón "📊 Excel" con estado de carga |
| `src/pages/Dashboard.css` | Modificar — estilos del botón |
| `src/pages/LoteDetalle.tsx` | Modificar — botón "📊 Excel" en header |
| `tests/qa/export-excel.spec.ts` | Crear — tests E2E Playwright |

---

## Task 1: Instalar SheetJS y crear `exportExcel.ts`

**Files:**
- Create: `src/utils/exportExcel.ts`

- [ ] **Step 1: Instalar SheetJS**

```bash
cd C:/Users/Usuario/Desktop/Sistemas/ganacr && npm install xlsx
```

Expected: `added 1 package` sin errores.

- [ ] **Step 2: Crear `src/utils/exportExcel.ts`**

```typescript
import * as XLSX from 'xlsx';
import { Animal, Lote, Venta } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitizarNombreHoja(nombre: string): string {
  // Excel sheet names: max 31 chars, no / \ ? * [ ]
  return nombre.replace(/[/\\?*[\]]/g, '_').substring(0, 31);
}

function fechaExcel(isoDate: string): string {
  // Convert YYYY-MM-DD to DD/MM/YYYY
  const parts = isoDate.substring(0, 10).split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// ─── Exportación principal ────────────────────────────────────────────────────

export function exportarLotesExcel(
  lotes: Lote[],
  animalesPorLote: Map<string, Animal[]>,
  ventasPorLote: Map<string, Venta[]>,
  nombreFinca: string
): void {
  const wb = XLSX.utils.book_new();

  for (const lote of lotes) {
    const animales = animalesPorLote.get(lote.id) ?? [];
    const ventas = ventasPorLote.get(lote.id) ?? [];
    const rows: (string | number)[][] = [];

    // ── Cabecera ──────────────────────────────────────────────────────────
    rows.push(['Lote:', lote.nombreLote]);
    rows.push(['Fecha de compra:', fechaExcel(lote.fechaCompra)]);
    if (lote.tipoPropiedad === 'medias' && lote.socio) {
      rows.push([
        'Sociedad:',
        `A medias con ${lote.socio.nombre} (${lote.socio.porcentaje}% / ${100 - lote.socio.porcentaje}%)`,
      ]);
    } else {
      rows.push(['Propiedad:', 'Propio']);
    }
    rows.push([]); // blank row

    // ── Inventario de animales ─────────────────────────────────────────────
    rows.push(['INVENTARIO DE ANIMALES']);
    rows.push([
      'Arete', 'Raza', 'Peso inicial (kg)', 'Peso actual (kg)',
      'Ganancia (kg)', 'Precio compra (₡)', 'Fecha ingreso', 'Estado',
    ]);

    if (animales.length === 0) {
      rows.push(['Sin animales registrados']);
    } else {
      for (const a of animales) {
        rows.push([
          a.numeroArete,
          a.raza,
          a.pesoInicial,
          a.pesoActual,
          a.pesoActual - a.pesoInicial,
          a.precioCompra,
          fechaExcel(a.fechaIngreso),
          a.estado,
        ]);
      }
    }

    rows.push([]); // blank row

    // ── Ventas ─────────────────────────────────────────────────────────────
    rows.push(['VENTAS']);
    const esMedias = lote.tipoPropiedad === 'medias';
    const headerVentas: string[] = [
      'Fecha', 'Cantidad animales', 'Total venta (₡)',
      'Total inversión (₡)', 'Gastos proporción (₡)', 'Utilidad bruta (₡)',
    ];
    if (esMedias) {
      headerVentas.push('Utilidad propietario (₡)', 'Utilidad socio (₡)');
    }
    rows.push(headerVentas);

    if (ventas.length === 0) {
      rows.push(['Sin ventas registradas']);
    } else {
      for (const v of ventas) {
        const row: (string | number)[] = [
          fechaExcel(v.fecha),
          v.cantidadAnimales,
          v.totalVenta,
          v.totalInversion,
          v.gastosProporcion,
          v.utilidadBruta,
        ];
        if (esMedias) {
          row.push(v.utilidadPropietario ?? 0, v.utilidadSocio ?? 0);
        }
        rows.push(row);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sanitizarNombreHoja(lote.nombreLote));
  }

  const fecha = new Date().toISOString().substring(0, 10);
  const safeFinca = nombreFinca.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `GanaCR_${safeFinca}_${fecha}.xlsx`);
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd C:/Users/Usuario/Desktop/Sistemas/ganacr && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/utils/exportExcel.ts package.json package-lock.json
git commit -m "feat(excel): add exportarLotesExcel utility with SheetJS"
```

---

## Task 2: Botón Excel en Dashboard

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/Dashboard.css`

- [ ] **Step 1: Agregar imports en Dashboard.tsx**

Después de `import { Lote, GastoFinca } from '@/types';` agregar:

```typescript
import { Animal, Venta } from '@/types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { exportarLotesExcel } from '@/utils/exportExcel';
```

- [ ] **Step 2: Agregar estado de exportación dentro de `Dashboard()`**

Después de `const [deletingId, setDeletingId] = useState<string | null>(null);` agregar:

```typescript
  const [exportando, setExportando] = useState(false);
  const [exportError, setExportError] = useState('');
```

También agregar `user` al destructuring de useAuth:

```typescript
  const { userData, logout, user } = useAuth();
```

- [ ] **Step 3: Agregar handler `handleExportarExcel`**

Antes del `return (` del componente agregar:

```typescript
  async function handleExportarExcel() {
    if (!fincaActiva || !user || lotes.length === 0) return;
    setExportando(true);
    setExportError('');
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 15_000)
      );
      const [animalesSnap, ventasSnap] = await Promise.race([
        Promise.all([
          getDocs(query(collection(db, 'animales'), where('userId', '==', user.uid), where('fincaId', '==', fincaActiva.id))),
          getDocs(query(collection(db, 'ventas'),   where('userId', '==', user.uid), where('fincaId', '==', fincaActiva.id))),
        ]),
        timeout,
      ]);

      const animalesPorLote = new Map<string, Animal[]>();
      animalesSnap.docs.forEach(d => {
        const a = { id: d.id, ...d.data() } as Animal;
        if (!animalesPorLote.has(a.loteId)) animalesPorLote.set(a.loteId, []);
        animalesPorLote.get(a.loteId)!.push(a);
      });

      const ventasPorLote = new Map<string, Venta[]>();
      ventasSnap.docs.forEach(d => {
        const v = { id: d.id, ...d.data() } as Venta;
        if (!ventasPorLote.has(v.loteId)) ventasPorLote.set(v.loteId, []);
        ventasPorLote.get(v.loteId)!.push(v);
      });

      exportarLotesExcel(lotes, animalesPorLote, ventasPorLote, fincaActiva.nombre);
    } catch (err) {
      console.error('[Dashboard] Error exportando Excel:', err);
      setExportError('No se pudo exportar. Intentá de nuevo.');
    } finally {
      setExportando(false);
    }
  }
```

- [ ] **Step 4: Agregar botón Excel en la UI**

En la sección "Mis Lotes", encontrar este bloque:

```tsx
            <div className="flex-between mb-2">
              <h2 className="section-title">Mis Lotes</h2>
              <button
                className="btn btn-primary"
                onClick={() => setShowCrear(true)}
                disabled={!fincaActiva}
              >
                + Nuevo Lote
              </button>
            </div>
```

Reemplazar por:

```tsx
            <div className="flex-between mb-2">
              <h2 className="section-title">Mis Lotes</h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {exportError && <span className="export-error-text">{exportError}</span>}
                {lotes.length > 0 && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleExportarExcel}
                    disabled={exportando || !fincaActiva}
                  >
                    {exportando ? '⏳ Exportando...' : '📊 Excel'}
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  onClick={() => setShowCrear(true)}
                  disabled={!fincaActiva}
                >
                  + Nuevo Lote
                </button>
              </div>
            </div>
```

- [ ] **Step 5: Agregar estilos en Dashboard.css**

Al final del archivo agregar:

```css
.export-error-text {
  font-size: 0.78rem;
  color: var(--color-danger);
}
```

- [ ] **Step 6: Verificar TypeScript**

```bash
cd C:/Users/Usuario/Desktop/Sistemas/ganacr && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Dashboard.tsx src/pages/Dashboard.css
git commit -m "feat(excel): add export Excel button to Dashboard"
```

---

## Task 3: Botón Excel en LoteDetalle

**Files:**
- Modify: `src/pages/LoteDetalle.tsx`

- [ ] **Step 1: Agregar import de exportarLotesExcel en LoteDetalle.tsx**

Después de `import MoverAnimalesModal from '@/components/MoverAnimalesModal';` agregar:

```typescript
import { exportarLotesExcel } from '@/utils/exportExcel';
```

- [ ] **Step 2: Agregar handler `handleExportarExcel` en LoteDetalle**

Antes del `return (` del componente, junto a los otros handlers, agregar:

```typescript
  function handleExportarExcel() {
    if (!lote || !fincaActiva) return;
    const animalesPorLote = new Map([[lote.id, animales]]);
    const ventasPorLote   = new Map([[lote.id, ventas]]);
    exportarLotesExcel([lote], animalesPorLote, ventasPorLote, fincaActiva.nombre);
  }
```

- [ ] **Step 3: Agregar botón Excel en el header de LoteDetalle**

Encontrar el bloque `detalle-acciones`:

```tsx
            <div className="detalle-acciones">
              <button className="btn btn-primary btn-sm" onClick={() => setShowAnimal(true)}>+ Animal</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowGasto(true)}>+ Gasto</button>
```

Agregar el botón Excel al final de `detalle-acciones`, antes del cierre `</div>`:

```tsx
              {animales.length > 0 && (
                <button className="btn btn-secondary btn-sm" onClick={handleExportarExcel}>
                  📊 Excel
                </button>
              )}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd C:/Users/Usuario/Desktop/Sistemas/ganacr && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 5: Verificar en dev server**

```bash
cd C:/Users/Usuario/Desktop/Sistemas/ganacr && npm run dev
```

Verificar manualmente:
- Botón "📊 Excel" visible en Dashboard (tab Lotes, con lotes cargados)
- Click en "📊 Excel" del Dashboard → aparece "⏳ Exportando..." → se descarga `GanaCR_Finca_YYYY-MM-DD.xlsx`
- Botón "📊 Excel" visible en header de LoteDetalle (cuando hay animales)
- Click en "📊 Excel" de LoteDetalle → descarga inmediata del archivo

- [ ] **Step 6: Commit**

```bash
git add src/pages/LoteDetalle.tsx
git commit -m "feat(excel): add export Excel button to LoteDetalle"
```

---

## Task 4: Playwright E2E Tests

**Files:**
- Create: `tests/qa/export-excel.spec.ts`

- [ ] **Step 1: Crear `tests/qa/export-excel.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Export a Excel', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test('botón Excel visible en Dashboard con lotes cargados', async ({ page }) => {
    await expect(page.locator('button', { hasText: /excel/i })).toBeVisible({ timeout: 10_000 });
  });

  test('botón Excel en Dashboard dispara descarga sin errores de consola', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.locator('button', { hasText: /excel/i }).first().click();

    // Wait for "Exportando..." to appear and disappear
    await expect(page.locator('button', { hasText: /exportando/i })).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('button', { hasText: /exportando/i })).not.toBeVisible({ timeout: 20_000 });

    // No new errors should have appeared
    const exportErrors = errors.filter(e => e.includes('exportando') || e.includes('Excel'));
    expect(exportErrors).toHaveLength(0);
  });

  test('botón Excel visible en LoteDetalle header', async ({ page }) => {
    await page.locator('text=Lote Brahman Norte').first().click();
    await page.waitForSelector('text=BN-001', { timeout: 12_000 });

    const excelBtn = page.locator('.detalle-acciones button', { hasText: /excel/i });
    await expect(excelBtn).toBeVisible({ timeout: 5_000 });
  });

  test('botón Excel en LoteDetalle no genera errores de consola', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.locator('text=Lote Brahman Norte').first().click();
    await page.waitForSelector('text=BN-001', { timeout: 12_000 });

    await page.locator('.detalle-acciones button', { hasText: /excel/i }).click();
    await page.waitForTimeout(1_000);

    const exportErrors = errors.filter(e => e.toLowerCase().includes('excel') || e.toLowerCase().includes('export'));
    expect(exportErrors).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add tests/qa/export-excel.spec.ts
git commit -m "test(excel): add Playwright E2E tests for export Excel buttons"
```

---

## Self-Review

**Spec coverage:**
- ✅ Función `exportarLotesExcel` con SheetJS → Task 1
- ✅ Una hoja por lote con nombre sanitizado → Task 1 `sanitizarNombreHoja`
- ✅ Cabecera + Inventario + Ventas por hoja → Task 1
- ✅ Columnas de utilidad socio/propietario solo en lotes "a medias" → Task 1 `esMedias`
- ✅ Lote sin animales → "Sin animales registrados" → Task 1
- ✅ Lote sin ventas → "Sin ventas registradas" → Task 1
- ✅ Nombre archivo: `GanaCR_[Finca]_[Fecha].xlsx` → Task 1
- ✅ Botón Dashboard con estado "Exportando..." → Task 2
- ✅ Timeout 15 segundos en Dashboard → Task 2 `handleExportarExcel`
- ✅ Toast de error si falla → Task 2 `exportError` state
- ✅ Deshabilitado si no hay lotes → Task 2 `lotes.length > 0`
- ✅ Botón LoteDetalle instantáneo → Task 3
- ✅ Solo visible si hay animales → Task 3 `animales.length > 0`
- ✅ Tests E2E → Task 4

**Placeholder scan:** ninguno.

**Type consistency:** `exportarLotesExcel(lotes, animalesPorLote, ventasPorLote, nombreFinca)` — firma consistente en Task 1 (definición), Task 2 (Dashboard), Task 3 (LoteDetalle).
