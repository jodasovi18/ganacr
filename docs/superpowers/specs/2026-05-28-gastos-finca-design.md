# Gastos a Nivel de Finca — Design Spec

## Goal

Permitir al ganadero registrar un gasto que aplica a múltiples lotes de una finca (ej. vacunación masiva, desparasitación), distribuyendo el monto proporcionalmente según los animales activos de cada lote seleccionado. Completa la Fase 2A del roadmap.

## Architecture

Un documento "padre" en nueva colección `gastosFinca` almacena el gasto original completo. N documentos "hijos" en la colección `gastos` existente reciben cada uno su fracción proporcional, enlazados al padre via `gastoFincaId`. Toda la operación de creación y eliminación es atómica via `writeBatch`.

**Tech Stack:** React 18 + TypeScript + Firestore (writeBatch) + CSS vanilla

---

## Data Model

### Nueva colección: `gastosFinca`

```typescript
interface GastoFinca {
  id: string;
  userId: string;
  fincaId: string;
  concepto: string;
  tipo: TipoGasto;
  montoTotal: number;        // ₡ total original sin distribuir
  fecha: string;             // ISO date string
  quienPago?: string;
  notas?: string;
  lotesAplicados: Array<{
    loteId: string;
    nombreLote: string;
    animalesActivos: number; // snapshot al momento de creación
    monto: number;           // fracción asignada (suma exacta = montoTotal)
  }>;
  createdAt: string;
}
```

### Cambio en colección `gastos` (retrocompatible)

```typescript
// Se agrega campo opcional a la interface Gasto existente:
gastoFincaId?: string;  // si existe → vino de distribución de finca
```

Los gastos distribuidos son documentos normales de `gastos`. El campo `gastoFincaId` es el único cambio; todo el código existente funciona sin modificaciones.

### Fórmula de distribución

```
monto_lote_i = round(montoTotal × activos_i / Σ activos_seleccionados)
```

El último lote seleccionado absorbe el resto del redondeo para garantizar que `Σ montos_distribuidos === montoTotal` exactamente.

---

## Components

### Archivos nuevos

| Archivo | Responsabilidad |
|---|---|
| `src/hooks/useGastosFinca.ts` | `useGastosFinca(fincaId)` listener RT, `useAgregarGastoFinca()`, `useEliminarGastoFinca()` |
| `src/components/GastoFincaModal.tsx` | Formulario de creación con selector de lotes y preview de distribución en tiempo real |
| `src/components/GastoFincaModal.css` | Estilos del modal |
| `src/components/GastosFincaTab.tsx` | Lista de gastos de finca para el tab del Dashboard |

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/types/index.ts` | Agregar `GastoFinca` interface + campo `gastoFincaId?: string` en `Gasto` |
| `src/pages/Dashboard.tsx` | Agregar tabs "Lotes / Gastos de Finca", botón "+ Gasto de Finca", montar nuevos componentes |
| `src/pages/Dashboard.css` | Estilos para tabs y sección de gastos de finca |
| `src/pages/LoteDetalle.tsx` | Chip 📌 Finca en gastos con `gastoFincaId`; ocultar botones ✏️/🗑️ en esos gastos |
| `firestore.rules` | Regla para colección `gastosFinca` (misma lógica que `gastos`) |

---

## User Flow

### Crear gasto de finca

1. Usuario está en Dashboard con finca activa seleccionada.
2. Hace click en "💸 Gasto de Finca" (tab "Gastos de Finca" → botón "+ Nuevo").
3. Modal abre con campos: concepto, tipo, monto total, fecha, quién pagó (opcional).
4. Selector de lotes muestra todos los lotes de la finca activa:
   - Lotes propios: marcados por defecto.
   - Lotes a medias (🤝): **desmarcados por defecto**, con indicador visual naranja de que requieren selección explícita.
   - Lotes con 0 activos: deshabilitados (no se puede distribuir a lote sin animales).
5. Al escribir el monto, se actualiza en tiempo real el monto proporcional estimado (≈ ₡X) junto a cada lote seleccionado.
6. Submit: `writeBatch` crea padre + N hijos + incrementa `totalGastos` en N lotes.
7. Modal cierra, el tab "Gastos de Finca" muestra el nuevo registro.

### Ver gastos distribuidos en LoteDetalle

- Tab Gastos del lote muestra el gasto distribuido como cualquier otro gasto.
- Se agrega chip `📌 Finca` junto al concepto para identificarlo.
- Los botones ✏️ y 🗑️ individuales **no se muestran** para gastos con `gastoFincaId` (solo se gestionan desde el Dashboard).

### Eliminar gasto de finca

1. En tab "Gastos de Finca" del Dashboard, click en 🗑️.
2. Modal de confirmación: "Se eliminarán también los gastos distribuidos en N lotes."
3. `writeBatch`: elimina padre + todos los hijos + decrementa `totalGastos` en cada lote afectado.

---

## Firestore Operations

### Crear (writeBatch)

```
1× addDoc  → gastosFinca (padre)
N× addDoc  → gastos      (hijos con gastoFincaId)
N× update  → lotes       (increment totalGastos por monto asignado al lote)
Total: 1 + 2N operaciones — seguro dentro del límite de 500
```

### Eliminar (query + writeBatch)

```
1. getDocs → gastos where gastoFincaId == parentId  (obtener hijos)
2. writeBatch:
   1× delete → gastosFinca (padre)
   N× delete → gastos      (hijos)
   N× update → lotes       (decrement totalGastos por monto hijo)
```

---

## Edge Cases

| Caso | Comportamiento |
|---|---|
| Lote con 0 activos | Deshabilitado en el selector — no puede recibir distribución |
| Solo 1 lote seleccionado | 100% del monto va a ese lote — válido |
| Ningún lote seleccionado | Botón "Registrar gasto" deshabilitado |
| Monto ≤ 0 | Botón "Registrar gasto" deshabilitado |
| Intentar editar gasto distribuido desde LoteDetalle | Botones ✏️/🗑️ no se renderizan — solo desde Dashboard |
| Finca sin lotes | Tab "Gastos de Finca" muestra empty state con instrucción de crear lotes primero |

---

## What This Does NOT Include (YAGNI)

- Edición granular de un gasto de finca (cambiar monto → recalcular proporciones). Si hay error, el flujo es eliminar y recrear.
- Vista de finca dedicada `/finca/:id` — queda para cuando Fase 3 la requiera.
- Gastos de finca visibles en reportes PDF o Excel — Fase 2B.
- Historial de gastos de finca por período — Fase 4.
