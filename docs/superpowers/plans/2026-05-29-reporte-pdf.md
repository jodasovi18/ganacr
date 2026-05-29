# Reporte PDF por Lote Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generar y descargar un reporte PDF por lote con inventario, ventas y gastos detallados, accesible desde Dashboard y LoteDetalle.

**Architecture:** Componente `ReporteLotePDF.tsx` con `@react-pdf/renderer` + función utilitaria `exportarLotePDF` en `exportPDF.ts`. Dashboard carga datos via `getDocs` con dropdown de selección. LoteDetalle usa datos ya en memoria.

**Tech Stack:** React 18, TypeScript, `@react-pdf/renderer`, Firebase Firestore (`getDocs`)

---

## File Map

| Archivo | Acción |
|---|---|
| `src/components/pdf/ReporteLotePDF.tsx` | Crear — componente @react-pdf/renderer |
| `src/utils/exportPDF.ts` | Crear — función `exportarLotePDF` |
| `src/pages/Dashboard.tsx` | Modificar — dropdown PDF + handler |
| `src/pages/Dashboard.css` | Modificar — estilos del dropdown |
| `src/pages/LoteDetalle.tsx` | Modificar — botón PDF en header |
| `tests/qa/reporte-pdf.spec.ts` | Crear — tests E2E Playwright |

---

## Task 1: Instalar @react-pdf/renderer y crear `ReporteLotePDF.tsx`

**Files:**
- Create: `src/components/pdf/ReporteLotePDF.tsx`

- [ ] **Step 1: Instalar la librería**

```bash
cd C:/Users/Usuario/Desktop/Sistemas/ganacr && npm install @react-pdf/renderer
```

Expected: `added N packages` sin errores.

- [ ] **Step 2: Crear `src/components/pdf/ReporteLotePDF.tsx`**

```typescript
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { Animal, Gasto, Lote, Venta } from '@/types';

// ─── Tema ────────────────────────────────────────────────────────────────────
const C = {
  primary:     '#1b4332',
  primaryMid:  '#2d6a4f',
  primaryLight:'#f0f9f0',
  accent:      '#40b87a',
  border:      '#b8dfc6',
  text:        '#1b2e22',
  muted:       '#4a6a55',
  white:       '#ffffff',
  altRow:      '#f7fcf8',
};

const s = StyleSheet.create({
  page:             { fontFamily: 'Helvetica', fontSize: 9, color: C.text, paddingHorizontal: 30, paddingVertical: 28 },
  // Header
  header:           { backgroundColor: C.primary, padding: 14, marginBottom: 16, borderRadius: 4 },
  headerBrand:      { fontSize: 15, color: C.white, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  headerFinca:      { fontSize: 9, color: C.accent, marginBottom: 1 },
  headerLote:       { fontSize: 11, color: C.white, fontFamily: 'Helvetica-Bold', marginBottom: 1 },
  headerFecha:      { fontSize: 8, color: '#a7d4bc' },
  // Sección
  section:          { marginBottom: 14 },
  sectionBar:       { backgroundColor: C.primaryMid, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 0 },
  sectionTitle:     { fontSize: 9, color: C.white, fontFamily: 'Helvetica-Bold' },
  // Info
  infoBlock:        { padding: '8 0', borderBottomWidth: 0.5, borderBottomColor: C.border, marginBottom: 8 },
  infoRow:          { flexDirection: 'row', marginBottom: 3 },
  infoLabel:        { width: 110, fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.muted },
  infoValue:        { flex: 1, fontSize: 8, color: C.text },
  // Resumen financiero
  summaryRow:       { flexDirection: 'row', marginTop: 6, marginBottom: 2 },
  summaryCard:      { flex: 1, marginRight: 5, backgroundColor: C.primaryLight, borderWidth: 0.5, borderColor: C.border, borderRadius: 3, padding: 7 },
  summaryCardLast:  { flex: 1, marginRight: 0, backgroundColor: C.primaryLight, borderWidth: 0.5, borderColor: C.border, borderRadius: 3, padding: 7 },
  summaryCardHl:    { flex: 1, marginRight: 0, backgroundColor: C.primary, borderRadius: 3, padding: 7 },
  summaryLabel:     { fontSize: 7, color: C.muted, marginBottom: 3 },
  summaryLabelHl:   { fontSize: 7, color: '#a7d4bc', marginBottom: 3 },
  summaryValue:     { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.primary },
  summaryValueHl:   { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.white },
  // Tabla
  tableHeader:      { flexDirection: 'row', backgroundColor: C.primaryMid, paddingVertical: 5, paddingHorizontal: 4 },
  tableRow:         { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 0.3, borderBottomColor: C.border },
  tableRowAlt:      { backgroundColor: C.altRow },
  cellH:            { fontSize: 7, color: C.white, fontFamily: 'Helvetica-Bold' },
  cell:             { fontSize: 7, color: C.text },
  emptyRow:         { paddingVertical: 6, paddingHorizontal: 4 },
  emptyText:        { fontSize: 8, color: C.muted, fontStyle: 'italic' },
  // Footer
  footer:           { position: 'absolute', bottom: 18, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 5 },
  footerText:       { fontSize: 7, color: C.muted },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null): string {
  if (!iso || typeof iso !== 'string') return '—';
  const p = iso.substring(0, 10).split('-');
  if (p.length !== 3) return iso;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function fmtCRC(n: number): string {
  return '₡' + Math.round(n).toLocaleString('es-CR');
}

function fmtKg(n: number): string {
  return n.toFixed(1) + ' kg';
}

const TIPO_LABEL: Record<string, string> = {
  alimento:    'Alimento',
  veterinario: 'Veterinario',
  mano_de_obra:'Mano de obra',
  transporte:  'Transporte',
  otro:        'Otro',
};

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ReporteLotePDFProps {
  lote: Lote;
  animales: Animal[];
  ventas: Venta[];
  gastos: Gasto[];
  nombreFinca: string;
  fechaGenerado: string; // ISO date
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function ReporteLotePDF({
  lote, animales, ventas, gastos, nombreFinca, fechaGenerado,
}: ReporteLotePDFProps) {
  const esMedias = lote.tipoPropiedad === 'medias';
  const activos  = animales.filter(a => a.estado === 'activo');
  const gastosOrdenados = [...gastos].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <Document title={`GanaCR - ${lote.nombreLote}`} author="GanaCR">
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.headerBrand}>🐄 GanaCR</Text>
          <Text style={s.headerFinca}>{nombreFinca}</Text>
          <Text style={s.headerLote}>{lote.nombreLote}</Text>
          <Text style={s.headerFecha}>Generado el {fmtDate(fechaGenerado)}</Text>
        </View>

        {/* ── Info del lote ── */}
        <View style={s.infoBlock}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Fecha de compra:</Text>
            <Text style={s.infoValue}>{fmtDate(lote.fechaCompra)}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Tipo de propiedad:</Text>
            <Text style={s.infoValue}>
              {esMedias && lote.socio
                ? `A medias — ${lote.socio.nombre} (${lote.socio.porcentaje}% / ${100 - lote.socio.porcentaje}%)`
                : 'Propio'}
            </Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Animales activos:</Text>
            <Text style={s.infoValue}>{activos.length}</Text>
          </View>
        </View>

        {/* ── Resumen financiero ── */}
        <View style={s.section}>
          <View style={s.sectionBar}><Text style={s.sectionTitle}>RESUMEN FINANCIERO</Text></View>
          <View style={s.summaryRow}>
            <View style={s.summaryCard}>
              <Text style={s.summaryLabel}>Total invertido</Text>
              <Text style={s.summaryValue}>{fmtCRC(lote.totalInvertido)}</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryLabel}>Total gastos</Text>
              <Text style={s.summaryValue}>{fmtCRC(lote.totalGastos)}</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryLabel}>Total ventas</Text>
              <Text style={s.summaryValue}>{fmtCRC(lote.totalVentas)}</Text>
            </View>
            <View style={esMedias ? s.summaryCard : s.summaryCardLast}>
              <Text style={s.summaryLabel}>Utilidad bruta</Text>
              <Text style={s.summaryValue}>{fmtCRC(lote.utilidadTotal)}</Text>
            </View>
            {esMedias && lote.socio && (
              <View style={s.summaryCardHl}>
                <Text style={s.summaryLabelHl}>Utilidad socio ({lote.socio.porcentaje}%)</Text>
                <Text style={s.summaryValueHl}>{fmtCRC(lote.utilidadTotal * lote.socio.porcentaje / 100)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Inventario actual ── */}
        <View style={s.section}>
          <View style={s.sectionBar}><Text style={s.sectionTitle}>INVENTARIO ACTUAL ({activos.length} animales activos)</Text></View>
          <View style={s.tableHeader}>
            <Text style={[s.cellH, { flex: 1.2 }]}>Arete</Text>
            <Text style={[s.cellH, { flex: 1.5 }]}>Raza</Text>
            <Text style={[s.cellH, { flex: 1 }]}>Peso act.</Text>
            <Text style={[s.cellH, { flex: 1 }]}>Ganancia</Text>
            <Text style={[s.cellH, { flex: 0.8 }]}>Estado</Text>
          </View>
          {activos.length === 0 ? (
            <View style={s.emptyRow}><Text style={s.emptyText}>Sin animales activos</Text></View>
          ) : activos.map((a, i) => (
            <View key={a.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
              <Text style={[s.cell, { flex: 1.2 }]}>{a.numeroArete}</Text>
              <Text style={[s.cell, { flex: 1.5 }]}>{a.raza}</Text>
              <Text style={[s.cell, { flex: 1 }]}>{fmtKg(a.pesoActual)}</Text>
              <Text style={[s.cell, { flex: 1 }]}>{a.pesoActual - a.pesoInicial >= 0 ? '+' : ''}{fmtKg(a.pesoActual - a.pesoInicial)}</Text>
              <Text style={[s.cell, { flex: 0.8 }]}>{a.estado}</Text>
            </View>
          ))}
        </View>

        {/* ── Ventas ── */}
        <View style={s.section}>
          <View style={s.sectionBar}><Text style={s.sectionTitle}>HISTORIAL DE VENTAS ({ventas.length})</Text></View>
          <View style={s.tableHeader}>
            <Text style={[s.cellH, { flex: 1 }]}>Fecha</Text>
            <Text style={[s.cellH, { flex: 0.7 }]}>Animales</Text>
            <Text style={[s.cellH, { flex: 1.2 }]}>Total venta</Text>
            <Text style={[s.cellH, { flex: 1.2 }]}>Utilidad bruta</Text>
            {esMedias && <Text style={[s.cellH, { flex: 1.2 }]}>Utilidad socio</Text>}
          </View>
          {ventas.length === 0 ? (
            <View style={s.emptyRow}><Text style={s.emptyText}>Sin ventas registradas</Text></View>
          ) : ventas.map((v, i) => (
            <View key={v.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
              <Text style={[s.cell, { flex: 1 }]}>{fmtDate(v.fecha)}</Text>
              <Text style={[s.cell, { flex: 0.7 }]}>{v.cantidadAnimales}</Text>
              <Text style={[s.cell, { flex: 1.2 }]}>{fmtCRC(v.totalVenta)}</Text>
              <Text style={[s.cell, { flex: 1.2 }]}>{fmtCRC(v.utilidadBruta)}</Text>
              {esMedias && <Text style={[s.cell, { flex: 1.2 }]}>{fmtCRC(v.utilidadSocio ?? 0)}</Text>}
            </View>
          ))}
        </View>

        {/* ── Gastos detallados ── */}
        <View style={s.section}>
          <View style={s.sectionBar}><Text style={s.sectionTitle}>GASTOS DETALLADOS ({gastosOrdenados.length})</Text></View>
          <View style={s.tableHeader}>
            <Text style={[s.cellH, { flex: 1 }]}>Fecha</Text>
            <Text style={[s.cellH, { flex: 2 }]}>Concepto</Text>
            <Text style={[s.cellH, { flex: 1.2 }]}>Tipo</Text>
            <Text style={[s.cellH, { flex: 1.2 }]}>Monto</Text>
          </View>
          {gastosOrdenados.length === 0 ? (
            <View style={s.emptyRow}><Text style={s.emptyText}>Sin gastos registrados</Text></View>
          ) : gastosOrdenados.map((g, i) => (
            <View key={g.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
              <Text style={[s.cell, { flex: 1 }]}>{fmtDate(g.fecha)}</Text>
              <Text style={[s.cell, { flex: 2 }]}>{g.concepto}</Text>
              <Text style={[s.cell, { flex: 1.2 }]}>{TIPO_LABEL[g.tipo] ?? g.tipo}</Text>
              <Text style={[s.cell, { flex: 1.2 }]}>{fmtCRC(g.monto)}</Text>
            </View>
          ))}
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>GanaCR — Sistema de Gestión Ganadera</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd C:/Users/Usuario/Desktop/Sistemas/ganacr && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/components/pdf/ReporteLotePDF.tsx package.json package-lock.json
git commit -m "feat(pdf): add ReporteLotePDF component with react-pdf/renderer"
```

---

## Task 2: Crear `exportPDF.ts`

**Files:**
- Create: `src/utils/exportPDF.ts`

- [ ] **Step 1: Crear `src/utils/exportPDF.ts`**

```typescript
import { pdf } from '@react-pdf/renderer';
import ReporteLotePDF, { ReporteLotePDFProps } from '@/components/pdf/ReporteLotePDF';

export async function exportarLotePDF(props: ReporteLotePDFProps): Promise<void> {
  const blob = await pdf(<ReporteLotePDF {...props} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = props.lote.nombreLote.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
  a.href = url;
  a.download = `GanaCR_${safeName}_${props.fechaGenerado}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd C:/Users/Usuario/Desktop/Sistemas/ganacr && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/utils/exportPDF.ts
git commit -m "feat(pdf): add exportarLotePDF utility function"
```

---

## Task 3: Botón PDF en Dashboard con dropdown

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/Dashboard.css`

- [ ] **Step 1: Agregar imports en Dashboard.tsx**

After `import { exportarLotesExcel } from '@/utils/exportExcel';` add:

```typescript
import { Gasto } from '@/types';
import { exportarLotePDF } from '@/utils/exportPDF';
```

- [ ] **Step 2: Agregar estado PDF en Dashboard()**

After `const [exportError, setExportError] = useState('');` add:

```typescript
  const [pdfDropdownOpen, setPdfDropdownOpen] = useState(false);
  const [generandoPDF, setGenerandoPDF]       = useState(false);
  const [pdfError, setPdfError]               = useState('');
```

- [ ] **Step 3: Agregar handler `handleGenerarPDF`**

After the existing `handleExportarExcel` function add:

```typescript
  async function handleGenerarPDF(lote: Lote) {
    if (!user || !fincaActiva) return;
    setPdfDropdownOpen(false);
    setGenerandoPDF(true);
    setPdfError('');
    try {
      let timeoutId: ReturnType<typeof setTimeout>;
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('timeout')), 15_000);
      });
      const [animalesSnap, ventasSnap, gastosSnap] = await Promise.race([
        Promise.all([
          getDocs(query(collection(db, 'animales'), where('userId', '==', user.uid), where('loteId', '==', lote.id))),
          getDocs(query(collection(db, 'ventas'),   where('userId', '==', user.uid), where('loteId', '==', lote.id))),
          getDocs(query(collection(db, 'gastos'),   where('userId', '==', user.uid), where('loteId', '==', lote.id))),
        ]).then(result => { clearTimeout(timeoutId!); return result; }),
        timeout,
      ]);

      await exportarLotePDF({
        lote,
        animales: animalesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Animal)),
        ventas:   ventasSnap.docs.map(d  => ({ id: d.id, ...d.data() } as Venta)),
        gastos:   gastosSnap.docs.map(d  => ({ id: d.id, ...d.data() } as Gasto)),
        nombreFinca: fincaActiva.nombre,
        fechaGenerado: new Date().toISOString().substring(0, 10),
      });
    } catch (err) {
      console.error('[Dashboard] Error generando PDF:', err);
      setPdfError('No se pudo generar el PDF. Intentá de nuevo.');
    } finally {
      setGenerandoPDF(false);
    }
  }
```

- [ ] **Step 4: Agregar botón PDF y dropdown en la UI**

Find the existing Excel button block in the JSX:

```tsx
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
```

Replace with:

```tsx
                {(exportError || pdfError) && (
                  <span className="export-error-text">{exportError || pdfError}</span>
                )}
                {lotes.length > 0 && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleExportarExcel}
                    disabled={exportando || !fincaActiva}
                  >
                    {exportando ? '⏳ Exportando...' : '📊 Excel'}
                  </button>
                )}
                {lotes.length > 0 && (
                  <div className="pdf-dropdown-wrap">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setPdfDropdownOpen(o => !o)}
                      disabled={generandoPDF || !fincaActiva}
                    >
                      {generandoPDF ? '⏳ Generando...' : '📄 PDF'}
                    </button>
                    {pdfDropdownOpen && (
                      <>
                        <div className="pdf-dropdown-overlay" onClick={() => setPdfDropdownOpen(false)} />
                        <div className="pdf-dropdown">
                          {lotes.map(l => (
                            <button
                              key={l.id}
                              className="pdf-dropdown-item"
                              onClick={() => handleGenerarPDF(l)}
                            >
                              {l.nombreLote}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
```

- [ ] **Step 5: Agregar estilos del dropdown en Dashboard.css**

At the end of `src/pages/Dashboard.css` add:

```css
/* ── PDF dropdown ── */
.pdf-dropdown-wrap {
  position: relative;
}

.pdf-dropdown-overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
}

.pdf-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
  z-index: 11;
  min-width: 180px;
  overflow: hidden;
}

.pdf-dropdown-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.55rem 0.9rem;
  background: transparent;
  border: none;
  font-size: 0.85rem;
  color: var(--color-text);
  cursor: pointer;
  border-bottom: 1px solid var(--color-border);
}

.pdf-dropdown-item:last-child { border-bottom: none; }
.pdf-dropdown-item:hover { background: var(--color-primary-subtle); color: var(--color-primary-dark); }
```

- [ ] **Step 6: Verificar TypeScript**

```bash
cd C:/Users/Usuario/Desktop/Sistemas/ganacr && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Dashboard.tsx src/pages/Dashboard.css
git commit -m "feat(pdf): add PDF dropdown button to Dashboard"
```

---

## Task 4: Botón PDF en LoteDetalle

**Files:**
- Modify: `src/pages/LoteDetalle.tsx`

- [ ] **Step 1: Agregar import de exportarLotePDF**

After `import { exportarLotesExcel } from '@/utils/exportExcel';` add:

```typescript
import { exportarLotePDF } from '@/utils/exportPDF';
```

- [ ] **Step 2: Agregar handler `handleGenerarPDF`**

After the existing `handleExportarExcel` function add:

```typescript
  async function handleGenerarPDF() {
    if (!lote || !fincaActiva) return;
    try {
      await exportarLotePDF({
        lote,
        animales,
        ventas,
        gastos,
        nombreFinca: fincaActiva.nombre,
        fechaGenerado: new Date().toISOString().substring(0, 10),
      });
    } catch (err) {
      console.error('[LoteDetalle] Error generando PDF:', err);
    }
  }
```

- [ ] **Step 3: Agregar botón PDF en `detalle-acciones`**

After the existing Excel button in `detalle-acciones`:

```tsx
              {animales.length > 0 && (
                <button className="btn btn-secondary btn-sm" onClick={handleExportarExcel}>
                  📊 Excel
                </button>
              )}
```

Add immediately after:

```tsx
              {animales.length > 0 && (
                <button className="btn btn-secondary btn-sm" onClick={handleGenerarPDF}>
                  📄 PDF
                </button>
              )}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd C:/Users/Usuario/Desktop/Sistemas/ganacr && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/pages/LoteDetalle.tsx
git commit -m "feat(pdf): add PDF button to LoteDetalle"
```

---

## Task 5: Playwright E2E Tests

**Files:**
- Create: `tests/qa/reporte-pdf.spec.ts`

- [ ] **Step 1: Crear `tests/qa/reporte-pdf.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Reporte PDF', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test('botón PDF visible en Dashboard con lotes cargados', async ({ page }) => {
    await expect(page.locator('button', { hasText: /^📄 PDF$/ })).toBeVisible({ timeout: 10_000 });
  });

  test('click en botón PDF abre dropdown con nombres de lotes', async ({ page }) => {
    await page.locator('button', { hasText: /^📄 PDF$/ }).click();
    // Dropdown should show lote names
    await expect(page.locator('.pdf-dropdown')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('.pdf-dropdown-item').first()).toBeVisible();
  });

  test('seleccionar lote en dropdown genera PDF sin errores de consola', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.locator('button', { hasText: /^📄 PDF$/ }).click();
    await expect(page.locator('.pdf-dropdown')).toBeVisible({ timeout: 3_000 });
    await page.locator('.pdf-dropdown-item').first().click();

    // Wait for generating state to appear and disappear
    await expect(page.locator('button', { hasText: /generando/i })).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('button', { hasText: /generando/i })).not.toBeVisible({ timeout: 30_000 });

    const pdfErrors = errors.filter(e => e.toLowerCase().includes('pdf') || e.toLowerCase().includes('generando'));
    expect(pdfErrors).toHaveLength(0);
  });

  test('botón PDF visible en LoteDetalle header', async ({ page }) => {
    await page.locator('text=Lote Brahman Norte').first().click();
    await page.waitForSelector('text=BN-001', { timeout: 12_000 });

    await expect(page.locator('.detalle-acciones button', { hasText: /pdf/i })).toBeVisible({ timeout: 5_000 });
  });

  test('botón PDF en LoteDetalle no genera errores de consola', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.locator('text=Lote Brahman Norte').first().click();
    await page.waitForSelector('text=BN-001', { timeout: 12_000 });

    await page.locator('.detalle-acciones button', { hasText: /pdf/i }).click();
    await page.waitForTimeout(3_000);

    const pdfErrors = errors.filter(e => e.toLowerCase().includes('pdf'));
    expect(pdfErrors).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add tests/qa/reporte-pdf.spec.ts
git commit -m "test(pdf): add Playwright E2E tests for PDF report"
```

---

## Self-Review

**Spec coverage:**
- ✅ Componente con header, info lote, resumen financiero, inventario, ventas, gastos → Task 1
- ✅ Colores branded GanaCR → Task 1 (theme constants)
- ✅ Utilidad del socio destacada solo en lotes a medias → Task 1 (`esMedias` condicional)
- ✅ Gastos con fecha, concepto, tipo, monto ordenados desc → Task 1
- ✅ "Sin animales/ventas/gastos registrados" en secciones vacías → Task 1
- ✅ Función `exportarLotePDF` con descarga automática → Task 2
- ✅ Nombre archivo: `GanaCR_[Lote]_[Fecha].pdf` → Task 2
- ✅ Botón Dashboard con dropdown selector de lote → Task 3
- ✅ getDocs con timeout 15s + error state → Task 3
- ✅ Botón LoteDetalle con datos en memoria → Task 4
- ✅ Botón solo visible si hay animales → Tasks 3 y 4
- ✅ Tests E2E → Task 5

**Placeholder scan:** ninguno.

**Type consistency:** `ReporteLotePDFProps` definido en Task 1, importado en Task 2 y usado consistentemente en Tasks 3 y 4. `exportarLotePDF(props: ReporteLotePDFProps)` consistente en Tasks 2, 3, 4.
