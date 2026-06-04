# Diseño — Fase 4-B: Simulador de venta

**Fecha:** 2026-06-03
**Tipo:** Feature (módulo de engorde)
**Estado:** Aprobado (pendiente review del spec → writing-plans)
**Depende de:** Fase 4-A (núcleo de rentabilidad). Rama stackeada sobre `feature/fase4-finanzas`.

## Resumen

Herramienta interactiva "¿vendo hoy o en N días?". Compara, para el **inventario activo de un
lote**, el resultado de vender hoy contra venderlo en N días (proyectando el peso ganado y el
costo de mantenerlo). Es una **calculadora en vivo** (no persiste nada nuevo).

## Decisiones (brainstorming)

1. **Nivel:** por **lote** (inventario activo). Reusa la ganancia diaria de la 4-A. (Por animal =
   iteración futura.)
2. **Costo de mantener:** **derivado del histórico + editable** (`gastos totales ÷ días
   transcurridos`).
3. **Enfoque:** calculadora interactiva en vivo (función pura + pestaña). No guarda escenarios en
   Firestore (YAGNI). Reusa el `precioReferenciaKg` ya persistido por la 4-A.

## El cálculo

Función pura `simularVenta`. Entradas (escalares, ya agregadas a nivel lote por el componente):
- `pesoActivos` — kg, suma de `pesoActual` de los animales **activos**.
- `gananciaDiariaKgDia` — kg/día, ganancia diaria **total** del lote (suma de los activos).
- `precioKg` — ₡/kg.
- `costoDiario` — ₡/día de mantener el lote.
- `dias` — horizonte N.

Fórmulas:
```
pesoFuturo          = pesoActivos + gananciaDiariaKgDia × dias
ingresoHoy          = pesoActivos × precioKg
ingresoFuturo       = pesoFuturo × precioKg
costoMantener       = costoDiario × dias
gananciaEsperar     = (ingresoFuturo − costoMantener) − ingresoHoy
valorMarginalDiario = gananciaDiariaKgDia × precioKg − costoDiario
convieneEsperar     = valorMarginalDiario > 0
```
Nota algebraica: `gananciaEsperar = dias × valorMarginalDiario`. El veredicto depende del **valor
marginal por día**: si ganar un día de kilos vale más que el costo diario de mantenerlo, conviene
esperar.

### Tipo de salida
```ts
export interface SimulacionVenta {
  dias: number;
  pesoFuturo: number;
  ingresoHoy: number;
  ingresoFuturo: number;
  costoMantener: number;
  gananciaEsperar: number;       // (ingresoFuturo − costoMantener) − ingresoHoy
  valorMarginalDiario: number;   // gananciaDiariaKgDia × precioKg − costoDiario
  convieneEsperar: boolean;
}
export function simularVenta(
  pesoActivos: number, gananciaDiariaKgDia: number, precioKg: number,
  costoDiario: number, dias: number,
): SimulacionVenta;
```

## Defaults (los calcula el componente desde los datos del lote)

- `pesoActivos` = `Σ pesoActual` de activos.
- `gananciaDiariaKgDia` = `Σ max(0, (pesoActual − pesoInicial) / díasDesde(fechaIngreso))` sobre
  activos. (Ganancia diaria total realizada del lote.)
- `precioKg` = `lote.precioReferenciaKg ?? precioRefPorDefecto(ventas)` (reusa la 4-A).
- `costoDiario` = `lote.totalGastos / max(1, díasDesde(lote.fechaCompra))`.
- `dias` = 30.

Todos **editables** en la UI (el usuario juega con los escenarios). Nada se persiste.

## UI

Nueva pestaña **"📈 Simulador"** en LoteDetalle (separada de "💰 Finanzas": Finanzas = estado
actual; Simulador = proyección/what-if).
- **Inputs** (4 campos numéricos con sus defaults): Días, ₡/kg, Ganancia diaria (kg/día), Costo
  diario (₡/día). Recalcula al instante.
- **Tarjetas de resultado:** ingreso hoy, ingreso en N días, costo de mantener, **ganancia de
  esperar** (₡, resaltada verde/roja).
- **Veredicto** (badge): 🟢 "Conviene esperar (+₡X/día)" si `valorMarginalDiario > 0`, si no 🟡
  "Conviene vender ahora (−₡X/día)".
- **Mini-tabla de horizontes:** ganancia de esperar a 30 / 60 / 90 días.
- Si el lote no tiene activos (`pesoActivos === 0`), mostrar un vacío amable ("No hay animales
  activos para simular").
- Formato con `formatColones`/`formatKg`; estilo shadcn (Card, Input, Badge).

## Arquitectura

- **`src/utils/simulador.ts`** (NUEVO, **puro**): `simularVenta` + tipo `SimulacionVenta`.
  Testeable con node:test (TDD). Separado de `finanzas.ts` porque es proyección, no estado actual.
- **`src/components/SimuladorLoteTab.tsx`** (NUEVO): la pestaña interactiva (inputs + resultados).
- **`src/pages/LoteDetalle.tsx`**: integrar la pestaña "📈 Simulador".

Sin cambios en Firestore ni en los tipos (reusa `Lote.precioReferenciaKg` de la 4-A).

## Testing

- **Unit (TDD):** `tests/unit/simulador.test.ts`. Casos: conviene esperar
  (`ganancia×precio > costo`), conviene vender (`ganancia×precio < costo`), break-even
  (`valorMarginalDiario === 0`), `dias = 0` (todo en 0/igual a hoy), `gananciaEsperar = dias ×
  valorMarginalDiario`.
- **E2E smoke:** la pestaña "📈 Simulador" abre, muestra el veredicto, y al cambiar "Días" el
  resultado reacciona.

## Limitación honesta (documentada)

El modelo asume **ganancia diaria constante** (proyección lineal). En la realidad la ganancia
diaria **decrece** a medida que el animal madura, así que la proyección a horizontes largos es
optimista. Es razonable para 30–90 días y se comunica como estimación. Un modelo con curva de
crecimiento queda fuera de alcance.

## Fuera de alcance

- Simulación **por animal** (iteración futura).
- **Guardar** escenarios / histórico de simulaciones.
- **Precio futuro distinto** al de hoy (se usa un solo ₡/kg editable).
- Curva de crecimiento (decaimiento de la ganancia diaria).
- Reporte crédito MAG (Fase 4-C).

## Entregable

- `utils/simulador.ts` + `SimuladorLoteTab` + pestaña en LoteDetalle.
- Tests unit (TDD) + smoke E2E.
- PR dedicado (rama `feature/fase4-simulador`, stackeada sobre 4-A).
