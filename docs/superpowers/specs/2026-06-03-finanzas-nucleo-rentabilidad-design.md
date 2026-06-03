# Diseño — Fase 4-A: Núcleo de rentabilidad

**Fecha:** 2026-06-03
**Tipo:** Feature (módulo de engorde)
**Estado:** Aprobado (pendiente review del spec → writing-plans)

## Resumen

Primera pieza de la Fase 4 (Finanzas). Da al ganadero la respuesta a "¿este lote me está
dando o no?" mediante métricas de **costo por kilo**, **margen por animal vendido** y
**rentabilidad por lote con comparativa entre lotes**. Incluye lo **realizado** (vendido) y una
estimación del **inventario en pie** (animales activos valorados a un precio ₡/kg de referencia).

## Decisiones tomadas (brainstorming)

1. **Pieza:** Núcleo de rentabilidad (las otras dos piezas de Fase 4 —simulador y reporte crédito
   MAG— van en ciclos aparte).
2. **Enfoque:** **derivado en vivo** (sin colección nueva en Firestore). Se calcula al vuelo desde
   lotes/animales/ventas/gastos con funciones puras. Snapshots históricos = futuro (YAGNI ahora).
3. **Alcance del cálculo:** **realizado + inventario en pie** (activos valorados a ₡/kg de
   referencia editable).
4. **Costo por kilo:** se muestran **ambos** — costo de engorde/kg y costo total/kg.

## Arquitectura

Unidades chicas, con una responsabilidad y testeables por separado:

- **`src/utils/finanzas.ts`** (nuevo, **función pura**): núcleo de cálculo. Sin red, sin React →
  100% testeable con la suite unit (TDD).
- **`src/hooks/useFinanzasFinca.ts`** (nuevo): carga animales + ventas de la finca, agrupa por
  lote y arma la **comparativa**.
- **`src/components/FinanzasLoteTab.tsx`** (nuevo): detalle financiero de un lote (en LoteDetalle).
- **`src/components/FinanzasFincaTab.tsx`** (nuevo): comparativa entre lotes (en Dashboard).
- **`src/types/index.ts`**: agregar `Lote.precioReferenciaKg?: number` (opcional).

### Tipo de salida (contrato de `finanzas.ts`)
```ts
export interface FinanzasLote {
  loteId: string;
  nombreLote: string;
  inversionTotal: number;      // ₡ compra de todos los animales (lote.totalInvertido)
  gastosTotal: number;         // ₡ gastos del lote (incluye distribuidos de finca)
  ventasTotal: number;         // ₡ ingresos por ventas realizadas
  kgProducidos: number;        // Σ max(0, pesoActual - pesoInicial) de activos + vendidos
  costoEngordeKg: number;      // gastosTotal / kgProducidos
  costoTotalKg: number;        // (inversionTotal + gastosTotal) / kgProducidos
  precioRefKg: number;         // ₡/kg usado para valorar el inventario
  valorInventario: number;     // Σ(pesoActual × precioRefKg) de los activos
  resultadoEstimado: number;   // (ventasTotal + valorInventario) − (inversionTotal + gastosTotal)
  roi: number;                 // resultadoEstimado / (inversionTotal + gastosTotal) × 100
  gananciaDiariaProm: number;  // kg/día promedio de los activos
  // reparto a-medias (solo si lote.tipoPropiedad === 'medias')
  resultadoSocio?: number;
  resultadoPropietario?: number;
  margenPorAnimal: { numeroArete: string; margen: number }[]; // por animal vendido
  margenPromedioVendido: number;
}
```

### Funciones
```ts
// ₡/kg de referencia por defecto: promedio realizado de las ventas del lote
// (precioVenta / pesoFinal de cada ItemVenta). Si no hay ventas → 0.
export function precioRefPorDefecto(ventas: Venta[]): number;

// Núcleo (puro). El LLAMADOR (componente/hook) resuelve el ₡/kg con la precedencia
//   precioRefKg = lote.precioReferenciaKg ?? precioRefPorDefecto(ventas) ?? 0
// y se lo pasa ya resuelto a esta función.
export function calcularFinanzasLote(
  lote: Lote, animales: Animal[], ventas: Venta[], precioRefKg: number
): FinanzasLote;
```

## Métricas y fórmulas (definiciones exactas)

Por lote:
- **Kg producidos** = `Σ max(0, pesoActual − pesoInicial)` de animales con estado `activo` o
  `vendido`. (Los `muerto` no suman kg productivos; su pérdida ya se refleja en otra parte.)
- **Costo de engorde / kg** = `gastosTotal / kgProducidos` (0 si `kgProducidos === 0`).
- **Costo total / kg** = `(inversionTotal + gastosTotal) / kgProducidos`.
- **Valor del inventario en pie** = `Σ(pesoActual × precioRefKg)` de los **activos**.
- **Resultado estimado** = `(ventasTotal + valorInventario) − (inversionTotal + gastosTotal)`.
  Interpretación: "si vendieras hoy todo el inventario a ₡/kg ref, esto te queda sobre lo
  invertido + gastado". (Modela bien vendidos, activos y muertos: los 3 pagaron `precioCompra`;
  los vendidos aportan `precioVenta`, los activos `pesoActual×ref`, los muertos nada.)
- **ROI** = `resultadoEstimado / (inversionTotal + gastosTotal) × 100` (0 si denominador 0).
- **Ganancia diaria promedio** = promedio sobre activos de
  `(pesoActual − pesoInicial) / díasDesde(fechaIngreso)`. (Alimenta el futuro simulador.)
- **Reparto a-medias** (si `tipoPropiedad === 'medias'`): `resultadoSocio = resultadoEstimado ×
  socio.porcentaje/100`; `resultadoPropietario = resto`.
- **Margen por animal vendido** = por cada `ItemVenta`:
  `precioVenta − precioCompra − (venta.gastosProporcion / venta.cantidadAnimales)`.
  Devuelve lista por arete + promedio.

## ₡/kg de referencia (inventario en pie)

- Vive en `Lote.precioReferenciaKg?` (opcional, por lote — distintas razas/categorías venden a
  distinto ₡/kg).
- **Default inteligente:** si el lote ya tuvo ventas, el campo arranca con el **promedio ₡/kg
  realizado** (`precioRefPorDefecto`). El ganadero no tiene que cargar nada para empezar.
- **Editable inline** en la pestaña Finanzas del lote; al guardar, se persiste en el lote (se
  reúsa el path de edición de lote existente, p. ej. `editarLote`/update). Si el lote no tiene
  ventas ni valor seteado, el inventario se valora en ₡0 hasta que el usuario ponga un ₡/kg.

## UI

- **Dashboard → nueva pestaña "💰 Finanzas"** (junto a "Lotes" y "Gastos de Finca"):
  **comparativa** de todos los lotes de la finca en tabla/cards — columnas: lote, resultado
  estimado ₡, ROI %, costo engorde/kg, ganancia diaria. **Ordenable** (default por resultado
  estimado desc). Destaca mejor y peor. Fila de **totales de finca**.
- **LoteDetalle → nueva pestaña "💰 Finanzas"**: detalle del lote — tarjetas con las **dos**
  métricas de costo/kg, valor del inventario en pie, resultado estimado, ROI; el **input de ₡/kg**
  (con default); y la **lista de margen por animal vendido** (+ promedio). Si es a-medias, muestra
  el reparto del resultado.
- Formato con `formatColones`/`formatKg` existentes; estilo shadcn (Card, Tabs, Table).

## Testing

- **Unit (TDD):** `tests/unit/finanzas.test.ts` para `finanzas.ts`. Casos: lote propio con
  ventas + activos; lote a-medias (reparto); lote sin ventas (precioRef = 0); lote con muertos;
  `kgProducidos === 0` (sin división por cero); margen por animal.
- **E2E smoke** (suite del emulador): las dos pestañas Finanzas abren y muestran números (se
  agrega un lote con ventas + activos al seed si hace falta).

## Fuera de alcance (esta pieza)

- **Simulador de escenarios** (Fase 4-B) — proyección a futuro (usa `gananciaDiariaProm`).
- **Reporte crédito MAG 6%** (Fase 4-C) — requiere investigación de requisitos.
- **Snapshots históricos** de rentabilidad en el tiempo (tendencias).
- Precios de mercado externos / por raza automáticos.

## Entregable

- `utils/finanzas.ts` + `useFinanzasFinca` + `FinanzasLoteTab` + `FinanzasFincaTab` +
  `Lote.precioReferenciaKg`.
- Pestañas "💰 Finanzas" en Dashboard y LoteDetalle.
- Tests unit (TDD) + smoke E2E.
- PR dedicado (rama `feature/fase4-finanzas`).
