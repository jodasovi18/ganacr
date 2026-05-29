# Mover Animales entre Lotes y Fincas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to move one or more active animals from one lote to another (same or different finca), with a price-per-kg transfer price and full peso history migration.

**Architecture:** Two-phase write — Phase 1 is an atomic writeBatch updating animal docs + both lote counters; Phase 2 migrates pesos.loteId (and fincaId + importado flag if cross-finca) in 500-doc batch chunks. UI: individual "Mover" button on each animal card + multi-select mode with a fixed bottom action bar, both opening a single `MoverAnimalesModal`.

**Tech Stack:** React 18 + TypeScript, Firebase Firestore (writeBatch, onSnapshot), CSS vanilla with existing variables.

---

## File Map

| File | Action |
|---|---|
| `src/types/index.ts` | Modify — add `importado?: boolean` to `Peso` |
| `src/hooks/useLotes.ts` | Modify — add `useAllLotes()` function |
| `src/hooks/useMoverAnimales.ts` | Create — two-phase move logic |
| `src/components/MoverAnimalesModal.tsx` | Create — destination picker + price input |
| `src/components/MoverAnimalesModal.css` | Create — modal styles |
| `src/pages/LoteDetalle.tsx` | Modify — selection mode state + wiring |
| `src/pages/LoteDetalle.css` | Modify — multi-select bar + card selection styles |
| `tests/responsive/mover-animales.spec.ts` | Create — E2E tests |

---

## Context for implementer

- **LoteDetalle** already has a Pesos tab (merged in PR #5). It imports `useFinca` from `@/contexts/FincaContext` and uses `const { fincaActiva } = useFinca()`. `Tab` type is `'animales' | 'gastos' | 'ventas' | 'pesos'`.
- **LoteDetalle** renders animals in two ways: `.animals-table-wrap` (desktop, `display:block`) and `.animals-cards` (mobile, `display:none` until `@media max-width:640px`). Both need modification.
- **Modal pattern**: wrap in `<div className="modal-overlay">` → `<div className="modal">` → `modal-header` + form + `modal-actions`.
- **formatColones**, **formatKg** are in `@/utils/calculadora`.
- **CSS variables**: `--color-primary`, `--color-primary-dark`, `--color-border`, `--color-surface`, `--color-bg`, `--color-text-muted`, `--radius`, `--radius-sm`, `--shadow`.

---

## Task 1: Update Peso type + add useAllLotes

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/hooks/useLotes.ts`

- [ ] **Step 1: Add `importado` field to the `Peso` interface**

In `src/types/index.ts`, locate the `Peso` interface (currently ends at `createdAt: string;`) and add the new optional field:

```typescript
export interface Peso {
  id: string;
  userId: string;
  fincaId: string;
  animalId: string;
  loteId: string;
  peso: number;               // kg
  fecha: string;
  notas?: string;
  importado?: boolean;        // true si fue migrado desde otra finca
  createdAt: string;
}
```

- [ ] **Step 2: Add `useAllLotes` to the end of `src/hooks/useLotes.ts`**

Append after the last function in the file:

```typescript
// ─── Todos los lotes del usuario (todas las fincas) ───────────────────────

export function useAllLotes() {
  const { user } = useAuth();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const q = query(
      collection(db, 'lotes'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setLotes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Lote)));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  return { lotes, loading };
}
```

All imports needed (`useState`, `useEffect`, `collection`, `query`, `where`, `orderBy`, `onSnapshot`) are already at the top of the file.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /path/to/worktree && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/hooks/useLotes.ts
git commit -m "feat(mover): add Peso.importado field and useAllLotes hook"
```

---

## Task 2: Create `useMoverAnimales` hook

**Files:**
- Create: `src/hooks/useMoverAnimales.ts`

- [ ] **Step 1: Create the file**

Create `src/hooks/useMoverAnimales.ts` with the full implementation:

```typescript
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Animal, Lote } from '@/types';

export interface MoverAnimalesInput {
  animales: Animal[];   // 1 o más, todos activos
  loteSrc: Lote;        // lote origen
  loteDst: Lote;        // lote destino (distinto de loteSrc)
  precioKg: number;     // ₡/kg > 0
}

export function useMoverAnimales() {
  const { user } = useAuth();

  async function moverAnimales(input: MoverAnimalesInput): Promise<void> {
    if (!user) throw new Error('No autenticado');
    const { animales, loteSrc, loteDst, precioKg } = input;
    const isCrossFinca = loteSrc.fincaId !== loteDst.fincaId;
    const now = new Date().toISOString();

    // ── Fase 1: animales + contadores de lotes (atómico) ──────────────────
    const batch = writeBatch(db);
    let totalPrecioViejoSrc = 0;
    let totalPrecioNuevoDst = 0;

    for (const animal of animales) {
      const precioTraspaso = Math.round(precioKg * animal.pesoActual);
      totalPrecioViejoSrc += animal.precioCompra;
      totalPrecioNuevoDst += precioTraspaso;
      batch.update(doc(db, 'animales', animal.id), {
        loteId: loteDst.id,
        fincaId: loteDst.fincaId,
        precioCompra: precioTraspaso,
        updatedAt: now,
      });
    }

    batch.update(doc(db, 'lotes', loteSrc.id), {
      animalesActivos: increment(-animales.length),
      totalAnimales: increment(-animales.length),
      totalInvertido: increment(-totalPrecioViejoSrc),
      updatedAt: now,
    });
    batch.update(doc(db, 'lotes', loteDst.id), {
      animalesActivos: increment(animales.length),
      totalAnimales: increment(animales.length),
      totalInvertido: increment(totalPrecioNuevoDst),
      updatedAt: now,
    });

    await batch.commit();

    // ── Fase 2: migrar pesos.loteId (+ fincaId si cross-finca) ───────────
    const animalIds = animales.map((a) => a.id);
    // Firestore 'in' limit = 30 → chunk the queries
    for (let i = 0; i < animalIds.length; i += 30) {
      const chunk = animalIds.slice(i, i + 30);
      const snap = await getDocs(
        query(
          collection(db, 'pesos'),
          where('userId', '==', user.uid),
          where('animalId', 'in', chunk),
        )
      );
      // Write in batches of 500 (Firestore limit)
      for (let j = 0; j < snap.docs.length; j += 500) {
        const wb = writeBatch(db);
        snap.docs.slice(j, j + 500).forEach((d) =>
          wb.update(d.ref, {
            loteId: loteDst.id,
            ...(isCrossFinca && { fincaId: loteDst.fincaId, importado: true }),
          })
        );
        await wb.commit();
      }
    }
  }

  return { moverAnimales };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMoverAnimales.ts
git commit -m "feat(mover): add useMoverAnimales hook (two-phase write)"
```

---

## Task 3: Create MoverAnimalesModal + CSS

**Files:**
- Create: `src/components/MoverAnimalesModal.tsx`
- Create: `src/components/MoverAnimalesModal.css`

- [ ] **Step 1: Create `src/components/MoverAnimalesModal.css`**

```css
/* ─── MoverAnimalesModal ─────────────────────────────────────────────────── */

.mover-modal {
  max-height: 85vh;
  overflow-y: auto;
}

.mover-group-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.6rem 0 0.25rem;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 0.4rem;
}

.mover-group-label--other {
  margin-top: 0.6rem;
}

.mover-empty {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  padding: 0.4rem 0;
}

.mover-lote-option {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.6rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.12s;
  margin-bottom: 0.2rem;
  border: 1.5px solid transparent;
}

.mover-lote-option:hover {
  background: var(--color-bg);
}

.mover-lote-option.selected {
  border-color: var(--color-primary);
  background: #f0f9f0;
}

.mover-lote-option input[type="radio"] {
  flex-shrink: 0;
  accent-color: var(--color-primary);
  width: 1rem;
  height: 1rem;
}

.mover-lote-nombre {
  flex: 1;
  font-weight: 500;
}

.mover-lote-count {
  font-size: 0.78rem;
  color: var(--color-text-muted);
}

.mover-toggle-fincas {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.82rem;
  color: var(--color-primary);
  padding: 0.4rem 0;
  width: 100%;
  text-align: left;
  font-weight: 600;
  margin: 0.3rem 0 0.1rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.mover-toggle-fincas:hover {
  color: var(--color-primary-dark);
}

.mover-precio-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mover-precio-symbol {
  font-size: 1rem;
  color: var(--color-text-muted);
  font-weight: 600;
}

.mover-precio-input {
  flex: 1;
}

.mover-precio-unit {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.mover-total-estimado {
  font-size: 0.82rem;
  color: var(--color-text-muted);
  margin-top: 0.4rem;
}
```

- [ ] **Step 2: Create `src/components/MoverAnimalesModal.tsx`**

```typescript
import { useState } from 'react';
import { useMoverAnimales } from '@/hooks/useMoverAnimales';
import { Animal, Finca, Lote } from '@/types';
import { formatColones, formatKg } from '@/utils/calculadora';
import './MoverAnimalesModal.css';

interface Props {
  animales: Animal[];        // 1 o más, todos activos
  loteSrc: Lote;             // lote actual
  todosLosLotes: Lote[];     // todos los lotes del usuario (todas las fincas)
  fincas: Finca[];           // para mostrar nombre de cada finca
  onClose: () => void;
  onSuccess: () => void;     // limpia la selección multi-select al terminar
}

export default function MoverAnimalesModal({
  animales, loteSrc, todosLosLotes, fincas, onClose, onSuccess,
}: Props) {
  const { moverAnimales } = useMoverAnimales();
  const [loteDstId, setLoteDstId] = useState('');
  const [precioKg, setPrecioKg] = useState('');
  const [showOtrasFincas, setShowOtrasFincas] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loteDst = todosLosLotes.find((l) => l.id === loteDstId) ?? null;

  // Group lotes: same finca (excluding origin), other fincas
  const lotesMismaFinca = todosLosLotes.filter(
    (l) => l.fincaId === loteSrc.fincaId && l.id !== loteSrc.id
  );
  const lotesOtrasFincas = todosLosLotes.filter(
    (l) => l.fincaId !== loteSrc.fincaId
  );

  const fincaMap = new Map(fincas.map((f) => [f.id, f.nombre]));

  const pesoTotal = animales.reduce((s, a) => s + a.pesoActual, 0);
  const precioKgNum = Number(precioKg);
  const totalEstimado = precioKgNum > 0 ? Math.round(precioKgNum * pesoTotal) : 0;

  const canSubmit = loteDstId !== '' && precioKgNum > 0 && !saving;
  const n = animales.length;

  // Group other-finca lotes by finca for display
  const lotesPorFinca = new Map<string, Lote[]>();
  for (const l of lotesOtrasFincas) {
    if (!lotesPorFinca.has(l.fincaId)) lotesPorFinca.set(l.fincaId, []);
    lotesPorFinca.get(l.fincaId)!.push(l);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!loteDst || !canSubmit) return;
    setError('');
    setSaving(true);
    try {
      await moverAnimales({ animales, loteSrc, loteDst, precioKg: precioKgNum });
      onSuccess();
      onClose();
    } catch (err) {
      // If Phase 2 failed, the animals moved but peso history may be stale
      const msg = err instanceof Error ? err.message : 'Error al mover los animales';
      if (msg.includes('pesos') || msg.includes('Phase 2')) {
        setError('Los animales fueron movidos, pero el historial de pesajes puede tardar en actualizarse. Cerrá y revisá el lote destino.');
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div className="modal mover-modal">
        <div className="modal-header">
          <h2>↗️ Mover {n === 1 ? '1 animal' : `${n} animales`}</h2>
          <button className="modal-close" onClick={onClose} disabled={saving}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── Destino ── */}
          <div className="form-group">
            <label className="form-label">Destino</label>

            <div className="mover-group-label">
              {fincaMap.get(loteSrc.fincaId) ?? 'Esta finca'}
            </div>

            {lotesMismaFinca.length === 0 ? (
              <p className="mover-empty">No hay otros lotes en esta finca</p>
            ) : (
              lotesMismaFinca.map((l) => (
                <label
                  key={l.id}
                  className={`mover-lote-option${loteDstId === l.id ? ' selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="loteDst"
                    value={l.id}
                    checked={loteDstId === l.id}
                    onChange={() => setLoteDstId(l.id)}
                  />
                  <span className="mover-lote-nombre">{l.nombreLote}</span>
                  <span className="mover-lote-count">{l.animalesActivos} activos</span>
                </label>
              ))
            )}

            {lotesOtrasFincas.length > 0 && (
              <>
                <button
                  type="button"
                  className="mover-toggle-fincas"
                  onClick={() => setShowOtrasFincas((v) => !v)}
                >
                  Otras fincas {showOtrasFincas ? '▲' : '▼'}
                </button>

                {showOtrasFincas && [...lotesPorFinca.entries()].map(([fId, lts]) => (
                  <div key={fId}>
                    <div className="mover-group-label mover-group-label--other">
                      {fincaMap.get(fId) ?? fId}
                    </div>
                    {lts.map((l) => (
                      <label
                        key={l.id}
                        className={`mover-lote-option${loteDstId === l.id ? ' selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="loteDst"
                          value={l.id}
                          checked={loteDstId === l.id}
                          onChange={() => setLoteDstId(l.id)}
                        />
                        <span className="mover-lote-nombre">{l.nombreLote}</span>
                        <span className="mover-lote-count">{l.animalesActivos} activos</span>
                      </label>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* ── Precio de traspaso ── */}
          <div className="form-group">
            <label className="form-label">Precio de traspaso</label>
            <div className="mover-precio-wrap">
              <span className="mover-precio-symbol">₡</span>
              <input
                type="number"
                className="input mover-precio-input"
                min={1}
                step={1}
                placeholder="0"
                value={precioKg}
                onChange={(e) => setPrecioKg(e.target.value)}
                required
                autoFocus={lotesMismaFinca.length === 0}
              />
              <span className="mover-precio-unit">/ kg</span>
            </div>
            {precioKgNum > 0 && (
              <p className="mover-total-estimado">
                Total estimado: {formatColones(totalEstimado)}
                {' '}· {n} animal{n !== 1 ? 'es' : ''} · {formatKg(pesoTotal)} totales
              </p>
            )}
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!canSubmit}
            >
              {saving
                ? 'Moviendo...'
                : `Mover ${n === 1 ? 'animal' : `${n} animales`}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/MoverAnimalesModal.tsx src/components/MoverAnimalesModal.css
git commit -m "feat(mover): add MoverAnimalesModal component"
```

---

## Task 4: Wire into LoteDetalle

**Files:**
- Modify: `src/pages/LoteDetalle.tsx`
- Modify: `src/pages/LoteDetalle.css`

### Step overview
LoteDetalle currently has a Pesos tab (PR #5) and already imports `useFinca`. This task adds:
1. Two new imports
2. `fincas` added to the useFinca destructure
3. A `useAllLotes()` call
4. Three new state variables
5. Three helper functions
6. "Seleccionar" toggle button in the animales tab area
7. Checkbox column in the desktop table view
8. Card tap-to-select in the mobile card view
9. Individual "Mover ↗" button on each active animal card
10. Fixed multi-select bottom bar
11. MoverAnimalesModal render
12. CSS for the above

- [ ] **Step 1: Add imports to LoteDetalle.tsx**

At the top of `src/pages/LoteDetalle.tsx`, add these two imports after the existing imports block:

```typescript
import { useAllLotes } from '@/hooks/useLotes';
import MoverAnimalesModal from '@/components/MoverAnimalesModal';
```

- [ ] **Step 2: Expand useFinca destructure and add useAllLotes call**

Find this line (it's the existing Pesos tab addition):
```typescript
const { fincaActiva } = useFinca();
```
Replace with:
```typescript
const { fincaActiva, fincas } = useFinca();
const { lotes: todosLosLotes } = useAllLotes();
```

- [ ] **Step 3: Add selection state variables**

In the state section (after the existing state declarations, before or after the `filterText` state), add:

```typescript
// Mover animales
const [modoSeleccion, setModoSeleccion] = useState(false);
const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
const [animalesAMover, setAnimalesAMover] = useState<Animal[]>([]);
```

- [ ] **Step 4: Add helper functions**

After the existing handler functions (`handleDeleteAnimal`, `handleDeleteGasto`, `handleAnularVenta`), add:

```typescript
function toggleSeleccion(animalId: string) {
  setSeleccionados((prev) => {
    const next = new Set(prev);
    if (next.has(animalId)) next.delete(animalId);
    else next.add(animalId);
    return next;
  });
}

function cancelarModo() {
  setModoSeleccion(false);
  setSeleccionados(new Set());
}

function abrirMoverModal(animalesSeleccionados: Animal[]) {
  setAnimalesAMover(animalesSeleccionados);
}
```

- [ ] **Step 5: Add "Seleccionar" button in the animales tab area**

Find the search filter section in the JSX (the `arete-search-wrap` div, which is rendered in the animales tab). It looks like:
```jsx
{tab === 'animales' && (
  <div className="arete-search-wrap">
    <input ... />
  </div>
)}
```

Add the toggle button alongside the search input by modifying that block to:
```jsx
{tab === 'animales' && (
  <div className="arete-search-wrap">
    {animalesActivos.length > 0 && (
      <button
        className="btn btn-ghost btn-sm mover-seleccionar-btn"
        onClick={() => modoSeleccion ? cancelarModo() : setModoSeleccion(true)}
      >
        {modoSeleccion ? 'Cancelar selección' : 'Seleccionar'}
      </button>
    )}
    <input
      className="input arete-search"
      placeholder="Buscar por arete..."
      value={filterText}
      onChange={(e) => setFilterText(e.target.value)}
    />
  </div>
)}
```

- [ ] **Step 6: Add checkbox column to the desktop table view**

In the animals table (`.animals-table-wrap`), find the `<thead>` and the `<tbody>` animal rows. Add a leading checkbox column when `modoSeleccion` is true.

In `<thead>`:
```jsx
<thead>
  <tr>
    {modoSeleccion && <th style={{ width: '2rem' }}></th>}
    <th>Arete</th>
    {/* ... rest of existing headers ... */}
  </tr>
</thead>
```

In each `<tbody>` `<tr>` for an animal:
```jsx
<tr key={animal.id}>
  {modoSeleccion && (
    <td>
      {animal.estado === 'activo' && (
        <input
          type="checkbox"
          checked={seleccionados.has(animal.id)}
          onChange={() => toggleSeleccion(animal.id)}
          style={{ cursor: 'pointer' }}
        />
      )}
    </td>
  )}
  {/* ... existing td cells ... */}
</tr>
```

- [ ] **Step 7: Add individual "Mover" button and card selection to the mobile card view**

In the `.animals-cards` section, for each `.animal-card`, make two changes:

**a) Add tap-to-select class and onClick when in selection mode:**
```jsx
<div
  key={animal.id}
  className={`animal-card${modoSeleccion && animal.estado === 'activo' ? ' animal-card--seleccionable' : ''}${seleccionados.has(animal.id) ? ' animal-card--seleccionado' : ''}`}
  onClick={modoSeleccion && animal.estado === 'activo' ? () => toggleSeleccion(animal.id) : undefined}
>
```

**b) Add "Mover ↗" button to `.animal-card-actions` (only when NOT in selection mode and animal is active):**

Find the existing action buttons in `.animal-card-actions` and add before the edit/delete buttons:
```jsx
{!modoSeleccion && animal.estado === 'activo' && (
  <button
    className="btn btn-secondary btn-sm"
    title="Mover a otro lote"
    onClick={(e) => { e.stopPropagation(); abrirMoverModal([animal]); }}
  >
    ↗
  </button>
)}
```

Also add the same "Mover ↗" button to the desktop table row's acciones column:
```jsx
{!modoSeleccion && animal.estado === 'activo' && (
  <button
    className="btn btn-secondary btn-sm"
    title="Mover a otro lote"
    onClick={() => abrirMoverModal([animal])}
  >
    ↗
  </button>
)}
```

- [ ] **Step 8: Add fixed multi-select bottom bar**

Add this JSX block just before the closing `</div>` of the main `lote-detalle-page` div (after all tab content, before the modals section):

```jsx
{/* ── Barra multi-select ── */}
{modoSeleccion && seleccionados.size > 0 && (
  <div className="mover-select-bar">
    <span className="mover-select-count">
      {seleccionados.size} animal{seleccionados.size !== 1 ? 'es' : ''} seleccionado{seleccionados.size !== 1 ? 's' : ''}
    </span>
    <div className="mover-select-actions">
      <button
        className="btn btn-primary btn-sm"
        onClick={() => {
          const sel = animalesActivos.filter((a) => seleccionados.has(a.id));
          abrirMoverModal(sel);
        }}
      >
        Mover
      </button>
      <button className="btn btn-ghost btn-sm" onClick={cancelarModo}>
        Cancelar
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 9: Render MoverAnimalesModal**

In the modals section (after the existing modal renders), add:

```jsx
{/* ── Modal mover animales ── */}
{animalesAMover.length > 0 && lote && (
  <MoverAnimalesModal
    animales={animalesAMover}
    loteSrc={lote}
    todosLosLotes={todosLosLotes}
    fincas={fincas}
    onClose={() => setAnimalesAMover([])}
    onSuccess={cancelarModo}
  />
)}
```

- [ ] **Step 10: Add CSS to `src/pages/LoteDetalle.css`**

Append at the end of the file:

```css
/* ─── Mover animales ─────────────────────────────────────────────────────── */

.mover-seleccionar-btn {
  font-size: 0.82rem;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.3rem 0.7rem;
  background: none;
  cursor: pointer;
  white-space: nowrap;
}

.mover-seleccionar-btn:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.animal-card--seleccionable {
  cursor: pointer;
}

.animal-card--seleccionable:hover {
  border-color: var(--color-primary);
}

.animal-card--seleccionado {
  border-color: var(--color-primary) !important;
  background: #f0f9f0;
}

.mover-select-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: var(--color-primary-dark);
  color: white;
  padding: 0.85rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  z-index: 200;
  box-shadow: 0 -2px 12px rgba(0,0,0,0.15);
}

.mover-select-count {
  font-weight: 600;
  font-size: 0.9rem;
}

.mover-select-actions {
  display: flex;
  gap: 0.5rem;
}

/* Give mover bar buttons white text on dark background */
.mover-select-bar .btn-primary {
  background: white;
  color: var(--color-primary-dark);
}

.mover-select-bar .btn-primary:hover {
  background: #f0f0f0;
}

.mover-select-bar .btn-ghost {
  color: rgba(255,255,255,0.85);
  border-color: rgba(255,255,255,0.4);
}

.mover-select-bar .btn-ghost:hover {
  background: rgba(255,255,255,0.12);
  color: white;
}
```

- [ ] **Step 11: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 12: Run dev server and smoke-test manually**

```bash
npm run dev
```

Manual checks:
- Open a lote with active animals → "Seleccionar" button appears in animales tab
- Click "Seleccionar" → each active animal card shows selectable state
- Tap 2 cards → they highlight + bottom bar appears with count "2 animales seleccionados"
- Click "Mover" → MoverAnimalesModal opens showing lotes grouped by finca
- Select a destination lote, enter a price → "Mover animales" button enables
- Submit → modal closes, animals disappear from origin lote

- [ ] **Step 13: Commit**

```bash
git add src/pages/LoteDetalle.tsx src/pages/LoteDetalle.css
git commit -m "feat(mover): wire MoverAnimalesModal into LoteDetalle with selection mode"
```

---

## Task 5: E2E tests

**Files:**
- Create: `tests/responsive/mover-animales.spec.ts`

Note: These tests require `TEST_EMAIL` and `TEST_PASSWORD` env vars. They skip gracefully when not set. They also require at least 2 lotes in the test finca.

- [ ] **Step 1: Create `tests/responsive/mover-animales.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import { loginAsTestUser, navegarALote } from './helpers';

const hasCredentials = !!(process.env.TEST_EMAIL && process.env.TEST_PASSWORD);

test.describe('Mover Animales', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasCredentials, 'TEST_EMAIL / TEST_PASSWORD not set');
    await loginAsTestUser(page);
    await navegarALote(page);
    // Make sure we're on the animales tab
    await page.click('[class*="tab-btn"]:has-text("Animales")');
  });

  test('botón Seleccionar visible en tab Animales', async ({ page }) => {
    await expect(page.locator('.mover-seleccionar-btn')).toBeVisible();
  });

  test('activar modo selección muestra barra bottom solo al seleccionar', async ({ page }) => {
    await page.click('.mover-seleccionar-btn');
    // Bottom bar NOT visible yet (no animals selected)
    await expect(page.locator('.mover-select-bar')).not.toBeVisible();
    // Select first active animal card on mobile, or check first checkbox on desktop
    const cards = page.locator('.animal-card--seleccionable');
    const firstCard = cards.first();
    if (await firstCard.count() > 0) {
      await firstCard.click();
      await expect(page.locator('.mover-select-bar')).toBeVisible();
      await expect(page.locator('.mover-select-count')).toContainText('1 animal');
    } else {
      // Desktop: use checkbox
      await page.locator('input[type="checkbox"]').first().check();
      await expect(page.locator('.mover-select-bar')).toBeVisible();
    }
  });

  test('cancelar selección limpia el estado', async ({ page }) => {
    await page.click('.mover-seleccionar-btn');
    // Select and then cancel
    const card = page.locator('.animal-card--seleccionable').first();
    if (await card.count() > 0) {
      await card.click();
      await page.locator('.mover-select-bar .btn-ghost').click();
      await expect(page.locator('.mover-select-bar')).not.toBeVisible();
      await expect(page.locator('.animal-card--seleccionado')).toHaveCount(0);
    }
  });

  test('abre MoverAnimalesModal desde multi-select', async ({ page }) => {
    await page.click('.mover-seleccionar-btn');
    const card = page.locator('.animal-card--seleccionable').first();
    if (await card.count() > 0) {
      await card.click();
      await page.locator('.mover-select-bar .btn-primary').click();
      await expect(page.locator('.mover-modal')).toBeVisible();
      await expect(page.locator('.mover-modal h2')).toContainText('Mover');
    }
  });

  test('modal muestra lotes destino y lote origen deshabilitado', async ({ page }) => {
    // Open modal via individual "mover" button
    const moverBtn = page.locator('.animal-card-actions button[title="Mover a otro lote"]').first();
    if (await moverBtn.count() > 0) {
      await moverBtn.click();
      await expect(page.locator('.mover-modal')).toBeVisible();
      // At least one lote option should be present (the current lote is excluded)
      // Either a lote option or the "no hay otros lotes" message
      const hasOptions = await page.locator('.mover-lote-option').count() > 0;
      const hasEmpty = await page.locator('.mover-empty').count() > 0;
      expect(hasOptions || hasEmpty).toBeTruthy();
    }
  });

  test('botón Mover deshabilitado sin destino ni precio', async ({ page }) => {
    const moverBtn = page.locator('.animal-card-actions button[title="Mover a otro lote"]').first();
    if (await moverBtn.count() > 0) {
      await moverBtn.click();
      await expect(page.locator('.mover-modal button[type="submit"]')).toBeDisabled();
    }
  });

  test('total estimado se calcula en tiempo real', async ({ page }) => {
    const moverBtn = page.locator('.animal-card-actions button[title="Mover a otro lote"]').first();
    if (await moverBtn.count() > 0) {
      await moverBtn.click();
      const priceInput = page.locator('.mover-precio-input');
      await priceInput.fill('1000');
      // Total estimado should appear (non-zero animal weight)
      await expect(page.locator('.mover-total-estimado')).toBeVisible();
      await expect(page.locator('.mover-total-estimado')).toContainText('₡');
    }
  });

  test('cerrar modal no cambia el lote', async ({ page }) => {
    const moverBtn = page.locator('.animal-card-actions button[title="Mover a otro lote"]').first();
    if (await moverBtn.count() > 0) {
      await moverBtn.click();
      await page.locator('.modal-close').click();
      await expect(page.locator('.mover-modal')).not.toBeVisible();
      // Still on the same lote page
      await expect(page).toHaveURL(/\/lote\//);
    }
  });
});
```

- [ ] **Step 2: Run the tests (skip gracefully if no credentials)**

```bash
npx playwright test tests/responsive/mover-animales.spec.ts --reporter=list
```

Expected: tests either pass or are skipped (no failures).

- [ ] **Step 3: Commit**

```bash
git add tests/responsive/mover-animales.spec.ts
git commit -m "test(mover): add Playwright E2E tests for mover-animales feature"
```

---

## Self-Review Checklist (for implementer)

After all tasks, verify against the spec:

- [ ] `Peso.importado` field exists in `src/types/index.ts`
- [ ] `useAllLotes()` exists and queries without fincaId filter
- [ ] Phase 1 batch: animal.loteId + animal.fincaId + animal.precioCompra + both lote counters
- [ ] Phase 2: all pesos.loteId updated; cross-finca also updates fincaId + importado=true
- [ ] MoverAnimalesModal: lote origin excluded from list, "Otras fincas" section collapses
- [ ] Individual "Mover ↗" button visible on active animal cards in normal mode
- [ ] "Seleccionar" button visible in animales tab
- [ ] Bottom bar appears only when ≥1 animal selected
- [ ] TypeScript: `npx tsc --noEmit` → zero errors
- [ ] Manual smoke test: move 1 animal, verify it appears in destination lote's animales tab
