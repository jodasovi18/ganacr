# Export a Excel — Diseño (Fase 2B)

**Fecha:** 2026-05-29  
**Contexto:** GanaCR — sistema de gestión ganadera para Costa Rica  
**Alcance:** Exportar inventario de animales y ventas por lote a un archivo Excel (.xlsx)

---

## Resumen

Exportación de datos a Excel con una hoja por lote. Cada hoja contiene dos secciones: inventario de animales y ventas. Accesible desde el Dashboard (todos los lotes de la finca) y desde LoteDetalle (lote individual). Implementado con SheetJS (xlsx) como función utilitaria pura en el cliente.

---

## Arquitectura

### Librería
**SheetJS (`xlsx`)** — instalada como dependencia de producción. Genera el archivo `.xlsx` completamente en el cliente, sin servidor.

### Función principal

**`src/utils/exportExcel.ts`**

```typescript
exportarLotesExcel(
  lotes: Lote[],
  animalesPorLote: Map<string, Animal[]>,
  ventasPorLote: Map<string, Venta[]>,
  nombreFinca: string
): void
```

Genera y descarga automáticamente un archivo `GanaCR_[NombreFinca]_[YYYY-MM-DD].xlsx`.

Por cada lote crea una hoja con:
1. **Cabecera** — nombre del lote, fecha de compra, tipo de propiedad (propio / a medias + nombre del socio y porcentaje si aplica)
2. **Sección Inventario** — título "Inventario de Animales" + encabezados + una fila por animal
3. **Fila vacía de separación**
4. **Sección Ventas** — título "Ventas" + encabezados + una fila por venta

El nombre de cada hoja es el `nombreLote` truncado a 31 caracteres con caracteres inválidos (`/ \ ? * [ ]`) reemplazados por `_`.

### Columnas — Inventario de animales

| Columna | Campo fuente |
|---|---|
| Arete | `animal.numeroArete` |
| Raza | `animal.raza` |
| Peso inicial (kg) | `animal.pesoInicial` |
| Peso actual (kg) | `animal.pesoActual` |
| Ganancia (kg) | `pesoActual - pesoInicial` |
| Precio compra (₡) | `animal.precioCompra` |
| Fecha ingreso | `animal.fechaIngreso` (formateada DD/MM/YYYY) |
| Estado | `animal.estado` |

### Columnas — Ventas

| Columna | Campo fuente |
|---|---|
| Fecha | `venta.fecha` (formateada DD/MM/YYYY) |
| Cantidad animales | `venta.cantidadAnimales` |
| Total venta (₡) | `venta.totalVenta` |
| Total inversión (₡) | `venta.totalInversion` |
| Gastos proporción (₡) | `venta.gastosProporcion` |
| Utilidad bruta (₡) | `venta.utilidadBruta` |
| Utilidad propietario (₡) | `venta.utilidadPropietario` (omitir si propio) |
| Utilidad socio (₡) | `venta.utilidadSocio` (omitir si propio) |

---

## Integración UI

### Dashboard
- Botón **"📊 Excel"** junto al título "Mis Lotes"
- Al hacer clic: carga animales y ventas de todos los lotes de la finca activa via `getDocs` (queries puntuales, no listeners)
- Estado de carga: botón cambia a "Exportando..." con spinner, deshabilitado durante la carga
- Timeout de 15 segundos — si Firestore no responde, cancela y muestra toast de error
- Deshabilitado si no hay lotes

### LoteDetalle
- Botón **"📊 Excel"** en el header junto a "+ Animal", "+ Gasto", "Vender"
- Exportación instantánea — animales y ventas ya están cargados en memoria
- Solo visible cuando el lote tiene al menos 1 animal

---

## Manejo de errores

- **Query falla (Dashboard):** toast de error "No se pudo exportar. Intentá de nuevo."
- **SheetJS lanza error:** `console.error` + toast de error
- **Lote sin animales:** sección inventario muestra fila "Sin animales registrados"
- **Lote sin ventas:** sección ventas muestra fila "Sin ventas registradas"
- **Nombre de lote con caracteres inválidos para Excel:** reemplazados por `_`

---

## Archivos a crear / modificar

| Archivo | Cambio |
|---|---|
| `src/utils/exportExcel.ts` | Crear — función de exportación con SheetJS |
| `src/pages/Dashboard.tsx` | Modificar — agregar botón Excel con estado de carga |
| `src/pages/Dashboard.css` | Modificar — estilos del botón |
| `src/pages/LoteDetalle.tsx` | Modificar — agregar botón Excel en header |
| `tests/qa/export-excel.spec.ts` | Crear — tests E2E Playwright |

---

## Testing (Playwright E2E)

1. Botón "📊 Excel" visible en Dashboard con lotes cargados
2. Click en botón → estado "Exportando..." aparece y desaparece
3. Botón "📊 Excel" visible en LoteDetalle header
4. Click en LoteDetalle → no hay error en consola
