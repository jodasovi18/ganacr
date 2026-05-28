# GanaCR — QA Suite CRUD Edición y Borrado — Design Spec

## Objetivo
Agregar cobertura E2E completa (happy path + integridad de datos + edge cases) para todos los flujos de CRUD implementados en Scope C: editar y borrar gastos, animales y lotes (con cascade), y anular ventas. Simultáneamente, actualizar el seed de datos para escalar a 100+ animales por lote, lo que permite verificar los límites del sistema (writeBatch ≤500 ops, chunking de queries `in` en grupos de 10).

---

## Decisiones de diseño

- **Un solo archivo `crud.spec.ts`** — un ciclo `beforeAll(cleanup + seed)` / `afterAll(cleanup + seed)`, mismo patrón que `escritura.spec.ts`. Rápido, mantenible, coherente con la suite existente.
- **`describe.serial`** — los tests corren en orden secuencial; las operaciones destructivas (delete animal, delete lote) van al final de su bloque para no romper tests anteriores.
- **Cascade delete autocontenido** — el test de borrado de lote crea su propio lote temporal durante la prueba y lo destruye; no toca los lotes de seed.
- **Seed escalado a 100+ animales por lote** — valida el chunking de queries `in` (parallelizado en grupos de ≤10) y el loop de writeBatches (≤500 ops). La venta de anulación en Lote Cebuinos usará ~90 animales.
- **Cobertura completa** — cada entidad tiene: happy path (modal correcto, datos pre-llenados, cierre exitoso), integridad de datos (contadores del lote actualizados), y edge cases (cancelar no modifica, campo disabled, advertencia correcta en modal).

---

## Arquitectura

### Archivo nuevo
- `tests/qa/crud.spec.ts`

### Archivo modificado
- `scripts/seed-data.ts` — ampliar animales de 8 a 100+ por lote

### Estructura de `crud.spec.ts`

```
describe.serial 'CRUD — edición y borrado'
  beforeAll → cleanup + seed
  afterAll  → cleanup + seed

  describe 'Gastos'   → 5 tests (Lote Charolais Sur)
  describe 'Animales' → 4 tests (Lote Brahman Norte, 120 animales)
  describe 'Lotes'    → 3 tests (Lote Criollo Zona Norte + lote temporal)
  describe 'Ventas'   → 3 tests (Lote Cebuinos Guanacaste, venta ~90 animales)
```

---

## Datos de seed actualizados

| Lote | Animales actuales | Nuevo total | Propósito de prueba |
|------|:-----------------:|:-----------:|---------------------|
| Brahman Norte | 8 | **120** | Tests de animales + stress UI |
| Charolais Sur | 8 | **110** | Tests de gastos (mixto activo/vendido) |
| Cebuinos Guanacaste | 7 | **105** | Tests de ventas (venta grande ~90 animales) |
| Criollo Zona Norte | 8 | **100** | Tests de lote + datos generales |

Los animales adicionales son generados programáticamente con aretes únicos (`BN-009` a `BN-120`, `CS-009` a `CS-110`, etc.), raza y precio variables para simular diversidad real.

La venta en Lote Cebuinos se amplía a ~90 animales. `useAnularVenta` los restaura todos en un solo `writeBatch` — si eso pasa con 90 animales, el path de batch está validado.

---

## Casos de prueba

### Gastos — Lote Charolais Sur

| # | Tipo | Descripción |
|---|------|-------------|
| G1 | Happy path | Clic ✏️ en "Alimento febrero" → modal se abre con concepto, monto y tipo pre-llenados |
| G2 | Data integrity | Cambiar monto de ₡150.000 a ₡200.000 → guardar → nueva cifra visible en tabla + stat `totalGastos` del lote aumenta ₡50.000 |
| G3 | Edge case | Abrir modal edición → clic "Cancelar" → gasto no cambia en tabla |
| G4 | Happy path | Clic 🗑️ en "Transporte a subasta" → `ConfirmarBorradoModal` aparece con nombre del gasto |
| G5 | Data integrity | Confirmar borrado → gasto desaparece de tabla + `totalGastos` del lote decrece en el monto exacto del gasto borrado |

### Animales — Lote Brahman Norte (120 animales)

| # | Tipo | Descripción |
|---|------|-------------|
| A1 | Happy path | Clic ✏️ en fila BN-001 → modal se abre; campo "Número de arete" tiene `disabled` y muestra `BN-001` sin poder editarse |
| A2 | Data integrity | Cambiar raza a "Angus" y precioCompra a ₡300.000 (era diferente) → guardar → tabla muestra "Angus" + stat `totalInvertido` del lote refleja la diferencia |
| A3 | Happy path | Clic 🗑️ en fila BN-120 → `ConfirmarBorradoModal` aparece con arete en el título |
| A4 | Data integrity | Confirmar borrado → BN-120 desaparece de tabla + contador "Activos" en header decrece en 1 |

### Lotes — Dashboard

| # | Tipo | Descripción |
|---|------|-------------|
| L1 | Happy path + edge case | Clic ✏️ en card "Lote Criollo Zona Norte" → modal se abre pre-llenado con nombre actual; **la página NO navega al lote** (stopPropagation correcto) |
| L2 | Data integrity | Cambiar nombre a "Lote Criollo Editado" → guardar → nuevo nombre aparece en el Dashboard en lugar del original |
| L3 | Cascade delete | Crear "Lote E2E Temporal" → agregar 1 animal → volver al Dashboard → 🗑️ → `ConfirmarBorradoModal` con advertencia de cascade → confirmar → lote desaparece del Dashboard |

### Ventas — Lote Cebuinos Guanacaste (~90 animales vendidos)

| # | Tipo | Descripción |
|---|------|-------------|
| V1 | Happy path | Clic "Anular" en la venta-card → `ConfirmarBorradoModal` aparece con texto de advertencia sobre restauración de animales |
| V2 | Data integrity | Confirmar anulación → venta desaparece de pestaña Ventas; tab muestra "Ventas (0)" |
| V3 | Data integrity | Navegar a pestaña Animales → los animales de la venta tienen badge **activo** (no "vendido") |

---

## Manejo de errores en tests

- Timeouts: operaciones que implican Firestore (`batch.commit`) usan `timeout: 20_000` mínimo; la anulación de venta grande usa `timeout: 30_000`.
- Seed/cleanup usan `execSync` como en `escritura.spec.ts` — síncrono, falla rápido si hay problema.
- Si el seed tarda más por el volumen mayor, el timeout de `beforeAll` se extiende con `test.setTimeout(120_000)`.

---

## Archivos a crear / modificar

### Crear
- `tests/qa/crud.spec.ts`

### Modificar
- `scripts/seed-data.ts` — función generadora de animales en bulk, lotes escalados a 100+

---

## Criterios de éxito

- `npx playwright test crud.spec.ts` pasa los 15 tests sin errores
- Los 15 tests existentes de la suite (`calculos`, `dashboard`, `formularios`, `login`, `lote-detalle`, `escritura`) siguen pasando tras el nuevo seed
- El cascade delete de lote (L3) y la anulación de venta masiva (V2, V3) no lanzan errores de Firestore (permission-denied, batch overflow, etc.)
