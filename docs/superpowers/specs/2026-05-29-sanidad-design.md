# Módulo Sanidad — Diseño (Fase 2B)

**Fecha:** 2026-05-29  
**Contexto:** GanaCR — sistema de gestión ganadera para Costa Rica  
**Alcance:** Vacunas y tratamientos por lote y por animal individual  

---

## Resumen

Módulo para registrar eventos sanitarios (vacunas, tratamientos, desparasitantes, vitaminas) a nivel de lote completo o por animal individual. Cada evento genera automáticamente un `Gasto` vinculado que se suma a `totalGastos` del lote, siguiendo el patrón ya establecido por `gastosFinca → gastos`.

---

## Modelo de datos

### Nuevo tipo `EventoSanitario`

```typescript
export type TipoEventoSanitario =
  | 'vacuna'
  | 'tratamiento'
  | 'desparasitante'
  | 'vitamina'
  | 'otro';

export interface EventoSanitario {
  id: string;
  userId: string;
  fincaId: string;
  loteId: string;
  animalId?: string;       // undefined = aplica al lote completo
  nombreProducto: string;
  tipo: TipoEventoSanitario;
  fecha: string;           // ISO date
  dosis?: string;          // ej. "5ml/animal", "2 tabletas"
  costo: number;           // ₡ total del evento
  quienAplico?: string;
  proximaDosis?: string;   // ISO date — para alertas de refuerzo
  notas?: string;
  gastoId: string;         // referencia al Gasto auto-creado
  createdAt: string;
}
```

### Cambio en interfaz `Gasto` existente

Se agrega campo opcional `eventoSanitarioId?: string` (igual que `gastoFincaId` existente). Permite identificar gastos generados por eventos sanitarios y bloquear su edición directa desde el módulo de gastos.

### Nueva colección Firestore

`eventosSanitarios` — con campos `userId`, `fincaId`, `loteId` para seguridad y filtrado eficiente.

---

## Lógica de datos

### Hook `useEventosSanitarios(loteId: string)`

**`createEventoSanitario(data)`:**
- `writeBatch` que:
  1. Crea documento en colección `eventosSanitarios`
  2. Crea `Gasto` con `tipo: 'veterinario'` y `eventoSanitarioId` apuntando al evento
  3. Ejecuta `increment(costo)` en `lote.totalGastos`
- Si `animalId` está presente, el gasto se asocia al animal pero el costo sube al lote

**`deleteEventoSanitario(id)`:**
- `writeBatch` que:
  1. Elimina el `EventoSanitario`
  2. Elimina el `Gasto` vinculado (via `gastoId`)
  3. Ejecuta `increment(-costo)` en `lote.totalGastos`

**Queries en tiempo real:**
- `eventosByLote`: `onSnapshot` filtrando por `loteId`, ordenado por `fecha` desc — para el tab del lote
- `eventosByAnimal(animalId)`: query adicional por `animalId` — para el historial en la tarjeta del animal

El hook sigue exactamente el patrón de `useGastosFinca`, incluyendo manejo de errores en `onSnapshot`.

---

## Componentes UI

### Tab "Sanidad" en `LoteDetalle`

- Se agrega junto a los tabs existentes: Animales, Gastos, Pesos
- Lista todos los eventos del lote (tanto de lote completo como individuales), ordenados por fecha desc
- **Tarjeta de evento** muestra:
  - Nombre del producto + costo total (₡)
  - Chip de tipo: Vacuna / Tratamiento / Desparasitante / Vitamina / Otro
  - Chip de alcance: "Lote completo" o número de arete si es individual
  - Alerta de próxima dosis con color según vencimiento:
    - 🟢 Verde: más de 14 días en el futuro
    - 🟡 Amarillo: 0–14 días en el futuro
    - 🔴 Rojo: fecha pasada (vencida)
  - Fecha de aplicación + quién aplicó
  - Botones de editar / eliminar (eliminar pasa por `ConfirmarBorradoModal`)
- Botón "＋ Agregar evento" abre `EventoSanitarioModal`

### `EventoSanitarioModal` (nuevo componente)

**Campos:**
- Toggle "Lote completo / Animal específico" (selección inicial)
- Si "Animal específico": input de búsqueda por arete (offline, igual al filtro existente) con preview del animal seleccionado
- Tipo de evento: grid de 5 botones (Vacuna, Tratamiento, Desparasitante, Vitamina, Otro)
- Nombre del producto * (obligatorio)
- Fecha * (obligatorio)
- Costo total ₡ * (obligatorio)
- Dosis (opcional)
- Quién aplicó (opcional)
- Próxima dosis (opcional, fecha)
- Notas (opcional)

**Validaciones frontend:**
- `nombreProducto`, `fecha`, `costo` son requeridos — botón "Guardar" bloqueado hasta que estén completos
- `proximaDosis` no puede ser anterior a `fecha`
- Arete no encontrado en el lote → mensaje inline debajo del campo de búsqueda

### Historial sanitario en tarjeta del animal

- Sección colapsable "🩺 Historial sanitario individual" visible solo si el animal tiene eventos con `animalId`
- Lista compacta: chip de tipo + nombre del producto + fecha
- Badge de advertencia en la tarjeta si hay tratamiento activo (próxima dosis pendiente)
- Botón "＋ Agregar al animal" abre `EventoSanitarioModal` con el animal preseleccionado

---

## Archivos a crear / modificar

| Archivo | Cambio |
|---|---|
| `src/types/index.ts` | Agregar `TipoEventoSanitario`, `EventoSanitario`; agregar `eventoSanitarioId?` a `Gasto` |
| `src/hooks/useEventosSanitarios.ts` | Hook nuevo |
| `src/components/EventoSanitarioModal.tsx` | Modal nuevo |
| `src/components/SanidadTab.tsx` | Tab nuevo (lista de eventos del lote) |
| `src/pages/LoteDetalle.tsx` | Agregar tab Sanidad, historial en tarjeta animal |
| `src/pages/LoteDetalle.css` | Estilos para tarjeta evento y historial animal |
| `firestore.rules` | Agregar regla para colección `eventosSanitarios` |

---

## Manejo de errores

- Error en `writeBatch`: toast de error sin cerrar el modal — usuario puede reintentar con datos preservados
- Eliminación: siempre pasa por `ConfirmarBorradoModal` antes de ejecutar
- Gastos generados por eventos sanitarios: no se pueden editar directamente desde el módulo de gastos (se identifica por `eventoSanitarioId`)

---

## Testing (Playwright E2E)

1. Crear evento a nivel de lote → aparece en tab Sanidad → `totalGastos` del lote se incrementa
2. Crear evento para animal específico → aparece en tab Sanidad Y en historial del animal
3. Eliminar evento (con confirmación) → desaparece del tab, `totalGastos` se decrementa
4. Validación de campos requeridos → botón "Guardar" bloqueado si falta `nombreProducto`, `fecha` o `costo`
5. Alerta de próxima dosis vencida → chip rojo aparece correctamente
