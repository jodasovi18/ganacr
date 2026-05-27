# GanaCR — CRUD Edición y Borrado (Scope C) — Design Spec

## Objetivo
Agregar edición y borrado completo a todas las entidades del sistema: gastos, animales, lotes y ventas. Las ventas se "anulan" con restauración completa de estado (no soft delete). Todos los modales de creación existentes se reutilizan en modo edición.

## Decisiones de diseño
- **Modales reutilizables**: mismo componente para crear y editar; prop `editData` activa el modo edición.
- **Confirmación explícita**: todo borrado pasa por `ConfirmarBorradoModal` genérico.
- **Anulación de ventas**: borrado completo con reversión atómica (writeBatch) de todos los efectos secundarios.
- **Cascade en lotes**: eliminar un lote borra pesos → animales → gastos → ventas → lote, en batches de ≤ 500 ops.
- **Push a GitHub**: cada commit se pushea a `origin main` como práctica estándar.

---

## Arquitectura

### Capa de datos — hooks

#### `src/hooks/useLotes.ts`
Funciones nuevas exportadas desde `useActualizarLote`:
- `actualizarLote(loteId: string, data: { nombreLote: string; socio?: Socio | null })` — `updateDoc` con `updatedAt`.
- `eliminarLoteConCascada(loteId: string)` — secuencia:
  1. Consulta `animales` donde `loteId == loteId` → obtiene ids.
  2. Consulta `pesos` donde `animalId in [ids]` (chunked en grupos de 10 por límite de Firestore `in`).
  3. Consulta `gastos` donde `loteId == loteId`.
  4. Consulta `ventas` donde `loteId == loteId`.
  5. Borra todos + el lote en writeBatches de ≤ 500 operaciones.

#### `src/hooks/useAnimales.ts`
Funciones nuevas:
- `actualizarAnimal(animalId: string, data: { raza: string; pesoInicial: number; precioCompra: number; notas?: string })` — `updateDoc` + `updatedAt`.
- `eliminarAnimal(animalId: string, loteId: string)` — writeBatch: `deleteDoc(animal)` + `update(lote, { animalesActivos: increment(-1), totalAnimales: increment(-1), totalInvertido: increment(-precioCompra) })`.

#### `src/hooks/useGastos.ts`
Funciones nuevas:
- `actualizarGasto(gastoId: string, loteId: string, oldMonto: number, data: { tipo: string; monto: number; descripcion?: string; fecha: string })` — writeBatch: `updateDoc(gasto)` + `update(lote, { totalGastos: increment(data.monto - oldMonto) })`.
- `eliminarGasto(gastoId: string, loteId: string, monto: number)` — writeBatch: `deleteDoc(gasto)` + `update(lote, { totalGastos: increment(-monto) })`.

#### `src/hooks/useVentas.ts`
Función nueva:
- `anularVenta(ventaId: string)` — writeBatch:
  1. Lee documento de venta → extrae `animales[]`, `loteId`, `totalVenta`, `utilidadBruta`, `cantidadAnimales`.
  2. Por cada animal en `venta.animales`: `update(animalRef, { estado: 'activo', fechaSalida: deleteField(), pesoActual: item.pesoInicial })`.
  3. `update(loteRef, { animalesActivos: increment(n), animalesVendidos: increment(-n), totalVentas: increment(-totalVenta), utilidadTotal: increment(-utilidadBruta) })`.
  4. `delete(ventaRef)`.
  5. `batch.commit()`.

---

### Componentes nuevos

#### `src/components/ConfirmarBorradoModal.tsx`
Props:
```typescript
interface Props {
  titulo: string;          // "¿Eliminar este gasto?"
  descripcion?: string;    // detalle secundario (ej. advertencia cascade)
  labelConfirmar?: string; // default "Eliminar"
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}
```
UI: overlay modal, título en rojo, descripción en gris, botón rojo "Eliminar" + botón gris "Cancelar". Mismo estilo `.modal` existente.

---

### Componentes modificados

#### `src/components/AgregarGastoModal.tsx`
Props nuevos: `editData?: Gasto`.
- Si `editData` presente: pre-llena campos, título "Editar Gasto", botón "Guardar cambios", submit llama `actualizarGasto`.
- Sin cambios al flujo de creación.

#### `src/components/AgregarAnimalModal.tsx`
Props nuevos: `editData?: Animal`.
- Pre-llena `numeroArete` (disabled en modo editar — el arete es inmutable), raza, pesoInicial, precioCompra, notas.
- Título "Editar Animal", botón "Guardar cambios", submit llama `actualizarAnimal`.

#### `src/components/CrearLoteModal.tsx`
Props nuevos: `editData?: Lote`.
- Pre-llena `nombreLote`, `tipoPropiedad`, datos del socio.
- Título "Editar Lote", botón "Guardar cambios", submit llama `actualizarLote`.
- En modo editar, `tipoPropiedad` es editable (permite agregar/quitar socio).

---

### Páginas modificadas

#### `src/pages/LoteDetalle.tsx`
**Pestaña Animales — tabla:**
- Columna de acciones al final: botón ✏️ (abre `AgregarAnimalModal` con `editData`) + botón 🗑️ (abre `ConfirmarBorradoModal`).
- Solo visible para animales con `estado === 'activo'` (los vendidos no se editan).

**Pestaña Gastos — tarjetas:**
- Cada `.gasto-card`: botones ✏️ y 🗑️ en esquina superior derecha.

**Pestaña Ventas — tarjetas:**
- Cada `.venta-card`: botón "Anular venta" (rojo outline).
- `ConfirmarBorradoModal` con descripción: "Esta acción restaurará los animales a activo y revertirá los contadores del lote."

#### `src/pages/Dashboard.tsx`
- Cada `.lote-card`: botones ✏️ y 🗑️.
- Modal de confirmación para borrar lote incluye advertencia: "Se eliminarán todos los animales, gastos, pesajes y ventas de este lote. Esta acción no se puede deshacer."

---

## Flujo de datos — anulación de venta

```
Usuario click "Anular venta"
  → ConfirmarBorradoModal (con advertencia)
    → onConfirm() → anularVenta(ventaId)
      → getDoc(venta) → writeBatch:
          update animales[n] → estado:'activo'
          update lote → contadores revertidos
          delete venta
      → batch.commit()
  → onSnapshot actualiza UI automáticamente
```

---

## Flujo de datos — borrado de lote

```
Usuario click 🗑️ en lote-card
  → ConfirmarBorradoModal (con advertencia cascade)
    → onConfirm() → eliminarLoteConCascada(loteId)
      → getDocs(animales) → ids[]
      → getDocs(pesos where animalId in ids[]) — chunked por 10
      → getDocs(gastos), getDocs(ventas)
      → writeBatches de ≤500 ops: delete todo
      → delete lote
  → onSnapshot del dashboard actualiza automáticamente
```

---

## Manejo de errores
- Todos los handlers de borrado/anulación envuelven en `try/catch` y muestran error inline en el modal (igual al patrón de `AgregarAnimalModal` actual).
- El modal de confirmación tiene estado `loading` para deshabilitar botones durante la operación.

---

## Archivos a crear
- `src/components/ConfirmarBorradoModal.tsx` (nuevo)

## Archivos a modificar
- `src/hooks/useLotes.ts`
- `src/hooks/useAnimales.ts`
- `src/hooks/useGastos.ts`
- `src/hooks/useVentas.ts`
- `src/components/AgregarGastoModal.tsx`
- `src/components/AgregarAnimalModal.tsx`
- `src/components/CrearLoteModal.tsx`
- `src/pages/LoteDetalle.tsx`
- `src/pages/Dashboard.tsx`

---

## Testing
- `npm run build` debe pasar limpio tras cada tarea.
- Los flujos existentes de creación no deben romperse (mismos modales, modo crear intacto).
- Verificación manual: crear → editar → borrar para cada entidad.
