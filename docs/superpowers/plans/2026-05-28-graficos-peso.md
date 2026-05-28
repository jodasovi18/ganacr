# Gráficos de Evolución de Peso — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Pesos" tab to LoteDetalle with semáforo alerting per animal and drill-down charts showing each animal's weight curve vs. the lote average.

**Architecture:** Pure SVG charts (no new runtime dependencies). `PesosTab` shows lote-level data (average chart + semáforo list). `AnimalPesoModal` shows the individual animal's weight history. A new `usePesosLote` hook queries all pesos for a lote. Configurable alerting thresholds stored as optional fields on the `Finca` document.

**Tech Stack:** React 18, TypeScript, Firestore onSnapshot, Pure SVG, CSS vanilla variables.

---

## File map

| File | Action | Purpose |
|---|---|---|
| `src/types/index.ts` | Modify | Add `pesoUmbralAmarillo?` and `pesoUmbralRojo?` to `Finca` |
| `src/hooks/usePesosLote.ts` | Create | Query all pesos for a lote (for semáforo + avg chart) |
| `src/hooks/useFincas.ts` | Modify | Add `actualizarUmbrales` to `useActualizarFinca` |
| `src/components/svg/LoteAvgChart.tsx` | Create | SVG: lote weight average over time |
| `src/components/svg/AnimalWeightChart.tsx` | Create | SVG: individual animal weight + reference line |
| `src/components/AnimalPesoModal.tsx` | Create | Bottom-sheet: stat cards + chart + historial + registrar peso |
| `src/components/AnimalPesoModal.css` | Create | Styles for AnimalPesoModal |
| `src/components/PesosTab.tsx` | Create | Tab content: alert banner + avg chart + semáforo list |
| `src/components/PesosTab.css` | Create | Styles for PesosTab |
| `src/pages/LoteDetalle.tsx` | Modify | Add `'pesos'` tab + wire PesosTab |
| `src/components/FincaSelector.tsx` | Modify | Add ⚙️ ajustes button + threshold inputs |
| `tests/responsive/pesos.spec.ts` | Create | Playwright E2E: Pesos tab full flow |

---

## Task 1: Update Finca type + create usePesosLote hook

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/hooks/usePesosLote.ts`

- [ ] **Step 1: Add threshold fields to the Finca interface**

Open `src/types/index.ts`. Replace the `Finca` interface (lines 18–23):

```typescript
export interface Finca {
  id: string;
  userId: string;
  nombre: string;
  pesoUmbralAmarillo?: number; // days without weighing → 🟡 (default 15)
  pesoUmbralRojo?: number;     // days without weighing → 🔴 (default 30)
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:\Users\Usuario\Desktop\Sistemas\ganacr
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Create usePesosLote.ts**

Create `src/hooks/usePesosLote.ts`:

```typescript
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Peso } from '@/types';

/**
 * Fetches all pesos for every animal in a lote, ordered by fecha desc.
 * Used by PesosTab for the semáforo list and LoteAvgChart.
 *
 * NOTE: This query uses (loteId + fecha) which requires a composite index.
 * If you see a Firestore "requires an index" error in the console, click the
 * provided link to create the index automatically in Firebase Console.
 */
export function usePesosLote(loteId: string | null) {
  const { user } = useAuth();
  const [pesos, setPesos] = useState<Peso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !loteId) { setLoading(false); return; }
    const q = query(
      collection(db, 'pesos'),
      where('loteId', '==', loteId),
      orderBy('fecha', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setPesos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Peso)));
      setLoading(false);
    }, (err) => {
      console.error('[usePesosLote] onSnapshot error:', err.code, err.message);
      setLoading(false);
    });
    return unsub;
  }, [user, loteId]);

  return { pesos, loading };
}
```

- [ ] **Step 4: Verify compilation again**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/hooks/usePesosLote.ts
git commit -m "feat(pesos): add Finca threshold fields and usePesosLote hook"
```

---

## Task 2: Create LoteAvgChart SVG component

**Files:**
- Create: `src/components/svg/LoteAvgChart.tsx`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p src/components/svg
```

- [ ] **Step 2: Create LoteAvgChart.tsx**

Create `src/components/svg/LoteAvgChart.tsx`:

```typescript
import { Peso } from '@/types';

export interface LoteAvgPoint {
  fecha: string;    // YYYY-MM-DD
  promedio: number; // kg, rounded to 1 decimal
}

/**
 * Computes the lote average weight at each date where at least one animal
 * was weighed. Uses a running-state algorithm: for each date (sorted asc),
 * updates each animal's known weight, then averages all known weights.
 * This correctly represents "what did the lote weigh on average on this date".
 */
export function calcularLoteAvgData(pesos: Peso[]): LoteAvgPoint[] {
  if (pesos.length === 0) return [];
  const sorted = [...pesos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const currentWeights = new Map<string, number>();
  const result: LoteAvgPoint[] = [];
  let i = 0;

  while (i < sorted.length) {
    const date = sorted[i].fecha.substring(0, 10);
    while (i < sorted.length && sorted[i].fecha.substring(0, 10) === date) {
      currentWeights.set(sorted[i].animalId, sorted[i].peso);
      i++;
    }
    const weights = Array.from(currentWeights.values());
    const avg = weights.reduce((s, w) => s + w, 0) / weights.length;
    result.push({ fecha: date, promedio: Math.round(avg * 10) / 10 });
  }

  return result;
}

interface Props {
  data: LoteAvgPoint[];
}

const W = 300, H = 110;
const ML = 38, MR = 10, MT = 10, MB = 22;
const CW = W - ML - MR;
const CH = H - MT - MB;

export default function LoteAvgChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="chart-empty-msg">Sin pesajes registrados en este lote.</p>
    );
  }

  const promedios = data.map((d) => d.promedio);
  const minY = Math.min(...promedios) * 0.97;
  const maxY = Math.max(...promedios) * 1.03;
  const rangeY = maxY - minY || 1;

  function xPos(i: number) {
    return data.length === 1
      ? ML + CW / 2
      : ML + (i / (data.length - 1)) * CW;
  }
  function yPos(v: number) {
    return MT + (1 - (v - minY) / rangeY) * CH;
  }

  const pts = data.map((d, i) => `${xPos(i)},${yPos(d.promedio)}`).join(' ');
  const last = data[data.length - 1];
  const first = data[0];
  const areaD =
    `M${xPos(0)},${yPos(first.promedio)} ` +
    data.slice(1).map((d, i) => `L${xPos(i + 1)},${yPos(d.promedio)}`).join(' ') +
    ` L${xPos(data.length - 1)},${H - MB} L${xPos(0)},${H - MB} Z`;

  // Show at most 4 x-axis labels evenly spaced
  const labelIdxs =
    data.length <= 4
      ? data.map((_, i) => i)
      : [0, Math.floor(data.length / 3), Math.floor((2 * data.length) / 3), data.length - 1];

  const gridVals = [0.25, 0.5, 0.75].map((t) => ({
    yv: MT + t * CH,
    label: Math.round(maxY - t * rangeY),
  }));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="lote-avg-chart"
      aria-label="Evolución del promedio del lote"
      style={{ width: '100%', display: 'block' }}
    >
      <defs>
        <linearGradient id="loteAvgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines + y labels */}
      {gridVals.map(({ yv, label }) => (
        <g key={yv}>
          <line x1={ML} y1={yv} x2={W - MR} y2={yv}
            stroke="var(--color-border)" strokeWidth="0.6" />
          <text x={ML - 4} y={yv + 3} fontSize="7"
            fill="var(--color-text-muted)" textAnchor="end">{label}</text>
        </g>
      ))}

      {/* Area fill */}
      {data.length > 1 && <path d={areaD} fill="url(#loteAvgGrad)" />}

      {/* Line */}
      {data.length > 1 && (
        <polyline points={pts} fill="none"
          stroke="var(--color-primary)" strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round" />
      )}

      {/* Dots */}
      {data.map((d, i) => (
        <circle key={i} cx={xPos(i)} cy={yPos(d.promedio)}
          r={d === last ? 4.5 : 3}
          fill={d === last ? 'var(--color-primary-dark)' : 'white'}
          stroke={d === last ? 'var(--color-accent)' : 'var(--color-primary)'}
          strokeWidth="2" />
      ))}

      {/* X-axis labels */}
      {labelIdxs.map((i) => {
        const parts = data[i].fecha.split('-');
        return (
          <text key={i} x={xPos(i)} y={H - 5} fontSize="7"
            fill="var(--color-text-muted)" textAnchor="middle">
            {`${parts[2]}/${parts[1]}`}
          </text>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/svg/LoteAvgChart.tsx
git commit -m "feat(pesos): add LoteAvgChart SVG component"
```

---

## Task 3: Create AnimalWeightChart SVG component

**Files:**
- Create: `src/components/svg/AnimalWeightChart.tsx`

- [ ] **Step 1: Create AnimalWeightChart.tsx**

Create `src/components/svg/AnimalWeightChart.tsx`:

```typescript
import { Peso } from '@/types';
import { formatKg } from '@/utils/calculadora';

interface Props {
  /** Ordered ascending by fecha */
  pesos: Peso[];
  /** Horizontal reference line: current lote average (from lote.pesoPromedio or animales avg) */
  pesoPromedioLote: number;
}

const W = 300, H = 120;
const ML = 38, MR = 10, MT = 10, MB = 22;
const CW = W - ML - MR;
const CH = H - MT - MB;

export default function AnimalWeightChart({ pesos, pesoPromedioLote }: Props) {
  if (pesos.length === 0) return null;

  const valores = pesos.map((p) => p.peso);
  const allVals = [...valores, pesoPromedioLote];
  const minY = Math.min(...allVals) * 0.97;
  const maxY = Math.max(...allVals) * 1.03;
  const rangeY = maxY - minY || 1;

  function xPos(i: number) {
    return pesos.length === 1
      ? ML + CW / 2
      : ML + (i / (pesos.length - 1)) * CW;
  }
  function yPos(v: number) {
    return MT + (1 - (v - minY) / rangeY) * CH;
  }

  const refY = yPos(pesoPromedioLote);
  const pts = pesos.map((p, i) => `${xPos(i)},${yPos(p.peso)}`).join(' ');
  const first = pesos[0];
  const last = pesos[pesos.length - 1];
  const areaD =
    `M${xPos(0)},${yPos(first.peso)} ` +
    pesos.slice(1).map((p, i) => `L${xPos(i + 1)},${yPos(p.peso)}`).join(' ') +
    ` L${xPos(pesos.length - 1)},${H - MB} L${xPos(0)},${H - MB} Z`;

  const labelIdxs =
    pesos.length <= 4
      ? pesos.map((_, i) => i)
      : [0, Math.floor(pesos.length / 3), Math.floor((2 * pesos.length) / 3), pesos.length - 1];

  const gridVals = [0.25, 0.5, 0.75].map((t) => ({
    yv: MT + t * CH,
    label: Math.round(maxY - t * rangeY),
  }));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="animal-weight-chart"
      aria-label="Evolución de peso del animal"
      style={{ width: '100%', display: 'block' }}
    >
      <defs>
        <linearGradient id="animalWeightGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines + y labels */}
      {gridVals.map(({ yv, label }) => (
        <g key={yv}>
          <line x1={ML} y1={yv} x2={W - MR} y2={yv}
            stroke="var(--color-border)" strokeWidth="0.6" />
          <text x={ML - 4} y={yv + 3} fontSize="7"
            fill="var(--color-text-muted)" textAnchor="end">{label}</text>
        </g>
      ))}

      {/* Reference line: lote average */}
      <line x1={ML} y1={refY} x2={W - MR} y2={refY}
        stroke="var(--color-primary-light)" strokeWidth="1.5"
        strokeDasharray="6,4" opacity="0.8" />
      <text x={W - MR - 2} y={refY - 3} fontSize="6.5"
        fill="var(--color-primary-light)" textAnchor="end">
        prom. lote
      </text>

      {/* Area fill */}
      {pesos.length > 1 && <path d={areaD} fill="url(#animalWeightGrad)" />}

      {/* Line */}
      {pesos.length > 1 && (
        <polyline points={pts} fill="none"
          stroke="var(--color-primary)" strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round" />
      )}

      {/* Dots */}
      {pesos.map((p, i) => (
        <circle key={i} cx={xPos(i)} cy={yPos(p.peso)}
          r={p === last ? 5 : 3.5}
          fill={p === last ? 'var(--color-primary-dark)' : 'white'}
          stroke={p === last ? 'var(--color-accent)' : 'var(--color-primary)'}
          strokeWidth="2" />
      ))}

      {/* X-axis labels */}
      {labelIdxs.map((i) => {
        const parts = pesos[i].fecha.split('-');
        return (
          <text key={i} x={xPos(i)} y={H - 5} fontSize="7"
            fill="var(--color-text-muted)" textAnchor="middle">
            {`${parts[2]}/${parts[1]}`}
          </text>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/svg/AnimalWeightChart.tsx
git commit -m "feat(pesos): add AnimalWeightChart SVG component"
```

---

## Task 4: Create AnimalPesoModal

**Files:**
- Create: `src/components/AnimalPesoModal.tsx`
- Create: `src/components/AnimalPesoModal.css`

- [ ] **Step 1: Create AnimalPesoModal.css**

Create `src/components/AnimalPesoModal.css`:

```css
/* ─── AnimalPesoModal ──────────────────────────────────────────────────────── */
.animal-peso-modal .modal-body {
  padding: 0 1rem 1.5rem;
}

/* Stat cards row */
.peso-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.peso-stat-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.5rem 0.4rem;
  text-align: center;
}
.peso-stat-value {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1.2;
}
.peso-stat-value.positive { color: var(--color-success); }
.peso-stat-value.negative { color: var(--color-danger); }
.peso-stat-label {
  font-size: 0.62rem;
  color: var(--color-text-muted);
  margin-top: 0.15rem;
}

/* Chart container */
.animal-chart-wrap {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.6rem 0.6rem 0.3rem;
  margin-bottom: 1rem;
}
.animal-chart-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.4rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.animal-chart-count {
  font-size: 0.65rem;
  color: var(--color-text-muted);
  font-weight: 400;
}

/* Empty chart state */
.chart-empty-msg {
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.82rem;
  padding: 1.5rem 0;
}

/* Historial table */
.peso-historial-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.4rem;
}
.peso-historial-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}
.peso-historial-table th {
  text-align: left;
  font-size: 0.65rem;
  color: var(--color-text-muted);
  font-weight: 600;
  padding: 0.3rem 0.5rem;
  border-bottom: 1px solid var(--color-border);
}
.peso-historial-table td {
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid var(--color-bg);
  color: var(--color-text);
}
.peso-historial-table tr:last-child td { border-bottom: none; }
.peso-historial-table .peso-delta-pos { color: var(--color-success); font-weight: 600; }
.peso-historial-table .peso-delta-neg { color: var(--color-danger); font-weight: 600; }

/* Registrar peso button */
.peso-modal-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}

/* Single-peso empty state */
.peso-primer-estado {
  text-align: center;
  padding: 1.5rem 0;
}
.peso-primer-estado p {
  color: var(--color-text-muted);
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

@media (max-width: 640px) {
  .peso-stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

- [ ] **Step 2: Create AnimalPesoModal.tsx**

Create `src/components/AnimalPesoModal.tsx`:

```typescript
import { useState } from 'react';
import { Animal, Lote } from '@/types';
import { usePesos } from '@/hooks/usePesos';
import { formatKg, formatFecha } from '@/utils/calculadora';
import AnimalWeightChart from '@/components/svg/AnimalWeightChart';
import RegistrarPesoModal from '@/components/RegistrarPesoModal';
import './AnimalPesoModal.css';

interface Props {
  animal: Animal;
  lote: Lote;
  onClose: () => void;
}

export default function AnimalPesoModal({ animal, lote, onClose }: Props) {
  const { pesos, loading } = usePesos(animal.id);
  const [showRegistrar, setShowRegistrar] = useState(false);

  // pesos from hook come desc — reverse for chart (needs asc)
  const pesosAsc = [...pesos].reverse();

  // ── Stat calculations ──────────────────────────────────────────────────────
  const pesoActual = animal.pesoActual;
  const pesoInicial = animal.pesoInicial;
  const kgGanados = pesoActual - pesoInicial;

  const kgPorDia = (() => {
    if (pesosAsc.length < 2) return null;
    const first = pesosAsc[0];
    const last = pesosAsc[pesosAsc.length - 1];
    const dias = Math.max(
      1,
      Math.round(
        (new Date(last.fecha).getTime() - new Date(first.fecha).getTime()) /
          86_400_000
      )
    );
    return (last.peso - first.peso) / dias;
  })();

  // Lote average: use pesoPromedio from lote counters if available,
  // otherwise fall back to the animal's own pesoActual (no reference line shown)
  const pesoPromedioLote = lote.animalesActivos > 0
    ? (lote.totalInvertido > 0 ? pesoActual : pesoActual) // placeholder — use animal.pesoActual if lote has no avg
    : pesoActual;
  // NOTE: lote.pesoPromedio doesn't exist in the current schema.
  // We'll compute it from the animales list passed from the parent.
  // For now, use pesoActual as a fallback so the reference line is visible.
  // Task 5 (PesosTab) will pass a computed pesoPromedioLote prop.

  const vsPromedio = pesoActual - pesoPromedioLote;

  // ── Historial rows ─────────────────────────────────────────────────────────
  // Show newest first (pesos comes desc from hook)
  const historial = pesos.map((p, i) => {
    const prev = pesos[i + 1]; // next in desc = previous in time
    const delta = prev ? p.peso - prev.peso : null;
    return { ...p, delta };
  });

  if (showRegistrar) {
    return (
      <RegistrarPesoModal
        fincaId={lote.fincaId}
        animal={animal}
        loteId={lote.id}
        onClose={() => setShowRegistrar(false)}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal bottom-sheet animal-peso-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1rem' }}>
              {animal.numeroArete} — {animal.raza}
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
              Lote {lote.nombreLote}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-container" style={{ minHeight: '120px' }}>
              <div className="loading-spinner" />
            </div>
          ) : pesos.length === 0 ? (
            /* ── No pesajes yet ── */
            <div className="peso-primer-estado">
              <p>Este animal aún no tiene pesajes registrados.</p>
              <button className="btn btn-primary" onClick={() => setShowRegistrar(true)}>
                + Registrar primer peso
              </button>
            </div>
          ) : (
            <>
              {/* ── Stat cards ── */}
              <div className="peso-stat-grid">
                <div className="peso-stat-card">
                  <div className="peso-stat-value">{formatKg(pesoActual)}</div>
                  <div className="peso-stat-label">Peso actual</div>
                </div>
                <div className="peso-stat-card">
                  <div className={`peso-stat-value ${kgGanados >= 0 ? 'positive' : 'negative'}`}>
                    {kgGanados >= 0 ? '+' : ''}{formatKg(kgGanados)}
                  </div>
                  <div className="peso-stat-label">Total ganado</div>
                </div>
                {kgPorDia !== null && (
                  <div className="peso-stat-card">
                    <div className="peso-stat-value">{kgPorDia.toFixed(2)}</div>
                    <div className="peso-stat-label">kg/día</div>
                  </div>
                )}
                <div className="peso-stat-card">
                  <div className={`peso-stat-value ${vsPromedio >= 0 ? 'positive' : 'negative'}`}>
                    {vsPromedio >= 0 ? '+' : ''}{formatKg(vsPromedio)}
                  </div>
                  <div className="peso-stat-label">vs. prom. lote</div>
                </div>
              </div>

              {/* ── Chart ── */}
              <div className="animal-chart-wrap">
                <div className="animal-chart-title">
                  Evolución de peso
                  <span className="animal-chart-count">{pesos.length} pesaje{pesos.length !== 1 ? 's' : ''}</span>
                </div>
                <AnimalWeightChart
                  pesos={pesosAsc}
                  pesoPromedioLote={pesoPromedioLote}
                />
              </div>

              {/* ── Historial ── */}
              <p className="peso-historial-title">Historial</p>
              <table className="peso-historial-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Peso</th>
                    <th>Delta</th>
                    {historial.some((h) => h.notas) && <th>Notas</th>}
                  </tr>
                </thead>
                <tbody>
                  {historial.map((h) => (
                    <tr key={h.id}>
                      <td>{formatFecha(h.fecha)}</td>
                      <td><strong>{formatKg(h.peso)}</strong></td>
                      <td>
                        {h.delta !== null ? (
                          <span className={h.delta >= 0 ? 'peso-delta-pos' : 'peso-delta-neg'}>
                            {h.delta >= 0 ? '+' : ''}{formatKg(h.delta)}
                          </span>
                        ) : '—'}
                      </td>
                      {historial.some((hh) => hh.notas) && (
                        <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {h.notas || '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* ── Registrar peso button ── */}
              {animal.estado === 'activo' && (
                <div className="peso-modal-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => setShowRegistrar(true)}>
                    + Registrar peso
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/AnimalPesoModal.tsx src/components/AnimalPesoModal.css
git commit -m "feat(pesos): add AnimalPesoModal with chart and historial"
```

---

## Task 5: Create PesosTab

**Files:**
- Create: `src/components/PesosTab.tsx`
- Create: `src/components/PesosTab.css`

- [ ] **Step 1: Create PesosTab.css**

Create `src/components/PesosTab.css`:

```css
/* ─── PesosTab ─────────────────────────────────────────────────────────────── */

/* Alert banner */
.pesos-alert-banner {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--color-danger-light);
  border: 1px solid #fca5a5;
  border-radius: var(--radius-sm);
  padding: 0.6rem 0.8rem;
  margin-bottom: 1rem;
}
.pesos-alert-icon { font-size: 1.1rem; flex-shrink: 0; }
.pesos-alert-text { font-size: 0.82rem; font-weight: 600; color: var(--color-danger); }
.pesos-alert-sub  { font-size: 0.72rem; color: #991b1b; margin-top: 0.1rem; }

/* Avg chart card */
.pesos-avg-card {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.75rem;
  margin-bottom: 1rem;
  box-shadow: var(--shadow);
}
.pesos-avg-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.pesos-avg-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-text);
}
.pesos-avg-badge {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--color-success);
  background: var(--color-success-light);
  padding: 0.15rem 0.5rem;
  border-radius: 99px;
}

/* Semáforo list */
.pesos-section-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin-bottom: 0.4rem;
}
.pesos-animal-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: white;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
}
.pesos-animal-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--color-bg);
  cursor: pointer;
  transition: background 0.12s;
}
.pesos-animal-row:last-child { border-bottom: none; }
.pesos-animal-row:hover { background: var(--color-bg); }
.pesos-animal-row.row-red  { background: #fff5f5; }
.pesos-animal-row.row-red:hover  { background: #fee2e2; }
.pesos-semaforo { font-size: 1rem; flex-shrink: 0; }
.pesos-animal-info { flex: 1; min-width: 0; }
.pesos-animal-nombre {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pesos-animal-dias {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}
.pesos-animal-dias.dias-red   { color: var(--color-danger); font-weight: 600; }
.pesos-animal-dias.dias-yellow { color: var(--color-warning); }
.pesos-animal-peso {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-primary);
  flex-shrink: 0;
}
.pesos-animal-arrow {
  font-size: 0.75rem;
  color: var(--color-border);
  flex-shrink: 0;
}

/* Empty state */
.pesos-empty {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--color-text-muted);
}
```

- [ ] **Step 2: Create PesosTab.tsx**

Create `src/components/PesosTab.tsx`:

```typescript
import { useMemo, useState } from 'react';
import { Animal, Finca, Lote, Peso } from '@/types';
import { formatKg, formatFecha } from '@/utils/calculadora';
import { usePesosLote } from '@/hooks/usePesosLote';
import LoteAvgChart, { calcularLoteAvgData } from '@/components/svg/LoteAvgChart';
import AnimalPesoModal from '@/components/AnimalPesoModal';
import './PesosTab.css';

const DEFAULT_UMBRAL_AMARILLO = 15;
const DEFAULT_UMBRAL_ROJO = 30;

type SemaforoStatus = '🔴' | '🟡' | '🟢' | '⚪';

interface AnimalConSemaforo {
  animal: Animal;
  status: SemaforoStatus;
  diasSinPesar: number | null;
  ultimoPeso: Peso | null;
}

function getSemaforoStatus(
  diasSinPesar: number | null,
  amarillo: number,
  rojo: number
): SemaforoStatus {
  if (diasSinPesar === null) return '⚪';
  if (diasSinPesar > rojo) return '🔴';
  if (diasSinPesar > amarillo) return '🟡';
  return '🟢';
}

const STATUS_ORDER: Record<SemaforoStatus, number> = {
  '🔴': 0, '⚪': 1, '🟡': 2, '🟢': 3,
};

interface Props {
  lote: Lote;
  animales: Animal[];
  finca: Finca;
}

export default function PesosTab({ lote, animales, finca }: Props) {
  const { pesos, loading } = usePesosLote(lote.id);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);

  const umbralAmarillo = finca.pesoUmbralAmarillo ?? DEFAULT_UMBRAL_AMARILLO;
  const umbralRojo = finca.pesoUmbralRojo ?? DEFAULT_UMBRAL_ROJO;

  // ── Latest peso per animal ─────────────────────────────────────────────────
  const ultimoPorAnimal = useMemo(() => {
    const map = new Map<string, Peso>();
    // pesos come desc → first one per animalId is the latest
    for (const p of pesos) {
      if (!map.has(p.animalId)) map.set(p.animalId, p);
    }
    return map;
  }, [pesos]);

  // ── Semáforo list ──────────────────────────────────────────────────────────
  const animalesConSemaforo: AnimalConSemaforo[] = useMemo(() => {
    const hoy = Date.now();
    return animales
      .filter((a) => a.estado === 'activo')
      .map((animal) => {
        const ultimoPeso = ultimoPorAnimal.get(animal.id) ?? null;
        const diasSinPesar = ultimoPeso
          ? Math.floor((hoy - new Date(ultimoPeso.fecha).getTime()) / 86_400_000)
          : null;
        const status = getSemaforoStatus(diasSinPesar, umbralAmarillo, umbralRojo);
        return { animal, status, diasSinPesar, ultimoPeso };
      })
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  }, [animales, ultimoPorAnimal, umbralAmarillo, umbralRojo]);

  // ── Lote average chart data ────────────────────────────────────────────────
  const avgData = useMemo(() => calcularLoteAvgData(pesos), [pesos]);

  // ── Computed lote average (for passing to AnimalPesoModal) ────────────────
  const pesoPromedioLote = useMemo(() => {
    const activos = animales.filter((a) => a.estado === 'activo');
    if (activos.length === 0) return 0;
    return activos.reduce((s, a) => s + a.pesoActual, 0) / activos.length;
  }, [animales]);

  // ── Alert counts ───────────────────────────────────────────────────────────
  const countRojo = animalesConSemaforo.filter((a) => a.status === '🔴').length;

  const animalesActivos = animales.filter((a) => a.estado === 'activo');

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (animalesActivos.length === 0) {
    return (
      <div className="pesos-empty">
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚖️</div>
        <p>No hay animales activos en este lote.</p>
      </div>
    );
  }

  return (
    <>
      <div className="tab-content page-content">
        {/* ── Alert banner ── */}
        {countRojo > 0 && (
          <div className="pesos-alert-banner">
            <span className="pesos-alert-icon">🔴</span>
            <div>
              <div className="pesos-alert-text">
                {countRojo} animal{countRojo !== 1 ? 'es' : ''} sin pesar en más de {umbralRojo} días
              </div>
              <div className="pesos-alert-sub">Tocá el animal para registrar un pesaje</div>
            </div>
          </div>
        )}

        {/* ── Lote avg chart ── */}
        <div className="pesos-avg-card">
          <div className="pesos-avg-header">
            <span className="pesos-avg-title">Promedio del lote</span>
            {avgData.length >= 2 && (
              <span className="pesos-avg-badge">
                {avgData[avgData.length - 1].promedio > avgData[0].promedio ? '↑' : '↓'}
                {' '}{formatKg(Math.abs(avgData[avgData.length - 1].promedio - avgData[0].promedio))} total
              </span>
            )}
          </div>
          <LoteAvgChart data={avgData} />
        </div>

        {/* ── Semáforo list ── */}
        <p className="pesos-section-label">
          Estado de pesaje — {animalesActivos.length} animales activos
        </p>
        <div className="pesos-animal-list">
          {animalesConSemaforo.map(({ animal, status, diasSinPesar, ultimoPeso }) => (
            <div
              key={animal.id}
              className={`pesos-animal-row${status === '🔴' ? ' row-red' : ''}`}
              onClick={() => setSelectedAnimal(animal)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedAnimal(animal)}
            >
              <span className="pesos-semaforo">{status}</span>
              <div className="pesos-animal-info">
                <div className="pesos-animal-nombre">
                  {animal.numeroArete} — {animal.raza}
                </div>
                <div className={`pesos-animal-dias${status === '🔴' ? ' dias-red' : status === '🟡' ? ' dias-yellow' : ''}`}>
                  {diasSinPesar === null
                    ? 'Sin pesajes'
                    : diasSinPesar === 0
                    ? 'Pesado hoy'
                    : `Hace ${diasSinPesar} día${diasSinPesar !== 1 ? 's' : ''}`
                  }
                  {ultimoPeso && ` · ${formatFecha(ultimoPeso.fecha)}`}
                </div>
              </div>
              <span className="pesos-animal-peso">{formatKg(animal.pesoActual)}</span>
              <span className="pesos-animal-arrow">›</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Animal detail modal ── */}
      {selectedAnimal && (
        <AnimalPesoModal
          animal={selectedAnimal}
          lote={lote}
          pesoPromedioLote={pesoPromedioLote}
          onClose={() => setSelectedAnimal(null)}
        />
      )}
    </>
  );
}
```

> ⚠️ **Note:** The `AnimalPesoModal` prop list will need to be updated in Task 4's code. The component receives `pesoPromedioLote` as a separate prop rather than computing it inside the modal. Update `AnimalPesoModal.tsx` to accept `pesoPromedioLote: number` as a prop and remove the internal computation. See the fix in Step 3 below.

- [ ] **Step 3: Update AnimalPesoModal to accept pesoPromedioLote as prop**

Edit `src/components/AnimalPesoModal.tsx`. Replace the interface and the `pesoPromedioLote` computation:

```typescript
// Change the Props interface:
interface Props {
  animal: Animal;
  lote: Lote;
  pesoPromedioLote: number;  // ← add this
  onClose: () => void;
}

// Change the function signature:
export default function AnimalPesoModal({ animal, lote, pesoPromedioLote, onClose }: Props) {
```

Then remove these lines from inside the component body (they are no longer needed):

```typescript
// DELETE these lines:
const pesoPromedioLote = lote.animalesActivos > 0
  ? (lote.totalInvertido > 0 ? pesoActual : pesoActual)
  : pesoActual;
// NOTE: lote.pesoPromedio doesn't exist...
```

- [ ] **Step 4: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/PesosTab.tsx src/components/PesosTab.css src/components/AnimalPesoModal.tsx
git commit -m "feat(pesos): add PesosTab with semáforo alerting and lote avg chart"
```

---

## Task 6: Wire Pesos tab into LoteDetalle

**Files:**
- Modify: `src/pages/LoteDetalle.tsx`
- Modify: `src/pages/LoteDetalle.css`

- [ ] **Step 1: Update Tab type in LoteDetalle.tsx**

In `src/pages/LoteDetalle.tsx`, change line 16:

```typescript
// Before:
type Tab = 'animales' | 'gastos' | 'ventas';

// After:
type Tab = 'animales' | 'gastos' | 'ventas' | 'pesos';
```

- [ ] **Step 2: Add useFinca import and PesosTab import**

Add to the import block at the top of `LoteDetalle.tsx`:

```typescript
import { useFinca } from '@/contexts/FincaContext';
import PesosTab from '@/components/PesosTab';
```

- [ ] **Step 3: Get fincaActiva inside the component**

After `const navigate = useNavigate();` add:

```typescript
const { fincaActiva } = useFinca();
```

- [ ] **Step 4: Add Pesos tab button to the tabs row**

In `LoteDetalle.tsx`, find the tabs mapping (around line 141):

```tsx
{(['animales', 'gastos', 'ventas'] as Tab[]).map((t) => (
```

Replace with:

```tsx
{(['animales', 'gastos', 'ventas', 'pesos'] as Tab[]).map((t) => (
  <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setFilterText(''); }}>
    {t === 'animales' && `🐄 Animales (${animales.length})`}
    {t === 'gastos' && `💸 Gastos (${gastos.length})`}
    {t === 'ventas' && `💰 Ventas (${ventas.length})`}
    {t === 'pesos' && `⚖️ Pesos`}
  </button>
))}
```

- [ ] **Step 5: Add Pesos tab content**

After the closing `)}` of the `tab === 'ventas'` block (before the closing `</div>` of `.tab-content`), add:

```tsx
{/* ── Tab Pesos ── */}
{tab === 'pesos' && fincaActiva && (
  <PesosTab
    lote={lote}
    animales={animales}
    finca={fincaActiva}
  />
)}
```

- [ ] **Step 6: Fix tab overflow on mobile**

In `src/pages/LoteDetalle.css`, find the `.tabs` rule and add `overflow-x: auto`:

```css
.tabs {
  display: flex; gap: 0;
  border-bottom: 2px solid var(--color-border);
  background: var(--color-surface);
  padding: 0 1rem;
  overflow-x: auto;          /* ← add this */
  -webkit-overflow-scrolling: touch; /* ← and this */
}
```

Also add to prevent tab label wrapping:

```css
.tab-btn {
  /* existing styles... */
  white-space: nowrap; /* already exists, verify it's there */
}
```

- [ ] **Step 7: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Verify in browser**

```bash
npm run dev
```

Navigate to any lote. Verify the "⚖️ Pesos" tab appears and clicking it shows the PesosTab. Check the semáforo list renders. Click any animal and verify the `AnimalPesoModal` opens with stat cards and chart.

- [ ] **Step 9: Commit**

```bash
git add src/pages/LoteDetalle.tsx src/pages/LoteDetalle.css
git commit -m "feat(pesos): wire Pesos tab into LoteDetalle"
```

---

## Task 7: Add threshold configuration to FincaSelector

**Files:**
- Modify: `src/hooks/useFincas.ts`
- Modify: `src/components/FincaSelector.tsx`

- [ ] **Step 1: Add actualizarUmbrales to useActualizarFinca in useFincas.ts**

In `src/hooks/useFincas.ts`, find `useActualizarFinca` (around line 117) and extend it:

```typescript
export function useActualizarFinca() {
  const { user } = useAuth();

  async function actualizarFinca(fincaId: string, nombre: string) {
    if (!user) throw new Error('No autenticado');
    await updateDoc(doc(db, 'fincas', fincaId), {
      nombre: nombre.trim(),
      updatedAt: new Date().toISOString(),
    });
  }

  async function actualizarUmbrales(
    fincaId: string,
    pesoUmbralAmarillo: number,
    pesoUmbralRojo: number
  ) {
    if (!user) throw new Error('No autenticado');
    await updateDoc(doc(db, 'fincas', fincaId), {
      pesoUmbralAmarillo,
      pesoUmbralRojo,
      updatedAt: new Date().toISOString(),
    });
  }

  return { actualizarFinca, actualizarUmbrales };
}
```

- [ ] **Step 2: Add threshold config UI to FincaSelector**

In `src/components/FincaSelector.tsx`, add the following imports:

```typescript
import { useActualizarFinca } from '@/hooks/useFincas';
```

(Note: `useCrearFinca` is already imported; add `useActualizarFinca` alongside it.)

- [ ] **Step 3: Add state for threshold editing**

Inside `FincaSelector`, after the existing state declarations, add:

```typescript
const { actualizarUmbrales } = useActualizarFinca();
const [showAjustes, setShowAjustes] = useState(false);
const [umbralAmarillo, setUmbralAmarillo] = useState<number>(
  fincaActiva?.pesoUmbralAmarillo ?? 15
);
const [umbralRojo, setUmbralRojo] = useState<number>(
  fincaActiva?.pesoUmbralRojo ?? 30
);
const [savingUmbrales, setSavingUmbrales] = useState(false);
const [umbralError, setUmbralError] = useState('');
```

- [ ] **Step 4: Add save function**

Inside `FincaSelector`, after `handleCrearFinca`, add:

```typescript
async function handleGuardarUmbrales(e: React.FormEvent) {
  e.preventDefault();
  if (umbralAmarillo <= 0 || umbralRojo <= umbralAmarillo) {
    setUmbralError('El umbral rojo debe ser mayor que el amarillo, y ambos deben ser > 0');
    return;
  }
  setUmbralError('');
  setSavingUmbrales(true);
  try {
    await actualizarUmbrales(fincaActiva!.id, umbralAmarillo, umbralRojo);
    setShowAjustes(false);
  } catch (err) {
    setUmbralError(err instanceof Error ? err.message : 'Error al guardar');
  } finally {
    setSavingUmbrales(false);
  }
}
```

- [ ] **Step 5: Add ⚙️ button and modal to FincaSelector JSX**

In the returned JSX, after the chip button (before the closing `</div>` of `.finca-selector`), add the settings button:

```tsx
{/* Ajustes button — only visible when dropdown is closed */}
{!open && (
  <button
    className="finca-ajustes-btn"
    title="Ajustes de la finca"
    onClick={() => {
      setUmbralAmarillo(fincaActiva?.pesoUmbralAmarillo ?? 15);
      setUmbralRojo(fincaActiva?.pesoUmbralRojo ?? 30);
      setShowAjustes(true);
    }}
    style={{
      background: 'none', border: 'none', cursor: 'pointer',
      fontSize: '0.9rem', padding: '0.2rem 0.35rem',
      color: 'var(--color-text-muted)',
      borderRadius: 'var(--radius-sm)',
    }}
  >
    ⚙️
  </button>
)}
```

And add the modal for threshold editing (after `{showNueva && ...}`):

```tsx
{showAjustes && (
  <div className="modal-overlay" onClick={() => setShowAjustes(false)}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>Ajustes de pesaje — {fincaActiva!.nombre}</h2>
        <button className="modal-close" onClick={() => setShowAjustes(false)}>×</button>
      </div>
      <form onSubmit={handleGuardarUmbrales}>
        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Configurá cuántos días sin pesar activan cada alerta en la tab Pesos.
        </p>
        <div className="form-group">
          <label className="form-label">
            🟡 Días sin pesar → amarillo
          </label>
          <input
            type="number"
            className="input"
            min={1}
            max={365}
            value={umbralAmarillo}
            onChange={(e) => setUmbralAmarillo(Number(e.target.value))}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">
            🔴 Días sin pesar → rojo
          </label>
          <input
            type="number"
            className="input"
            min={1}
            max={365}
            value={umbralRojo}
            onChange={(e) => setUmbralRojo(Number(e.target.value))}
            required
          />
        </div>
        {umbralError && <p className="form-error">{umbralError}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setShowAjustes(false)}>
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={savingUmbrales}
          >
            {savingUmbrales ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
```

- [ ] **Step 6: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Verify in browser**

```bash
npm run dev
```

Verify:
- The ⚙️ button appears next to the finca name chip in the nav
- Clicking it opens the threshold modal with two number inputs
- Changing values and saving updates the thresholds (visible in Firestore console)
- The semáforo in PesosTab responds to the new thresholds

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useFincas.ts src/components/FincaSelector.tsx
git commit -m "feat(pesos): add configurable semáforo thresholds in FincaSelector"
```

---

## Task 8: Playwright E2E test

**Files:**
- Create: `tests/responsive/pesos.spec.ts`

- [ ] **Step 1: Write the test**

Create `tests/responsive/pesos.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { loginAsTestUser, navegarALote } from './helpers';

/**
 * End-to-end tests for the Pesos tab feature.
 * Requires at least one lote with at least one animal in the test account.
 * The seed data creates lotes with animals — use those.
 */

test.describe('Tab Pesos', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await navegarALote(page); // navigates to the first lote
  });

  test('Pesos tab appears and is clickable', async ({ page }) => {
    // The Pesos tab button should be visible
    const pesosTab = page.getByRole('button', { name: /Pesos/i });
    await expect(pesosTab).toBeVisible();

    // Click it
    await pesosTab.click();

    // Verify the semáforo list appears (look for an element with a semáforo emoji)
    // The list contains rows with status emojis
    await expect(page.locator('.pesos-animal-list')).toBeVisible();
  });

  test('semáforo list shows animal rows', async ({ page }) => {
    await page.getByRole('button', { name: /Pesos/i }).click();
    await page.waitForSelector('.pesos-animal-list', { timeout: 5000 });

    // At least one animal row should appear
    const rows = page.locator('.pesos-animal-row');
    await expect(rows.first()).toBeVisible();

    // Each row has a peso value (formatKg produces "X kg")
    await expect(rows.first().locator('.pesos-animal-peso')).toContainText('kg');
  });

  test('clicking an animal row opens AnimalPesoModal', async ({ page }) => {
    await page.getByRole('button', { name: /Pesos/i }).click();
    await page.waitForSelector('.pesos-animal-row', { timeout: 5000 });

    // Click the first animal
    await page.locator('.pesos-animal-row').first().click();

    // The modal should open
    await expect(page.locator('.animal-peso-modal')).toBeVisible();

    // Modal header should contain the arete number
    await expect(page.locator('.animal-peso-modal .modal-header h2')).toBeVisible();
  });

  test('AnimalPesoModal shows stat cards', async ({ page }) => {
    await page.getByRole('button', { name: /Pesos/i }).click();
    await page.waitForSelector('.pesos-animal-row', { timeout: 5000 });
    await page.locator('.pesos-animal-row').first().click();
    await page.waitForSelector('.animal-peso-modal', { timeout: 3000 });

    // Stat cards appear (either pesos exist or the empty state)
    const hasStats = await page.locator('.peso-stat-grid').isVisible().catch(() => false);
    const hasEmpty = await page.locator('.peso-primer-estado').isVisible().catch(() => false);

    expect(hasStats || hasEmpty).toBe(true);
  });

  test('AnimalPesoModal can be closed', async ({ page }) => {
    await page.getByRole('button', { name: /Pesos/i }).click();
    await page.waitForSelector('.pesos-animal-row', { timeout: 5000 });
    await page.locator('.pesos-animal-row').first().click();
    await page.waitForSelector('.animal-peso-modal', { timeout: 3000 });

    // Close via × button
    await page.locator('.animal-peso-modal .modal-close').click();
    await expect(page.locator('.animal-peso-modal')).not.toBeVisible();
  });

  test('lote avg chart renders in Pesos tab', async ({ page }) => {
    await page.getByRole('button', { name: /Pesos/i }).click();
    await page.waitForSelector('.pesos-avg-card', { timeout: 5000 });

    // Either a chart or the empty message
    const hasChart = await page.locator('.lote-avg-chart').isVisible().catch(() => false);
    const hasEmptyMsg = await page.locator('.chart-empty-msg').isVisible().catch(() => false);

    expect(hasChart || hasEmptyMsg).toBe(true);
  });
});

test.describe('Threshold configuration', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('⚙️ button opens threshold modal', async ({ page }) => {
    const ajustesBtn = page.locator('button[title="Ajustes de la finca"]');
    await expect(ajustesBtn).toBeVisible();
    await ajustesBtn.click();

    await expect(page.locator('.modal')).toBeVisible();
    await expect(page.getByText(/días sin pesar/i).first()).toBeVisible();
  });

  test('saving thresholds persists to Firestore', async ({ page }) => {
    await page.locator('button[title="Ajustes de la finca"]').click();
    await page.waitForSelector('.modal', { timeout: 3000 });

    // Change amarillo to 10, rojo to 25
    const inputs = page.locator('.modal input[type="number"]');
    await inputs.nth(0).fill('10');
    await inputs.nth(1).fill('25');

    await page.getByRole('button', { name: /Guardar/i }).click();

    // Modal closes after save
    await expect(page.locator('.modal')).not.toBeVisible({ timeout: 5000 });

    // Re-open and verify values persisted
    await page.locator('button[title="Ajustes de la finca"]').click();
    await page.waitForSelector('.modal', { timeout: 3000 });
    await expect(inputs.nth(0)).toHaveValue('10');
    await expect(inputs.nth(1)).toHaveValue('25');

    // Restore defaults
    await inputs.nth(0).fill('15');
    await inputs.nth(1).fill('30');
    await page.getByRole('button', { name: /Guardar/i }).click();
  });
});
```

- [ ] **Step 2: Check that helpers.ts has loginAsTestUser and navegarALote**

Run:

```bash
grep -n "navegarALote\|loginAsTestUser" tests/responsive/helpers.ts
```

If `navegarALote` is missing, add it to `tests/responsive/helpers.ts`:

```typescript
/** Navigates to the first lote shown on the Dashboard. */
export async function navegarALote(page: import('@playwright/test').Page) {
  // Wait for the dashboard to load
  await page.waitForSelector('[data-testid="lote-card"], .lote-card, a[href*="/lote/"]', { timeout: 10000 });
  // Click the first lote link
  await page.locator('a[href*="/lote/"]').first().click();
  await page.waitForURL('**/lote/**');
}
```

- [ ] **Step 3: Run the tests**

```bash
npx playwright test tests/responsive/pesos.spec.ts --reporter=line
```

Expected: all 7 tests pass (or skip gracefully if seed data has no pesos yet — the modal empty state handles that case).

- [ ] **Step 4: Fix any failures**

Common failure modes:
- `pesos-animal-list` not found → verify PesosTab is mounted and `animalesActivos.length > 0`
- Composite index error in console → go to the Firebase Console link in the Firestore error and create the `(loteId, fecha desc)` index for the `pesos` collection
- `navegarALote` times out → seed data might not have lotes; run the seed script

- [ ] **Step 5: Commit**

```bash
git add tests/responsive/pesos.spec.ts tests/responsive/helpers.ts
git commit -m "test(pesos): add Playwright E2E tests for Pesos tab"
```

---

## Self-review checklist (for the implementer)

Before declaring done, verify:

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run dev` — opening a lote shows the ⚖️ Pesos tab
- [ ] The semáforo list shows 🔴🟡🟢 per animal based on days since last peso
- [ ] Clicking an animal row opens the bottom-sheet modal
- [ ] The modal shows the SVG chart (or empty state if no pesos)
- [ ] "Registrar peso" inside the modal opens `RegistrarPesoModal` and saves correctly
- [ ] The ⚙️ button opens the threshold modal; saving updates Firestore
- [ ] Mobile layout: tabs scroll horizontally without wrapping; modal is bottom-sheet
- [ ] All Playwright tests pass
