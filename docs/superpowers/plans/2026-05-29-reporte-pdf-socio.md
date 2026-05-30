# Reporte PDF para Socio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar reporte PDF descargable para el socio de lotes a medias, con diseño centrado en su utilidad y porcentaje, y corregir el símbolo ₡ en ambos PDFs usando fuente Roboto.

**Architecture:** Componente `ReporteSocioPDF.tsx` independiente de `ReporteLotePDF`, función `exportarSocioPDF` en `exportPDF.ts`, botón `🤝 PDF Socio` en LoteDetalle visible solo en lotes a medias. Ambos PDFs usan fuente Roboto (Google Fonts CDN) para soporte del glifo ₡.

**Tech Stack:** React 18, TypeScript, `@react-pdf/renderer`, fuente Roboto vía CDN

---

## File Map

| Archivo | Acción |
|---|---|
| `src/components/pdf/ReporteSocioPDF.tsx` | Crear — componente PDF para socio |
| `src/utils/exportPDF.ts` | Modificar — agregar `exportarSocioPDF` |
| `src/pages/LoteDetalle.tsx` | Modificar — botón PDF Socio + handler |
| `src/components/pdf/ReporteLotePDF.tsx` | Modificar — fix fuente Roboto para ₡ |

---

## Task 1: Fix fuente ₡ en ReporteLotePDF

**Files:**
- Modify: `src/components/pdf/ReporteLotePDF.tsx`

- [ ] **Step 1: Leer el archivo actual**

```bash
# Verificar que el archivo existe
ls src/components/pdf/ReporteLotePDF.tsx
```

- [ ] **Step 2: Agregar registro de fuente Roboto**

En `src/components/pdf/ReporteLotePDF.tsx`, agregar después del import de `@react-pdf/renderer`:

```typescript
import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer';

Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf' },
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmEU9fBBc-.ttf',
      fontWeight: 'bold',
    },
  ],
});
```

- [ ] **Step 3: Reemplazar fuentes Helvetica por Roboto en StyleSheet**

En el objeto `s` de `StyleSheet.create`, reemplazar:
- `fontFamily: 'Helvetica'` → `fontFamily: 'Roboto'`
- `fontFamily: 'Helvetica-Bold'` → `fontFamily: 'Roboto'` + `fontWeight: 'bold'`

El estilo `page` queda:
```typescript
page: { fontFamily: 'Roboto', fontSize: 9, color: C.text, paddingHorizontal: 30, paddingVertical: 28 },
```

Los estilos que usaban `Helvetica-Bold` (headerBrand, headerLote, sectionTitle, cellH, summaryValue, summaryValueHl):
```typescript
headerBrand:  { fontSize: 15, color: C.white, fontWeight: 'bold', marginBottom: 3 },
headerLote:   { fontSize: 11, color: C.white, fontWeight: 'bold', marginBottom: 1 },
sectionTitle: { fontSize: 9, color: C.white, fontWeight: 'bold' },
cellH:        { fontSize: 7, color: C.white, fontWeight: 'bold' },
summaryValue: { fontSize: 10, fontWeight: 'bold', color: C.primary },
summaryValueHl: { fontSize: 10, fontWeight: 'bold', color: C.white },
infoLabel:    { width: 110, fontSize: 8, fontWeight: 'bold', color: C.muted },
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd C:/Users/Usuario/Desktop/Sistemas/ganacr/.claude/worktrees/naughty-goodall-41993c && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/components/pdf/ReporteLotePDF.tsx
git commit -m "fix(pdf): use Roboto font for ₡ glyph support in ReporteLotePDF"
```

---

## Task 2: Crear ReporteSocioPDF.tsx

**Files:**
- Create: `src/components/pdf/ReporteSocioPDF.tsx`

- [ ] **Step 1: Crear el componente**

Crear `src/components/pdf/ReporteSocioPDF.tsx`:

```typescript
import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer';
import { Animal, Gasto, Lote, Venta } from '@/types';

Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf' },
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmEU9fBBc-.ttf',
      fontWeight: 'bold',
    },
  ],
});

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
  page:             { fontFamily: 'Roboto', fontSize: 9, color: C.text, paddingHorizontal: 30, paddingVertical: 28 },
  // Header
  header:           { backgroundColor: C.primary, padding: 14, marginBottom: 16, borderRadius: 4 },
  headerBrand:      { fontSize: 15, color: C.white, fontWeight: 'bold', marginBottom: 3 },
  headerPara:       { fontSize: 9, color: '#a7d4bc', marginBottom: 2 },
  headerSocio:      { fontSize: 13, color: C.white, fontWeight: 'bold', marginBottom: 2 },
  headerLote:       { fontSize: 9, color: C.accent, marginBottom: 1 },
  headerFecha:      { fontSize: 8, color: '#a7d4bc' },
  // Hero
  hero:             { backgroundColor: C.primaryMid, borderRadius: 6, padding: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'center' },
  heroIcon:         { fontSize: 22, marginRight: 12 },
  heroMain:         { flex: 1 },
  heroLabel:        { fontSize: 7, color: '#a7d4bc', marginBottom: 4 },
  heroValue:        { fontSize: 20, color: C.white, fontWeight: 'bold' },
  heroSub:          { fontSize: 7, color: '#a7d4bc', marginTop: 2 },
  heroPct:          { width: 48, height: 48, backgroundColor: C.accent, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  heroPctNum:       { fontSize: 16, fontWeight: 'bold', color: C.white },
  heroPctLabel:     { fontSize: 6, color: 'rgba(255,255,255,0.8)' },
  // Info
  infoBlock:        { paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: C.border, marginBottom: 10 },
  infoRow:          { flexDirection: 'row', marginBottom: 3 },
  infoLabel:        { width: 110, fontSize: 8, fontWeight: 'bold', color: C.muted },
  infoValue:        { flex: 1, fontSize: 8, color: C.text },
  // Section
  section:          { marginBottom: 14 },
  sectionBar:       { backgroundColor: C.primaryMid, paddingHorizontal: 8, paddingVertical: 5 },
  sectionTitle:     { fontSize: 9, color: C.white, fontWeight: 'bold' },
  // Summary
  summaryRow:       { flexDirection: 'row', marginTop: 6, marginBottom: 2 },
  summaryCard:      { flex: 1, marginRight: 5, backgroundColor: C.primaryLight, borderWidth: 0.5, borderColor: C.border, borderRadius: 3, padding: 7 },
  summaryCardLast:  { flex: 1, marginRight: 0, backgroundColor: C.primaryLight, borderWidth: 0.5, borderColor: C.border, borderRadius: 3, padding: 7 },
  summaryCardHl:    { flex: 1, marginRight: 0, backgroundColor: C.primary, borderRadius: 3, padding: 7 },
  summaryLabel:     { fontSize: 7, color: C.muted, marginBottom: 3 },
  summaryLabelHl:   { fontSize: 7, color: '#a7d4bc', marginBottom: 3 },
  summaryValue:     { fontSize: 10, fontWeight: 'bold', color: C.primary },
  summaryValueHl:   { fontSize: 10, fontWeight: 'bold', color: C.white },
  // Table
  tableHeader:      { flexDirection: 'row', backgroundColor: C.primaryMid, paddingVertical: 5, paddingHorizontal: 4 },
  tableRow:         { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 0.3, borderBottomColor: C.border },
  tableRowAlt:      { backgroundColor: C.altRow },
  cellH:            { fontSize: 7, color: C.white, fontWeight: 'bold' },
  cell:             { fontSize: 7, color: C.text },
  emptyRow:         { paddingVertical: 6, paddingHorizontal: 4 },
  emptyText:        { fontSize: 8, color: C.muted, fontStyle: 'italic' },
  // Footer
  footer:           { position: 'absolute', bottom: 18, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 5 },
  footerText:       { fontSize: 7, color: C.muted },
});

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

export interface ReporteSocioPDFProps {
  lote: Lote;
  animales: Animal[];
  ventas: Venta[];
  gastos: Gasto[];
  nombreFinca: string;
  nombreDueno: string;
  fechaGenerado: string;
}

export default function ReporteSocioPDF({
  lote, animales, ventas, gastos, nombreFinca, nombreDueno, fechaGenerado,
}: ReporteSocioPDFProps) {
  const socio = lote.socio!;
  const pctSocio = socio.porcentaje;
  const pctDueno = 100 - pctSocio;
  const activos = animales.filter(a => a.estado === 'activo');
  const gastosOrdenados = [...gastos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const utilidadSocio = lote.utilidadTotal * pctSocio / 100;

  return (
    <Document title={`GanaCR - Reporte Socio - ${lote.nombreLote}`} author="GanaCR">
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.headerBrand}>GanaCR</Text>
          <Text style={s.headerPara}>Reporte para socio</Text>
          <Text style={s.headerSocio}>{socio.nombre}</Text>
          <Text style={s.headerLote}>{nombreFinca} · {lote.nombreLote}</Text>
          <Text style={s.headerFecha}>Generado el {fmtDate(fechaGenerado)}</Text>
        </View>

        {/* ── Hero: utilidad del socio ── */}
        <View style={s.hero}>
          <Text style={s.heroIcon}>🤝</Text>
          <View style={s.heroMain}>
            <Text style={s.heroLabel}>TU UTILIDAD ACUMULADA</Text>
            <Text style={s.heroValue}>{fmtCRC(utilidadSocio)}</Text>
            <Text style={s.heroSub}>Sobre {fmtCRC(lote.utilidadTotal)} de utilidad bruta total</Text>
          </View>
          <View style={s.heroPct}>
            <Text style={s.heroPctNum}>{pctSocio}%</Text>
            <Text style={s.heroPctLabel}>tu parte</Text>
          </View>
        </View>

        {/* ── Info del lote ── */}
        <View style={s.infoBlock}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Fecha de compra:</Text>
            <Text style={s.infoValue}>{fmtDate(lote.fechaCompra)}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Socios:</Text>
            <Text style={s.infoValue}>{nombreDueno} ({pctDueno}%) · {socio.nombre} ({pctSocio}%)</Text>
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
            <View style={s.summaryCard}>
              <Text style={s.summaryLabel}>Utilidad bruta</Text>
              <Text style={s.summaryValue}>{fmtCRC(lote.utilidadTotal)}</Text>
            </View>
            <View style={s.summaryCardHl}>
              <Text style={s.summaryLabelHl}>Tu utilidad ({pctSocio}%)</Text>
              <Text style={s.summaryValueHl}>{fmtCRC(utilidadSocio)}</Text>
            </View>
          </View>
        </View>

        {/* ── Inventario ── */}
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
            <Text style={[s.cellH, { flex: 1.2 }]}>Tu utilidad ({pctSocio}%)</Text>
          </View>
          {ventas.length === 0 ? (
            <View style={s.emptyRow}><Text style={s.emptyText}>Sin ventas registradas</Text></View>
          ) : ventas.map((v, i) => (
            <View key={v.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
              <Text style={[s.cell, { flex: 1 }]}>{fmtDate(v.fecha)}</Text>
              <Text style={[s.cell, { flex: 0.7 }]}>{v.cantidadAnimales}</Text>
              <Text style={[s.cell, { flex: 1.2 }]}>{fmtCRC(v.totalVenta)}</Text>
              <Text style={[s.cell, { flex: 1.2 }]}>{fmtCRC(v.utilidadBruta)}</Text>
              <Text style={[s.cell, { flex: 1.2 }]}>{fmtCRC(v.utilidadSocio ?? 0)}</Text>
            </View>
          ))}
        </View>

        {/* ── Gastos ── */}
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
          <Text style={s.footerText}>GanaCR — Reporte generado para {socio.nombre}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Página ${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd C:/Users/Usuario/Desktop/Sistemas/ganacr/.claude/worktrees/naughty-goodall-41993c && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/pdf/ReporteSocioPDF.tsx
git commit -m "feat(pdf): add ReporteSocioPDF component for partner report"
```

---

## Task 3: Agregar exportarSocioPDF en exportPDF.ts

**Files:**
- Modify: `src/utils/exportPDF.ts`

- [ ] **Step 1: Agregar import y función**

El archivo `src/utils/exportPDF.ts` actualmente contiene solo `exportarLotePDF`. Reemplazar su contenido completo por:

```typescript
import { pdf, DocumentProps } from '@react-pdf/renderer';
import { createElement, ReactElement } from 'react';
import ReporteLotePDF, { ReporteLotePDFProps } from '@/components/pdf/ReporteLotePDF';
import ReporteSocioPDF, { ReporteSocioPDFProps } from '@/components/pdf/ReporteSocioPDF';

export async function exportarLotePDF(props: ReporteLotePDFProps): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = createElement(ReporteLotePDF, props) as unknown as ReactElement<DocumentProps, any>;
  const blob = await pdf(el).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = props.lote.nombreLote.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
  a.href = url;
  a.download = `GanaCR_${safeName}_${props.fechaGenerado}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportarSocioPDF(props: ReporteSocioPDFProps): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = createElement(ReporteSocioPDF, props) as unknown as ReactElement<DocumentProps, any>;
  const blob = await pdf(el).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeLote = props.lote.nombreLote.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  const safeSocio = props.lote.socio!.nombre.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
  a.href = url;
  a.download = `GanaCR_Socio_${safeSocio}_${safeLote}_${props.fechaGenerado}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd C:/Users/Usuario/Desktop/Sistemas/ganacr/.claude/worktrees/naughty-goodall-41993c && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/utils/exportPDF.ts
git commit -m "feat(pdf): add exportarSocioPDF utility function"
```

---

## Task 4: Botón PDF Socio en LoteDetalle

**Files:**
- Modify: `src/pages/LoteDetalle.tsx`

- [ ] **Step 1: Agregar import de useAuth y exportarSocioPDF**

En `src/pages/LoteDetalle.tsx`, la línea de import de `exportarLotesExcel`:

```typescript
import { exportarLotesExcel } from '@/utils/exportExcel';
import { exportarLotePDF, exportarSocioPDF } from '@/utils/exportPDF';
import { useAuth } from '@/contexts/AuthContext';
```

- [ ] **Step 2: Obtener userData del hook useAuth**

En la función `LoteDetalle()`, después de la línea que desestructura `useFinca()`:

```typescript
const { fincaActiva, fincas } = useFinca();
const { userData } = useAuth();
```

- [ ] **Step 3: Agregar handler handleGenerarPDFSocio**

Después del handler `handleGenerarPDF` existente:

```typescript
  async function handleGenerarPDFSocio() {
    if (!lote || !fincaActiva || !lote.socio) return;
    try {
      await exportarSocioPDF({
        lote,
        animales,
        ventas,
        gastos,
        nombreFinca: fincaActiva.nombre,
        nombreDueno: userData?.nombre ?? 'Propietario',
        fechaGenerado: new Date().toISOString().substring(0, 10),
      });
    } catch (err) {
      console.error('[LoteDetalle] Error generando PDF socio:', err);
    }
  }
```

- [ ] **Step 4: Agregar botón en detalle-acciones**

Después del botón `📄 PDF` existente:

```tsx
              {animales.length > 0 && (
                <button className="btn btn-secondary btn-sm" onClick={handleGenerarPDF}>
                  📄 PDF
                </button>
              )}
              {animales.length > 0 && lote.tipoPropiedad === 'medias' && lote.socio && (
                <button className="btn btn-secondary btn-sm" onClick={handleGenerarPDFSocio}>
                  🤝 PDF Socio
                </button>
              )}
```

- [ ] **Step 5: Verificar TypeScript**

```bash
cd C:/Users/Usuario/Desktop/Sistemas/ganacr/.claude/worktrees/naughty-goodall-41993c && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/pages/LoteDetalle.tsx
git commit -m "feat(pdf): add PDF Socio button to LoteDetalle"
```

---

## Self-Review

**Spec coverage:**
- ✅ Componente PDF para socio con hero de utilidad → Task 2
- ✅ Fix fuente ₡ (Roboto) en ReporteLotePDF → Task 1
- ✅ Misma fuente Roboto en ReporteSocioPDF → Task 2
- ✅ Header con nombre del socio → Task 2
- ✅ Hero card con utilidad y porcentaje del socio → Task 2
- ✅ Resumen financiero con card destacada Tu utilidad (X%) → Task 2
- ✅ Inventario, ventas (con columna Tu utilidad), gastos → Task 2
- ✅ Footer "Reporte generado para [socio]" → Task 2
- ✅ `exportarSocioPDF` con nombre archivo `GanaCR_Socio_[Socio]_[Lote]_[Fecha].pdf` → Task 3
- ✅ Botón solo en lotes a medias con socio → Task 4
- ✅ `nombreDueno` de `userData.nombre` → Task 4

**Placeholder scan:** ninguno.

**Type consistency:** `ReporteSocioPDFProps` definido en Task 2, importado en Task 3 y usado en Task 4. `exportarSocioPDF(props: ReporteSocioPDFProps)` consistente en Tasks 3 y 4.
