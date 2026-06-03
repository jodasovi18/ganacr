# Fase 4-A: Núcleo de rentabilidad — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar métricas de rentabilidad por lote (costo/kg, margen por animal, resultado estimado, ROI) y una comparativa entre lotes, calculadas en vivo desde los datos existentes.

**Architecture:** Función pura `utils/finanzas.ts` (testeable con node:test) + un campo opcional `Lote.precioReferenciaKg` + dos pestañas "💰 Finanzas" (una en LoteDetalle con el detalle, otra en Dashboard con la comparativa, alimentada por un hook `useFinanzasFinca`). Sin colección nueva.

**Tech Stack:** React 18 + TS, Firestore, Tailwind v4 + shadcn, tests con `node:test` (tests/unit) y Playwright+emulador (tests/e2e).

---

## Estructura de archivos
- `src/types/index.ts` — agregar `Lote.precioReferenciaKg?`
- `src/utils/finanzas.ts` (NUEVO) — `precioRefPorDefecto`, `calcularFinanzasLote`, tipo `FinanzasLote`
- `tests/unit/finanzas.test.ts` (NUEVO) — tests de la función pura
- `src/components/FinanzasLoteTab.tsx` (NUEVO) — detalle financiero de un lote
- `src/hooks/useFinanzasFinca.ts` (NUEVO) — comparativa (carga animales+ventas de la finca)
- `src/components/FinanzasFincaTab.tsx` (NUEVO) — tabla comparativa
- `src/pages/LoteDetalle.tsx` — integrar pestaña Finanzas
- `src/pages/Dashboard.tsx` — integrar pestaña Finanzas
- `tests/e2e/finanzas.spec.ts` (NUEVO) — smoke E2E
- `CLAUDE.md` — marcar Fase 4-A

---

### Task 1: Campo `precioReferenciaKg` en el tipo Lote

**Files:** Modify `src/types/index.ts`

- [ ] **Step 1: Agregar el campo a la interface `Lote`**

En `src/types/index.ts`, dentro de `export interface Lote { ... }`, agregar después de `utilidadTotal: number;`:
```ts
  precioReferenciaKg?: number; // ₡/kg para valorar el inventario en pie (opcional)
```

- [ ] **Step 2: Verificar typecheck** — Run: `npm run build` → Expected: `✓ built` sin errores.

- [ ] **Step 3: Commit**
```bash
git add src/types/index.ts
git commit -m "feat(finanzas): campo Lote.precioReferenciaKg"
```

---

### Task 2: `utils/finanzas.ts` (función pura, TDD)

**Files:** Create `tests/unit/finanzas.test.ts`, Create `src/utils/finanzas.ts`

- [ ] **Step 1: Escribir el test que falla**
```ts
// tests/unit/finanzas.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularFinanzasLote, precioRefPorDefecto } from '../../src/utils/finanzas';

const lote = (extra: any = {}) => ({
  id: 'L1', nombreLote: 'Lote 1', tipoPropiedad: 'propio', socio: null,
  totalInvertido: 1_000_000, totalGastos: 200_000, totalVentas: 700_000, ...extra,
} as any);

const animales = [
  { id: 'a1', estado: 'vendido', numeroArete: 'A1', pesoInicial: 300, pesoActual: 500, precioCompra: 400_000, fechaIngreso: '2026-01-01' },
  { id: 'a2', estado: 'activo',  numeroArete: 'A2', pesoInicial: 300, pesoActual: 400, precioCompra: 300_000, fechaIngreso: '2026-01-01' },
  { id: 'a3', estado: 'activo',  numeroArete: 'A3', pesoInicial: 300, pesoActual: 400, precioCompra: 300_000, fechaIngreso: '2026-01-01' },
] as any;

const ventas = [{
  id: 'v1', cantidadAnimales: 1, gastosProporcion: 50_000, totalVenta: 700_000,
  animales: [{ numeroArete: 'A1', pesoFinal: 500, precioVenta: 700_000, precioCompra: 400_000 }],
}] as any;

test('calcularFinanzasLote — métricas núcleo (propio)', () => {
  const f = calcularFinanzasLote(lote(), animales, ventas, 1000);
  assert.equal(f.kgProducidos, 400);              // 200+100+100
  assert.equal(f.costoEngordeKg, 500);            // 200000/400
  assert.equal(f.costoTotalKg, 3000);             // 1200000/400
  assert.equal(f.valorInventario, 800_000);       // (400+400)*1000
  assert.equal(f.resultadoEstimado, 300_000);     // (700000+800000)-(1000000+200000)
  assert.equal(f.roi, 25);                         // 300000/1200000*100
  assert.equal(f.margenPromedioVendido, 250_000); // 700000-400000-50000
  assert.equal(f.margenPorAnimal[0].numeroArete, 'A1');
});

test('calcularFinanzasLote — reparto a-medias 50/50', () => {
  const f = calcularFinanzasLote(
    lote({ tipoPropiedad: 'medias', socio: { nombre: 'X', porcentaje: 50 } }), animales, ventas, 1000);
  assert.equal(f.resultadoSocio, 150_000);
  assert.equal(f.resultadoPropietario, 150_000);
});

test('calcularFinanzasLote — sin kg producidos no divide por cero', () => {
  const sinKg = [{ id: 'a', estado: 'activo', numeroArete: 'A', pesoInicial: 300, pesoActual: 300, precioCompra: 0, fechaIngreso: '2026-01-01' }] as any;
  const f = calcularFinanzasLote(lote({ totalInvertido: 0, totalGastos: 0, totalVentas: 0 }), sinKg, [], 0);
  assert.equal(f.kgProducidos, 0);
  assert.equal(f.costoEngordeKg, 0);
  assert.equal(f.costoTotalKg, 0);
  assert.equal(f.roi, 0);
});

test('precioRefPorDefecto — promedio ₡/kg realizado', () => {
  assert.equal(precioRefPorDefecto(ventas), 1400); // 700000/500
  assert.equal(precioRefPorDefecto([]), 0);
});
```

- [ ] **Step 2: Correr y verque falla** — Run: `npm run test:unit` → Expected: FAIL (`Cannot find module '../../src/utils/finanzas'`).

- [ ] **Step 3: Implementar `src/utils/finanzas.ts`**
```ts
import { Lote, Animal, Venta } from '@/types';

export interface FinanzasLote {
  loteId: string;
  nombreLote: string;
  inversionTotal: number;
  gastosTotal: number;
  ventasTotal: number;
  kgProducidos: number;
  costoEngordeKg: number;
  costoTotalKg: number;
  precioRefKg: number;
  valorInventario: number;
  resultadoEstimado: number;
  roi: number;
  gananciaDiariaProm: number;
  resultadoSocio?: number;
  resultadoPropietario?: number;
  margenPorAnimal: { numeroArete: string; margen: number }[];
  margenPromedioVendido: number;
}

/** ₡/kg de referencia por defecto: promedio realizado (precioVenta/pesoFinal) de las ventas. */
export function precioRefPorDefecto(ventas: Venta[]): number {
  const ratios = ventas
    .flatMap((v) => v.animales)
    .filter((a) => a.pesoFinal > 0)
    .map((a) => a.precioVenta / a.pesoFinal);
  if (ratios.length === 0) return 0;
  return ratios.reduce((s, r) => s + r, 0) / ratios.length;
}

function diasDesde(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(1, Math.floor(ms / 86_400_000));
}

export function calcularFinanzasLote(
  lote: Lote, animales: Animal[], ventas: Venta[], precioRefKg: number,
): FinanzasLote {
  const inversionTotal = lote.totalInvertido;
  const gastosTotal = lote.totalGastos;
  const ventasTotal = lote.totalVentas;

  const productivos = animales.filter((a) => a.estado === 'activo' || a.estado === 'vendido');
  const kgProducidos = productivos.reduce((s, a) => s + Math.max(0, a.pesoActual - a.pesoInicial), 0);

  const costoEngordeKg = kgProducidos > 0 ? gastosTotal / kgProducidos : 0;
  const costoTotalKg = kgProducidos > 0 ? (inversionTotal + gastosTotal) / kgProducidos : 0;

  const activos = animales.filter((a) => a.estado === 'activo');
  const valorInventario = activos.reduce((s, a) => s + a.pesoActual * precioRefKg, 0);

  const resultadoEstimado = (ventasTotal + valorInventario) - (inversionTotal + gastosTotal);
  const baseCosto = inversionTotal + gastosTotal;
  const roi = baseCosto > 0 ? (resultadoEstimado / baseCosto) * 100 : 0;

  const gd = activos.map((a) => Math.max(0, a.pesoActual - a.pesoInicial) / diasDesde(a.fechaIngreso));
  const gananciaDiariaProm = gd.length > 0 ? gd.reduce((s, g) => s + g, 0) / gd.length : 0;

  const margenPorAnimal = ventas.flatMap((v) => {
    const gastoPorAnimal = v.cantidadAnimales > 0 ? v.gastosProporcion / v.cantidadAnimales : 0;
    return v.animales.map((a) => ({
      numeroArete: a.numeroArete,
      margen: a.precioVenta - a.precioCompra - gastoPorAnimal,
    }));
  });
  const margenPromedioVendido = margenPorAnimal.length > 0
    ? margenPorAnimal.reduce((s, m) => s + m.margen, 0) / margenPorAnimal.length : 0;

  const r: FinanzasLote = {
    loteId: lote.id, nombreLote: lote.nombreLote,
    inversionTotal, gastosTotal, ventasTotal, kgProducidos,
    costoEngordeKg, costoTotalKg, precioRefKg, valorInventario,
    resultadoEstimado, roi, gananciaDiariaProm, margenPorAnimal, margenPromedioVendido,
  };
  if (lote.tipoPropiedad === 'medias' && lote.socio) {
    r.resultadoSocio = resultadoEstimado * (lote.socio.porcentaje / 100);
    r.resultadoPropietario = resultadoEstimado - r.resultadoSocio;
  }
  return r;
}
```

- [ ] **Step 4: Correr y verde** — Run: `npm run test:unit` → Expected: los 4 tests nuevos PASS (+ los 13 previos).

- [ ] **Step 5: Commit**
```bash
git add src/utils/finanzas.ts tests/unit/finanzas.test.ts
git commit -m "feat(finanzas): calcularFinanzasLote + precioRefPorDefecto (TDD)"
```

---

### Task 3: Componente `FinanzasLoteTab`

**Files:** Create `src/components/FinanzasLoteTab.tsx`

- [ ] **Step 1: Crear el componente**
```tsx
import { useMemo, useState, useEffect } from 'react';
import { Lote, Animal, Venta } from '@/types';
import { calcularFinanzasLote, precioRefPorDefecto } from '@/utils/finanzas';
import { useActualizarLote } from '@/hooks/useLotes';
import { formatColones, formatKg } from '@/utils/calculadora';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface Props { lote: Lote; animales: Animal[]; ventas: Venta[]; }

export default function FinanzasLoteTab({ lote, animales, ventas }: Props) {
  const { actualizarLote } = useActualizarLote();
  const refDefault = useMemo(() => lote.precioReferenciaKg ?? precioRefPorDefecto(ventas), [lote.precioReferenciaKg, ventas]);
  const [precioRef, setPrecioRef] = useState<string>(String(Math.round(refDefault)));
  const [guardando, setGuardando] = useState(false);
  useEffect(() => { setPrecioRef(String(Math.round(refDefault))); }, [refDefault]);

  const fin = useMemo(
    () => calcularFinanzasLote(lote, animales, ventas, Number(precioRef) || 0),
    [lote, animales, ventas, precioRef],
  );

  async function guardarRef() {
    setGuardando(true);
    try { await actualizarLote(lote.id, { precioReferenciaKg: Number(precioRef) || 0 }); }
    finally { setGuardando(false); }
  }

  const card = (label: string, value: string, hint?: string) => (
    <Card><CardContent className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </CardContent></Card>
  );

  return (
    <div className="space-y-4 py-3">
      {/* Precio de referencia */}
      <div className="flex items-end gap-2 flex-wrap">
        <div className="space-y-1.5">
          <Label htmlFor="precio-ref" className="text-xs">Precio ₡/kg de referencia (inventario en pie)</Label>
          <Input id="precio-ref" type="number" min="0" className="w-40"
            value={precioRef} onChange={(e) => setPrecioRef(e.target.value)} />
        </div>
        <Button size="sm" variant="outline" onClick={guardarRef} disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {card('Resultado estimado', formatColones(fin.resultadoEstimado), 'ventas + inventario − inversión − gastos')}
        {card('Rentabilidad (ROI)', `${fin.roi.toFixed(1)}%`)}
        {card('Valor inventario en pie', formatColones(fin.valorInventario))}
        {card('Costo de engorde / kg', formatColones(fin.costoEngordeKg))}
        {card('Costo total / kg', formatColones(fin.costoTotalKg))}
        {card('Kg producidos', formatKg(fin.kgProducidos))}
      </div>

      {lote.tipoPropiedad === 'medias' && lote.socio && (
        <Card><CardContent className="p-3 text-sm">
          Reparto del resultado — Vos: <strong>{formatColones(fin.resultadoPropietario ?? 0)}</strong> ·
          {' '}{lote.socio.nombre}: <strong>{formatColones(fin.resultadoSocio ?? 0)}</strong>
        </CardContent></Card>
      )}

      <div>
        <h3 className="font-semibold text-sm mb-2">Margen por animal vendido (promedio {formatColones(fin.margenPromedioVendido)})</h3>
        {fin.margenPorAnimal.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin ventas registradas.</p>
        ) : (
          <div className="rounded-lg border border-border divide-y divide-border">
            {fin.margenPorAnimal.map((m) => (
              <div key={m.numeroArete} className="flex justify-between px-3 py-1.5 text-sm">
                <span>{m.numeroArete}</span>
                <span className={m.margen >= 0 ? 'text-success' : 'text-destructive'}>{formatColones(m.margen)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build** — Run: `npm run build` → Expected: `✓ built`.

- [ ] **Step 3: Commit**
```bash
git add src/components/FinanzasLoteTab.tsx
git commit -m "feat(finanzas): FinanzasLoteTab (detalle por lote)"
```

---

### Task 4: Integrar pestaña Finanzas en LoteDetalle

**Files:** Modify `src/pages/LoteDetalle.tsx`

- [ ] **Step 1: Importar el componente** — agregar tras la línea `import SanidadTab from '@/components/SanidadTab';`:
```ts
import FinanzasLoteTab from '@/components/FinanzasLoteTab';
```

- [ ] **Step 2: Agregar 'finanzas' al tipo Tab** — cambiar la línea
`type Tab = 'animales' | 'gastos' | 'ventas' | 'pesos' | 'sanidad';` por:
```ts
type Tab = 'animales' | 'gastos' | 'ventas' | 'pesos' | 'sanidad' | 'finanzas';
```

- [ ] **Step 3: Agregar el TabsTrigger** — tras
`<TabsTrigger value="sanidad" ...>🩺 Sanidad ({eventos.length})</TabsTrigger>` agregar:
```tsx
              <TabsTrigger value="finanzas" className="text-xs sm:text-sm">💰 Finanzas</TabsTrigger>
```

- [ ] **Step 4: Agregar el TabsContent** — antes del cierre `</Tabs>` (después del `<TabsContent value="sanidad">…</TabsContent>`) agregar:
```tsx
          <TabsContent value="finanzas">
            {lote && <FinanzasLoteTab lote={lote} animales={animales} ventas={ventas} />}
          </TabsContent>
```

- [ ] **Step 5: Verificar build** — Run: `npm run build` → Expected: `✓ built`.

- [ ] **Step 6: Commit**
```bash
git add src/pages/LoteDetalle.tsx
git commit -m "feat(finanzas): pestaña Finanzas en LoteDetalle"
```

---

### Task 5: Hook `useFinanzasFinca`

**Files:** Create `src/hooks/useFinanzasFinca.ts`

- [ ] **Step 1: Crear el hook**
```ts
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Lote, Animal, Venta } from '@/types';
import { calcularFinanzasLote, precioRefPorDefecto, FinanzasLote } from '@/utils/finanzas';

/** Calcula finanzas de todos los lotes de la finca (comparativa). */
export function useFinanzasFinca(fincaId: string | null, lotes: Lote[]) {
  const { user } = useAuth();
  const [filas, setFilas] = useState<FinanzasLote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !fincaId || lotes.length === 0) { setFilas([]); setLoading(false); return; }
    let cancel = false;
    setLoading(true);
    (async () => {
      const [animalesSnap, ventasSnap] = await Promise.all([
        getDocs(query(collection(db, 'animales'), where('userId', '==', user.uid), where('fincaId', '==', fincaId))),
        getDocs(query(collection(db, 'ventas'), where('userId', '==', user.uid), where('fincaId', '==', fincaId))),
      ]);
      const animales = animalesSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Animal));
      const ventas = ventasSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Venta));
      const filasCalc = lotes.map((lote) => {
        const aLote = animales.filter((a) => a.loteId === lote.id);
        const vLote = ventas.filter((v) => v.loteId === lote.id);
        const ref = lote.precioReferenciaKg ?? precioRefPorDefecto(vLote);
        return calcularFinanzasLote(lote, aLote, vLote, ref);
      });
      if (!cancel) { setFilas(filasCalc); setLoading(false); }
    })().catch((e) => { console.error('[useFinanzasFinca]', e); if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [user, fincaId, lotes]);

  return { filas, loading };
}
```

- [ ] **Step 2: Verificar build** — Run: `npm run build` → Expected: `✓ built`.

- [ ] **Step 3: Commit**
```bash
git add src/hooks/useFinanzasFinca.ts
git commit -m "feat(finanzas): hook useFinanzasFinca (comparativa)"
```

---

### Task 6: Componente `FinanzasFincaTab` (comparativa)

**Files:** Create `src/components/FinanzasFincaTab.tsx`

- [ ] **Step 1: Crear el componente**
```tsx
import { useMemo } from 'react';
import { Lote } from '@/types';
import { useFinanzasFinca } from '@/hooks/useFinanzasFinca';
import { formatColones, formatKg } from '@/utils/calculadora';
import { Card, CardContent } from '@/components/ui/card';

interface Props { fincaId: string | null; lotes: Lote[]; }

export default function FinanzasFincaTab({ fincaId, lotes }: Props) {
  const { filas, loading } = useFinanzasFinca(fincaId, lotes);
  const ordenadas = useMemo(() => [...filas].sort((a, b) => b.resultadoEstimado - a.resultadoEstimado), [filas]);
  const totalResultado = filas.reduce((s, f) => s + f.resultadoEstimado, 0);

  if (loading) return <p className="text-sm text-muted-foreground py-6">Calculando…</p>;
  if (filas.length === 0) return <p className="text-sm text-muted-foreground py-6">No hay lotes para comparar.</p>;

  return (
    <div className="space-y-3 py-3">
      <Card><CardContent className="p-3">
        <p className="text-xs text-muted-foreground">Resultado estimado total de la finca</p>
        <p className={`text-xl font-bold ${totalResultado >= 0 ? 'text-success' : 'text-destructive'}`}>
          {formatColones(totalResultado)}
        </p>
      </CardContent></Card>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Lote</th>
              <th className="px-3 py-2 text-right">Resultado est.</th>
              <th className="px-3 py-2 text-right">ROI</th>
              <th className="px-3 py-2 text-right">Costo engorde/kg</th>
              <th className="px-3 py-2 text-right">Ganancia diaria</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ordenadas.map((f, i) => (
              <tr key={f.loteId} className="hover:bg-muted/50">
                <td className="px-3 py-2">
                  {i === 0 && <span title="Mejor">🥇 </span>}
                  {i === ordenadas.length - 1 && ordenadas.length > 1 && <span title="Peor">🔻 </span>}
                  {f.nombreLote}
                </td>
                <td className={`px-3 py-2 text-right ${f.resultadoEstimado >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatColones(f.resultadoEstimado)}
                </td>
                <td className="px-3 py-2 text-right">{f.roi.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right">{formatColones(f.costoEngordeKg)}</td>
                <td className="px-3 py-2 text-right">{formatKg(f.gananciaDiariaProm)}/día</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build** — Run: `npm run build` → Expected: `✓ built`.

- [ ] **Step 3: Commit**
```bash
git add src/components/FinanzasFincaTab.tsx
git commit -m "feat(finanzas): FinanzasFincaTab (comparativa entre lotes)"
```

---

### Task 7: Integrar pestaña Finanzas en Dashboard

**Files:** Modify `src/pages/Dashboard.tsx`

- [ ] **Step 1: Importar el componente** — tras `import GastosFincaTab from '@/components/GastosFincaTab';`:
```ts
import FinanzasFincaTab from '@/components/FinanzasFincaTab';
```

- [ ] **Step 2: Agregar 'finanzas' al tipo DashboardTab** — cambiar
`type DashboardTab = 'lotes' | 'gastosFinca';` por:
```ts
type DashboardTab = 'lotes' | 'gastosFinca' | 'finanzas';
```

- [ ] **Step 3: Agregar el TabsTrigger** — tras
`<TabsTrigger value="gastosFinca">Gastos de Finca</TabsTrigger>` agregar:
```tsx
              <TabsTrigger value="finanzas">💰 Finanzas</TabsTrigger>
```

- [ ] **Step 4: Agregar el TabsContent** — tras el bloque `<TabsContent value="gastosFinca">…</TabsContent>` agregar:
```tsx
          <TabsContent value="finanzas">
            <FinanzasFincaTab fincaId={fincaActiva?.id ?? null} lotes={lotes} />
          </TabsContent>
```

- [ ] **Step 5: Verificar build** — Run: `npm run build` → Expected: `✓ built`.

- [ ] **Step 6: Commit**
```bash
git add src/pages/Dashboard.tsx
git commit -m "feat(finanzas): pestaña Finanzas en Dashboard (comparativa)"
```

---

### Task 8: Smoke E2E

**Files:** Create `tests/e2e/finanzas.spec.ts`

> El seed del emulador ya tiene un lote con ventas + activos (Nelore Socio) y otro con activos (Brahman Propio), así que las pestañas tienen datos.

- [ ] **Step 1: Escribir el spec**
```ts
import { test, expect } from '@playwright/test';
import { login, abrirLote } from './helpers';
import { LOTE_PROPIO } from './fixtures';

test.describe('Finanzas', () => {
  test('comparativa de finca muestra los lotes', async ({ page }) => {
    await login(page);
    await page.getByRole('tab', { name: /Finanzas/i }).click();
    await expect(page.getByText(/Resultado estimado total/i)).toBeVisible();
    await expect(page.getByText(LOTE_PROPIO.nombre)).toBeVisible();
  });

  test('detalle financiero del lote muestra métricas', async ({ page }) => {
    await login(page);
    await abrirLote(page, LOTE_PROPIO.nombre);
    await page.getByRole('tab', { name: /Finanzas/i }).click();
    await expect(page.getByText(/Resultado estimado/i)).toBeVisible();
    await expect(page.getByText(/Costo de engorde/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Correr (requiere JDK 17 + emulador)** — Run: `npm run test:e2e` → Expected: los 2 finanzas + los 16 previos en verde. Ajustar selectores si difieren (ver intro de la suite).

- [ ] **Step 3: Commit**
```bash
git add tests/e2e/finanzas.spec.ts
git commit -m "test(e2e): smoke de las pestañas Finanzas"
```

---

### Task 9: Build + lint + CLAUDE.md

**Files:** Modify `CLAUDE.md`

- [ ] **Step 1: Verificación final** — Run: `npm run build && npm run lint && npm run test:unit` → Expected: build ✓, lint limpio, unit verde (17 tests).

- [ ] **Step 2: Marcar Fase 4-A en CLAUDE.md** — en la sección `### Fase 4 — Finanzas y costos ganaderos`, marcar como hechos los ítems de costo/kg, margen por animal y rentabilidad por lote + comparativa (cambiar `- [ ]` por `- [x]` con nota "(núcleo, jun 2026)"); dejar el simulador y el reporte MAG como `- [ ]`.

- [ ] **Step 3: Commit**
```bash
git add CLAUDE.md
git commit -m "docs: marcar Fase 4-A (núcleo de rentabilidad) en CLAUDE.md"
```

---

## Cierre
- [ ] **PR** — `git push -u origin feature/fase4-finanzas` + `gh pr create --base main`. No mergear sin revisión de José.
