# Diseño — Origen/valor del animal y filtro avanzado de animales

**Fecha:** 2026-05-31
**Módulo:** Engorde
**Estado:** Aprobado, pendiente plan de implementación

## Resumen

Dos mejoras del dominio Animales, desplegables juntas:

1. **Origen y valor del animal** — soportar animales que no son compra de subasta:
   nacidos en la finca o sin registro de compra. El precio deja de ser obligatorio.
2. **Filtro avanzado** — filtrar la lista de animales de un lote por estado, raza,
   origen, rango de peso y rango de ganancia (pendiente de Fase 2B).

---

## Parte 1 — Origen y valor del animal

### Problema

Hoy `AgregarAnimalModal` exige `precioCompra` (`required`, `min 1`). No todos los
animales son compra de subasta con precio conocido: algunos nacieron en la finca, otros
se compraron hace tiempo sin registro del precio.

### Modelo de datos

`Animal` (en `src/types/index.ts`) — agregar un campo:

- `origen: 'comprado' | 'nacido_finca' | 'sin_registro'`

Retrocompatibilidad: los animales existentes no tienen `origen`. Al leer se asume
`'comprado'` por defecto (`animal.origen ?? 'comprado'`). No se requiere migración de datos.

**Valor — un solo campo (`precioCompra`):** se mantiene `precioCompra` pero pasa a ser
**opcional** (puede quedar vacío → se guarda `0`). Semántica según origen:
- `comprado` → es el **precio de compra** real.
- `nacido_finca` / `sin_registro` → es el **valor estimado** de ingreso (valor de mercado
  al momento de ingresarlo), base para inversión/utilidad.

Esta decisión (un solo campo) mantiene **sin cambios** toda la lógica existente que usa
`precioCompra`: `useAgregarAnimal` (incrementa `totalInvertido`), ventas, muerte
(`valorPerdida` se calcula con peso × precio/kg, no con precioCompra), edición. El campo
`origen` distingue "costo real" de "valor estimado" para los reportes.

### UI — `AgregarAnimalModal.tsx`

- Nuevo `<select>` **Origen** (Comprado / Nacido en finca / Sin registro), default
  `comprado`. (En modo edición se puede cambiar el origen.)
- El campo de valor se **re-etiqueta** dinámicamente según el origen:
  - `comprado` → label "Precio de compra (₡)"
  - `nacido_finca` / `sin_registro` → label "Valor estimado (₡)"
- El campo de valor **deja de ser obligatorio** (`required` removido, `min 0`). Si se deja
  vacío se guarda `0`.
- "N° subasta" se muestra **solo si** origen = `comprado` (para los otros no aplica). Al
  guardar con origen ≠ `comprado`, `numeroSubasta` se persiste vacío (`''`).
- Validación de submit: requeridos siguen siendo **arete, raza, peso**. El valor es opcional.
- `useAgregarAnimal` / `useEditarAnimal`: aceptar `origen` y un `precioCompra` que puede ser
  `0`. El input `precioCompra` ya no se valida como obligatorio.

### Visualización

- En la tabla/cards de animales (LoteDetalle), mostrar un badge sutil del origen cuando NO
  sea `comprado` (ej. "🐄 nacido" / "sin registro"). Para `comprado` no se muestra badge
  (es el caso normal).
- Donde la columna dice "Precio", el valor sigue mostrándose con `formatColones`
  (₡0 para los sin valor).

---

## Parte 2 — Filtro avanzado de animales

### Alcance

Filtros **combinables** (AND), aplicados **client-side** sobre la lista `animales` ya
cargada por `useAnimales(loteId)` — sin queries nuevas a Firestore. Conviven con el
buscador de arete existente (`filterText`).

Filtros:
- **Estado**: activo / vendido / muerto (multi-select; vacío = todos).
- **Raza**: una raza de la lista (vacío = todas).
- **Origen**: comprado / nacido_finca / sin_registro (vacío = todos).
- **Rango de peso actual**: `pesoMin` / `pesoMax` (kg, opcionales).
- **Rango de ganancia**: `gananciaMin` / `gananciaMax` (kg; ganancia = `pesoActual − pesoInicial`).

### Arquitectura

`LoteDetalle.tsx` ya tiene ~745 líneas; para no engordarlo se extrae:

**`src/utils/filtrarAnimales.ts`** — función pura y testeable:
```ts
export interface FiltroAnimales {
  estados: Array<'activo' | 'vendido' | 'muerto'>; // [] = todos
  raza: string;        // '' = todas
  origen: '' | 'comprado' | 'nacido_finca' | 'sin_registro';
  pesoMin: number | null;
  pesoMax: number | null;
  gananciaMin: number | null;
  gananciaMax: number | null;
}

export const FILTRO_VACIO: FiltroAnimales = { estados: [], raza: '', origen: '',
  pesoMin: null, pesoMax: null, gananciaMin: null, gananciaMax: null };

export function filtrarAnimales(animales: Animal[], f: FiltroAnimales): Animal[];
export function contarFiltrosActivos(f: FiltroAnimales): number;
```
Reglas: cada filtro vacío/`null` no restringe. `origen` usa `animal.origen ?? 'comprado'`.
Ganancia = `pesoActual - pesoInicial`.

**`src/components/AnimalesFilterBar.tsx`** — UI del filtro:
- Botón "Filtros" con badge del nº de filtros activos (`contarFiltrosActivos`).
- Al abrir (popover/colapsable shadcn): controles de estado (checkboxes/chips), raza
  (`<select>`), origen (`<select>`), peso min/max y ganancia min/max (`Input type=number`),
  y botón "Limpiar filtros" (resetea a `FILTRO_VACIO`).
- Props: `{ filtro, onChange, razasDisponibles }`.

**`LoteDetalle.tsx`**:
- Estado `const [filtro, setFiltro] = useState<FiltroAnimales>(FILTRO_VACIO)`.
- `animalesFiltrados` = `filtrarAnimales(animales, filtro)` luego el filtro de arete por
  texto (se mantiene el `filterText` actual encadenado).
- Render del `<AnimalesFilterBar>` junto al buscador de arete.
- Contador "mostrando X de Y" cuando hay filtros activos.

---

## Archivos afectados

- `src/types/index.ts` (Animal: +`origen`)
- `src/components/AgregarAnimalModal.tsx` (selector origen, label dinámico, valor opcional)
- `src/hooks/useAnimales.ts` (`useAgregarAnimal`/`useEditarAnimal` aceptan `origen`,
  `precioCompra` opcional/0)
- `src/utils/filtrarAnimales.ts` (nuevo — función pura)
- `src/components/AnimalesFilterBar.tsx` (nuevo — UI del filtro)
- `src/pages/LoteDetalle.tsx` (estado de filtro, aplicar filtro, badge origen)

## Fuera de alcance (YAGNI)

- Migración de datos (los existentes se infieren como `comprado`).
- Campo separado `valorEstimado` (se reutiliza `precioCompra`).
- Persistir el filtro entre sesiones (se resetea al entrar al lote).
- Filtro a nivel de finca/Dashboard (solo dentro del lote por ahora).
- Origen como filtro en el Dashboard o en exports (se puede sumar después).
