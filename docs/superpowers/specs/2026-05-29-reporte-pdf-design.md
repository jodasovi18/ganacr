# Reporte PDF por Lote — Diseño (Fase 2B)

**Fecha:** 2026-05-29  
**Contexto:** GanaCR — sistema de gestión ganadera para Costa Rica  
**Alcance:** Generar y descargar un reporte PDF por lote para compartir con el socio o para registros propios

---

## Resumen

Reporte PDF generado completamente en el cliente con `@react-pdf/renderer`. Incluye resumen financiero, inventario de animales activos, historial de ventas y gastos detallados con fechas. Accesible desde Dashboard (selección de lote via dropdown) y LoteDetalle (exportación con datos en memoria). Estilo branded con colores GanaCR.

---

## Arquitectura

### Librería
**`@react-pdf/renderer`** — componentes React que generan PDF directamente. Texto seleccionable, diseño declarativo, funciona 100% offline.

### Componente PDF

**`src/components/pdf/ReporteLotePDF.tsx`**

Props:
```typescript
interface ReporteLotePDFProps {
  lote: Lote;
  animales: Animal[];
  ventas: Venta[];
  gastos: Gasto[]; // incluye gastos propios y los distribuidos desde gastosFinca (campo gastoFincaId)
  nombreFinca: string;
  fechaGenerado: string; // ISO date
}
```

Estructura del documento:
1. **Header** — nombre "GanaCR" en verde oscuro (`#1b4332`) + nombre finca + nombre lote + fecha de generación
2. **Info del lote** — fecha compra, tipo propiedad, socio con porcentajes (si aplica)
3. **Resumen financiero** — tabla: Total invertido | Total gastos | Total ventas | Utilidad bruta | Utilidad del socio (solo si medias, destacada)
4. **Inventario actual** — tabla de animales activos: Arete | Raza | Peso actual (kg) | Ganancia (kg) | Estado
5. **Historial de ventas** — tabla: Fecha | Cantidad | Total venta (₡) | Utilidad bruta (₡) | Utilidad socio (₡) (solo si medias)
6. **Gastos detallados** — tabla: Fecha | Concepto | Tipo | Monto (₡) — ordenados por fecha desc. Los gastos distribuidos desde gastosFinca ya están en la colección `gastos` con campo `gastoFincaId`, por lo que se incluyen automáticamente.

**Colores del tema:**
- Encabezado de sección: `#1b4332` (verde oscuro) con texto blanco
- Fila alterna: `#f0f9f0` (verde muy suave)
- Texto principal: `#1b2e22`
- Texto muted: `#4a6a55`

### Función de exportación

**`src/utils/exportPDF.ts`**

```typescript
exportarLotePDF(props: ReporteLotePDFProps): Promise<void>
```

Llama `pdf(<ReporteLotePDF {...props} />).toBlob()` y descarga `GanaCR_[NombreLote]_[YYYY-MM-DD].pdf`.

---

## Integración UI

### Dashboard
- Botón **"📄 PDF"** junto al botón "📊 Excel" en la sección "Mis Lotes"
- Al hacer clic: abre un **dropdown** con los nombres de todos los lotes de la finca
- Al seleccionar un lote: carga animales, ventas, gastos y gastosFinca via `getDocs` (queries puntuales)
- Estado: botón cambia a "Generando PDF..." deshabilitado durante el proceso
- Timeout de 15 segundos — si Firestore no responde, muestra toast de error
- Deshabilitado si no hay lotes

### LoteDetalle
- Botón **"📄 PDF"** en `detalle-acciones` junto al botón "📊 Excel"
- Animales, ventas y gastos ya están cargados en memoria (`useGastos` ya existe en LoteDetalle)
- `gastos` ya está cargado via `useGastos` en LoteDetalle — incluye gastos propios y los distribuidos desde gastosFinca
- Exportación casi instantánea
- Solo visible cuando el lote tiene al menos 1 animal

---

## Manejo de errores

- **Query falla (Dashboard):** toast "No se pudo generar el PDF. Intentá de nuevo."
- **`@react-pdf/renderer` falla:** `console.error` + toast de error
- **Lote sin animales activos:** sección inventario → "Sin animales activos"
- **Lote sin ventas:** sección ventas → "Sin ventas registradas"
- **Lote sin gastos:** sección gastos → "Sin gastos registrados"
- **Lote propio:** columna "Utilidad socio" no aparece en resumen ni en tablas

---

## Archivos a crear / modificar

| Archivo | Cambio |
|---|---|
| `src/components/pdf/ReporteLotePDF.tsx` | Crear — componente @react-pdf/renderer |
| `src/utils/exportPDF.ts` | Crear — función exportarLotePDF |
| `src/pages/Dashboard.tsx` | Modificar — botón PDF + dropdown selector de lote |
| `src/pages/Dashboard.css` | Modificar — estilos del dropdown PDF |
| `src/pages/LoteDetalle.tsx` | Modificar — botón PDF en header |
| `tests/qa/reporte-pdf.spec.ts` | Crear — tests E2E Playwright |

---

## Testing (Playwright E2E)

1. Botón "📄 PDF" visible en Dashboard con lotes cargados
2. Click → dropdown muestra nombres de lotes disponibles
3. Seleccionar lote → estado "Generando PDF..." aparece y desaparece sin errores en consola
4. Botón "📄 PDF" visible en LoteDetalle header cuando hay animales
5. Click en LoteDetalle → no hay error en consola
