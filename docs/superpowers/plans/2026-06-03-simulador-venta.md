# Fase 4-B: Simulador de venta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una pestaña "📈 Simulador" en el lote que compara vender hoy vs. en N días (proyectando peso ganado y costo de mantener), con veredicto.

**Architecture:** Función pura `utils/simulador.ts` (testeable) + componente `SimuladorLoteTab` con inputs editables (defaults derivados de los datos) que recalcula en vivo. Sin persistencia. Reusa `precioRefPorDefecto` de la Fase 4-A.

**Tech Stack:** React 18 + TS, Tailwind v4 + shadcn, tests `node:test` (tests/unit) y Playwright+emulador (tests/e2e).

---

## Estructura de archivos
- `src/utils/simulador.ts` (NUEVO) — `simularVenta`, tipo `SimulacionVenta`
- `tests/unit/simulador.test.ts` (NUEVO) — tests de la función pura
- `src/components/SimuladorLoteTab.tsx` (NUEVO) — la pestaña interactiva
- `src/pages/LoteDetalle.tsx` — integrar pestaña "📈 Simulador"
- `tests/e2e/simulador.spec.ts` (NUEVO) — smoke E2E
- `CLAUDE.md` — marcar Fase 4-B

---

### Task 1: `utils/simulador.ts` (función pura, TDD)

**Files:** Create `tests/unit/simulador.test.ts`, Create `src/utils/simulador.ts`

- [ ] **Step 1: Escribir el test que falla**
```ts
// tests/unit/simulador.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { simularVenta } from '../../src/utils/simulador';

test('simularVenta — conviene esperar', () => {
  // pesoActivos 1000, ganancia 5 kg/día, ₡1000/kg, costo ₡3000/día, 30 días
  const s = simularVenta(1000, 5, 1000, 3000, 30);
  assert.equal(s.pesoFuturo, 1150);            // 1000 + 5*30
  assert.equal(s.ingresoHoy, 1_000_000);       // 1000*1000
  assert.equal(s.ingresoFuturo, 1_150_000);    // 1150*1000
  assert.equal(s.costoMantener, 90_000);       // 3000*30
  assert.equal(s.valorMarginalDiario, 2000);   // 5*1000 - 3000
  assert.equal(s.gananciaEsperar, 60_000);     // 1150000-90000-1000000 (= 30*2000)
  assert.equal(s.convieneEsperar, true);
});

test('simularVenta — conviene vender ahora', () => {
  const s = simularVenta(1000, 1, 1000, 3000, 30); // marginal = 1000-3000 = -2000
  assert.equal(s.valorMarginalDiario, -2000);
  assert.equal(s.gananciaEsperar, -60_000);
  assert.equal(s.convieneEsperar, false);
});

test('simularVenta — break-even (marginal 0)', () => {
  const s = simularVenta(1000, 3, 1000, 3000, 30); // 3*1000-3000 = 0
  assert.equal(s.valorMarginalDiario, 0);
  assert.equal(s.gananciaEsperar, 0);
  assert.equal(s.convieneEsperar, false);
});

test('simularVenta — dias 0 = igual a hoy', () => {
  const s = simularVenta(1000, 5, 1000, 3000, 0);
  assert.equal(s.pesoFuturo, 1000);
  assert.equal(s.ingresoFuturo, s.ingresoHoy);
  assert.equal(s.gananciaEsperar, 0);
});
```

- [ ] **Step 2: Correr y ver que falla** — Run: `npm run test:unit` → Expected: FAIL (`Cannot find module '../../src/utils/simulador'`).

- [ ] **Step 3: Implementar `src/utils/simulador.ts`**
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
): SimulacionVenta {
  const pesoFuturo = pesoActivos + gananciaDiariaKgDia * dias;
  const ingresoHoy = pesoActivos * precioKg;
  const ingresoFuturo = pesoFuturo * precioKg;
  const costoMantener = costoDiario * dias;
  const gananciaEsperar = (ingresoFuturo - costoMantener) - ingresoHoy;
  const valorMarginalDiario = gananciaDiariaKgDia * precioKg - costoDiario;
  return {
    dias, pesoFuturo, ingresoHoy, ingresoFuturo, costoMantener,
    gananciaEsperar, valorMarginalDiario, convieneEsperar: valorMarginalDiario > 0,
  };
}
```

- [ ] **Step 4: Correr y verde** — Run: `npm run test:unit` → Expected: los 4 nuevos PASS (+ los 17 previos = 21).

- [ ] **Step 5: Commit**
```bash
git add src/utils/simulador.ts tests/unit/simulador.test.ts
git commit -m "feat(simulador): simularVenta (TDD)"
```

---

### Task 2: Componente `SimuladorLoteTab`

**Files:** Create `src/components/SimuladorLoteTab.tsx`

- [ ] **Step 1: Crear el componente**
```tsx
import { useMemo, useState } from 'react';
import { Lote, Animal, Venta } from '@/types';
import { simularVenta } from '@/utils/simulador';
import { precioRefPorDefecto } from '@/utils/finanzas';
import { formatColones, formatKg } from '@/utils/calculadora';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface Props { lote: Lote; animales: Animal[]; ventas: Venta[]; }

const diasDesde = (iso: string) =>
  Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

export default function SimuladorLoteTab({ lote, animales, ventas }: Props) {
  const activos = useMemo(() => animales.filter((a) => a.estado === 'activo'), [animales]);
  const pesoActivos = useMemo(() => activos.reduce((s, a) => s + a.pesoActual, 0), [activos]);
  const gananciaDefault = useMemo(
    () => activos.reduce((s, a) => s + Math.max(0, (a.pesoActual - a.pesoInicial) / diasDesde(a.fechaIngreso)), 0),
    [activos],
  );
  const precioDefault = useMemo(
    () => lote.precioReferenciaKg ?? precioRefPorDefecto(ventas),
    [lote.precioReferenciaKg, ventas],
  );
  const costoDefault = useMemo(
    () => lote.totalGastos / diasDesde(lote.fechaCompra),
    [lote.totalGastos, lote.fechaCompra],
  );

  const [dias, setDias] = useState('30');
  const [precio, setPrecio] = useState(String(Math.round(precioDefault)));
  const [ganancia, setGanancia] = useState(gananciaDefault.toFixed(1));
  const [costo, setCosto] = useState(String(Math.round(costoDefault)));

  const sim = useMemo(
    () => simularVenta(pesoActivos, Number(ganancia) || 0, Number(precio) || 0, Number(costo) || 0, Number(dias) || 0),
    [pesoActivos, ganancia, precio, costo, dias],
  );

  if (pesoActivos === 0) {
    return <p className="text-sm text-muted-foreground py-6">No hay animales activos para simular.</p>;
  }

  const field = (id: string, label: string, value: string, onChange: (v: string) => void, suffix?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        <Input id={id} type="number" min="0" className="w-28" value={value} onChange={(e) => onChange(e.target.value)} />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );

  const card = (label: string, value: string) => (
    <Card><CardContent className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </CardContent></Card>
  );

  return (
    <div className="space-y-4 py-3">
      <div className="flex flex-wrap gap-3">
        {field('sim-dias', 'Días', dias, setDias, 'días')}
        {field('sim-precio', '₡/kg', precio, setPrecio)}
        {field('sim-ganancia', 'Ganancia diaria', ganancia, setGanancia, 'kg/día')}
        {field('sim-costo', 'Costo diario', costo, setCosto, '₡/día')}
      </div>

      <Card><CardContent className="p-3">
        {sim.convieneEsperar ? (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            🟢 Conviene esperar (+{formatColones(sim.valorMarginalDiario)}/día)
          </Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
            🟡 Conviene vender ahora ({formatColones(sim.valorMarginalDiario)}/día)
          </Badge>
        )}
        <p className="mt-2 text-sm">
          Esperar <strong>{Number(dias) || 0}</strong> días:{' '}
          <strong className={sim.gananciaEsperar >= 0 ? 'text-success' : 'text-destructive'}>
            {sim.gananciaEsperar >= 0 ? '+' : ''}{formatColones(sim.gananciaEsperar)}
          </strong>{' '}vs. vender hoy.
        </p>
      </CardContent></Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {card('Ingreso hoy', formatColones(sim.ingresoHoy))}
        {card(`Ingreso en ${Number(dias) || 0} días`, formatColones(sim.ingresoFuturo))}
        {card('Costo de mantener', formatColones(sim.costoMantener))}
        {card('Peso futuro', formatKg(sim.pesoFuturo))}
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-2">Ganancia de esperar por horizonte</h3>
        <div className="rounded-lg border border-border divide-y divide-border">
          {[30, 60, 90].map((d) => {
            const s = simularVenta(pesoActivos, Number(ganancia) || 0, Number(precio) || 0, Number(costo) || 0, d);
            return (
              <div key={d} className="flex justify-between px-3 py-1.5 text-sm">
                <span>{d} días</span>
                <span className={s.gananciaEsperar >= 0 ? 'text-success' : 'text-destructive'}>
                  {s.gananciaEsperar >= 0 ? '+' : ''}{formatColones(s.gananciaEsperar)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build** — Run: `npm run build` → Expected: `✓ built`.

- [ ] **Step 3: Commit**
```bash
git add src/components/SimuladorLoteTab.tsx
git commit -m "feat(simulador): SimuladorLoteTab (calculadora vender hoy vs N días)"
```

---

### Task 3: Integrar pestaña Simulador en LoteDetalle

**Files:** Modify `src/pages/LoteDetalle.tsx`

- [ ] **Step 1: Importar el componente** — tras `import FinanzasLoteTab from '@/components/FinanzasLoteTab';` agregar:
```ts
import SimuladorLoteTab from '@/components/SimuladorLoteTab';
```

- [ ] **Step 2: Agregar 'simulador' al tipo Tab** — cambiar
`type Tab = 'animales' | 'gastos' | 'ventas' | 'pesos' | 'sanidad' | 'finanzas';` por:
```ts
type Tab = 'animales' | 'gastos' | 'ventas' | 'pesos' | 'sanidad' | 'finanzas' | 'simulador';
```

- [ ] **Step 3: Agregar el TabsTrigger** — tras
`<TabsTrigger value="finanzas" className="text-xs sm:text-sm">💰 Finanzas</TabsTrigger>` agregar:
```tsx
              <TabsTrigger value="simulador" className="text-xs sm:text-sm">📈 Simulador</TabsTrigger>
```

- [ ] **Step 4: Agregar el TabsContent** — tras el bloque
`<TabsContent value="finanzas">…</TabsContent>` (y antes de `</Tabs>`) agregar:
```tsx
          <TabsContent value="simulador">
            {lote && <SimuladorLoteTab lote={lote} animales={animales} ventas={ventas} />}
          </TabsContent>
```

- [ ] **Step 5: Verificar build** — Run: `npm run build` → Expected: `✓ built`.

- [ ] **Step 6: Commit**
```bash
git add src/pages/LoteDetalle.tsx
git commit -m "feat(simulador): pestaña Simulador en LoteDetalle"
```

---

### Task 4: Smoke E2E

**Files:** Create `tests/e2e/simulador.spec.ts`

- [ ] **Step 1: Escribir el spec**
```ts
import { test, expect } from '@playwright/test';
import { login, abrirLote } from './helpers';
import { LOTE_PROPIO } from './fixtures';

test.describe('Simulador', () => {
  test('la pestaña Simulador abre y muestra un veredicto', async ({ page }) => {
    await login(page);
    await abrirLote(page, LOTE_PROPIO.nombre);
    await page.getByRole('tab', { name: /Simulador/i }).click();
    await expect(page.getByText(/Conviene (esperar|vender)/i)).toBeVisible();
  });

  test('cambiar los días recalcula', async ({ page }) => {
    await login(page);
    await abrirLote(page, LOTE_PROPIO.nombre);
    await page.getByRole('tab', { name: /Simulador/i }).click();
    await page.getByLabel('Días').fill('60');
    await expect(page.getByText('Ingreso en 60 días')).toBeVisible();
  });
});
```

- [ ] **Step 2: Correr (requiere JDK 17 + emulador)** — Run: `npm run test:e2e` → Expected: los 2 simulador + los 18 previos en verde. Ajustar selectores si difieren (ver intro de la suite).

- [ ] **Step 3: Commit**
```bash
git add tests/e2e/simulador.spec.ts
git commit -m "test(e2e): smoke del Simulador"
```

---

### Task 5: Build + lint + CLAUDE.md

**Files:** Modify `CLAUDE.md`

- [ ] **Step 1: Verificación final** — Run: `npm run build && npm run lint && npm run test:unit` → Expected: build ✓, lint limpio, unit verde (21 tests).

- [ ] **Step 2: Marcar Fase 4-B en CLAUDE.md** — en `### Fase 4 — Finanzas y costos ganaderos`, cambiar la línea del simulador
`- [ ] Simulador de escenarios de venta (si vendo hoy vs. en 30 días) — Fase 4-B (usa gananciaDiariaProm)`
por:
```
- [x] **Simulador de escenarios de venta** (vender hoy vs. en N días): `utils/simulador.ts` (puro,
  TDD) + pestaña "📈 Simulador" en LoteDetalle (`SimuladorLoteTab`). Veredicto por valor marginal/día. jun 2026
```

- [ ] **Step 3: Commit**
```bash
git add CLAUDE.md
git commit -m "docs: marcar Fase 4-B (simulador de venta) en CLAUDE.md"
```

---

## Cierre
- [ ] **PR** — `git push -u origin feature/fase4-simulador` + `gh pr create --base main` (nota: stackeado sobre 4-A / PR #22; mergear #22 primero). No mergear sin revisión de José.
