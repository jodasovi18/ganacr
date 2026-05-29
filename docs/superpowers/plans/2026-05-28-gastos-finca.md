# Gastos a Nivel de Finca — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow the rancher to create a single "finca-level" expense that distributes proportionally across multiple selected lots by active-animal count, stored as one parent doc (`gastosFinca`) + N child docs (`gastos`) in an atomic writeBatch.

**Architecture:** New Firestore collection `gastosFinca` holds the parent doc. Each selected lot gets a normal child `gastos` doc with an extra `gastoFincaId` field linking back to the parent. Dashboard gains two tabs ("Lotes" / "Gastos de Finca"). LoteDetalle shows child gastos with a 📌 chip and hides the individual edit/delete buttons on them.

**Tech Stack:** React 18 + TypeScript + Firestore writeBatch + CSS vanilla. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-28-gastos-finca-design.md`

**Worktree:** `.worktrees/gastos-finca` on branch `feature/gastos-finca`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/types/index.ts` | Modify | Add `GastoFinca` interface + `gastoFincaId?` to `Gasto` |
| `src/hooks/useGastosFinca.ts` | Create | RT listener, `useAgregarGastoFinca`, `useEliminarGastoFinca` |
| `src/components/GastoFincaModal.tsx` | Create | Form: concepto/tipo/monto/fecha + lote selector + live distribution preview |
| `src/components/GastoFincaModal.css` | Create | Styles for the modal |
| `src/components/GastosFincaTab.tsx` | Create | List of finca gastos with delete button |
| `src/pages/Dashboard.tsx` | Modify | Add tabs "Lotes / Gastos de Finca", wire new components and hooks |
| `src/pages/Dashboard.css` | Modify | Tab styles |
| `src/pages/LoteDetalle.tsx` | Modify | 📌 Finca chip on `gastoFincaId` rows; hide ✏️/🗑️ on those rows |
| `src/index.css` | Modify | Add `.badge-finca` badge style |
| `firestore.rules` | Modify | Add rule for `gastosFinca` collection |
| `tests/responsive/gastos-finca.spec.ts` | Create | Playwright E2E: create, verify in tab, verify chip in LoteDetalle, delete |

---

## Task 1: Types — GastoFinca interface + gastoFincaId field

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add `gastoFincaId?` to the `Gasto` interface**

In `src/types/index.ts`, find the `Gasto` interface and add the optional field as the last line before the closing brace:

```typescript
export interface Gasto {
  id: string;
  userId: string;
  fincaId: string;
  loteId: string;
  concepto: string;
  tipo: TipoGasto;
  monto: number;              // ₡
  fecha: string;
  quienPago?: string;
  notas?: string;
  gastoFincaId?: string;      // si existe → vino de distribución de finca
  createdAt: string;
}
```

- [ ] **Step 2: Add `GastoFinca` interface after the `Gasto` interface**

Immediately after the closing `}` of `Gasto`, add:

```typescript
export interface GastoFinca {
  id: string;
  userId: string;
  fincaId: string;
  concepto: string;
  tipo: TipoGasto;
  montoTotal: number;         // ₡ total original sin distribuir
  fecha: string;
  quienPago?: string;
  notas?: string;
  lotesAplicados: Array<{
    loteId: string;
    nombreLote: string;
    animalesActivos: number;  // snapshot al momento de creación
    monto: number;            // fracción asignada
  }>;
  createdAt: string;
}
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

Run from the worktree root (`.worktrees/gastos-finca/`):

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(gastos-finca): add GastoFinca interface and gastoFincaId field to Gasto"
```

---

## Task 2: Hook — useGastosFinca.ts

**Files:**
- Create: `src/hooks/useGastosFinca.ts`

- [ ] **Step 1: Create the file with all three hooks**

Create `src/hooks/useGastosFinca.ts` with this exact content:

```typescript
import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDocs,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { GastoFinca, TipoGasto } from '@/types';

// ─── Helper: distribución proporcional ───────────────────────────────────────

function distribuir(
  montoTotal: number,
  lotes: Array<{ animalesActivos: number }>
): number[] {
  if (lotes.length === 0) return [];
  const totalActivos = lotes.reduce((s, l) => s + l.animalesActivos, 0);
  return lotes.map((l, i) => {
    if (i === lotes.length - 1) {
      // Last lote absorbs rounding remainder
      const sumaAntes = lotes
        .slice(0, -1)
        .reduce((s, l2) => s + Math.round(montoTotal * l2.animalesActivos / totalActivos), 0);
      return montoTotal - sumaAntes;
    }
    return Math.round(montoTotal * l.animalesActivos / totalActivos);
  });
}

// ─── Listener en tiempo real ─────────────────────────────────────────────────

export function useGastosFinca(fincaId: string | null) {
  const { user } = useAuth();
  const [gastosFinca, setGastosFinca] = useState<GastoFinca[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !fincaId) { setLoading(false); return; }
    const q = query(
      collection(db, 'gastosFinca'),
      where('userId', '==', user.uid),
      where('fincaId', '==', fincaId),
      orderBy('fecha', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setGastosFinca(snap.docs.map((d) => ({ id: d.id, ...d.data() } as GastoFinca)));
      setLoading(false);
    });
    return unsub;
  }, [user, fincaId]);

  return { gastosFinca, loading };
}

// ─── Crear gasto de finca ────────────────────────────────────────────────────

interface LoteParaDistribuir {
  loteId: string;
  nombreLote: string;
  animalesActivos: number;
}

interface AgregarGastoFincaInput {
  fincaId: string;
  concepto: string;
  tipo: TipoGasto;
  montoTotal: number;
  fecha: string;
  quienPago?: string;
  notas?: string;
  lotesSeleccionados: LoteParaDistribuir[];
}

export function useAgregarGastoFinca() {
  const { user } = useAuth();

  async function agregarGastoFinca(input: AgregarGastoFincaInput): Promise<void> {
    if (!user) throw new Error('No autenticado');

    const { fincaId, concepto, tipo, montoTotal, fecha, quienPago, notas, lotesSeleccionados } = input;
    const now = new Date().toISOString();

    const montosDistribuidos = distribuir(montoTotal, lotesSeleccionados);

    const lotesAplicados = lotesSeleccionados.map((l, i) => ({
      loteId: l.loteId,
      nombreLote: l.nombreLote,
      animalesActivos: l.animalesActivos,
      monto: montosDistribuidos[i],
    }));

    // Pre-generate parent ref so children can reference it
    const padreRef = doc(collection(db, 'gastosFinca'));

    const batch = writeBatch(db);

    // 1× padre
    batch.set(padreRef, {
      userId: user.uid,
      fincaId,
      concepto,
      tipo,
      montoTotal,
      fecha,
      ...(quienPago?.trim() ? { quienPago: quienPago.trim() } : {}),
      ...(notas?.trim() ? { notas: notas.trim() } : {}),
      lotesAplicados,
      createdAt: now,
    });

    // N× hijo + N× increment lote.totalGastos
    for (let i = 0; i < lotesSeleccionados.length; i++) {
      const lote = lotesSeleccionados[i];
      const monto = montosDistribuidos[i];

      const hijoRef = doc(collection(db, 'gastos'));
      batch.set(hijoRef, {
        userId: user.uid,
        fincaId,
        loteId: lote.loteId,
        concepto,
        tipo,
        monto,
        fecha,
        ...(quienPago?.trim() ? { quienPago: quienPago.trim() } : {}),
        ...(notas?.trim() ? { notas: notas.trim() } : {}),
        gastoFincaId: padreRef.id,
        createdAt: now,
      });

      batch.update(doc(db, 'lotes', lote.loteId), {
        totalGastos: increment(monto),
      });
    }

    await batch.commit();
  }

  return { agregarGastoFinca };
}

// ─── Eliminar gasto de finca ─────────────────────────────────────────────────

export function useEliminarGastoFinca() {
  const { user } = useAuth();

  async function eliminarGastoFinca(
    gastoFincaId: string,
    lotesAplicados: GastoFinca['lotesAplicados']
  ): Promise<void> {
    if (!user) throw new Error('No autenticado');

    // Query child gastos
    const q = query(
      collection(db, 'gastos'),
      where('gastoFincaId', '==', gastoFincaId)
    );
    const snap = await getDocs(q);

    const batch = writeBatch(db);

    // 1× delete padre
    batch.delete(doc(db, 'gastosFinca', gastoFincaId));

    // N× delete hijos
    snap.docs.forEach((d) => batch.delete(d.ref));

    // N× decrement lote.totalGastos (use snapshot from parent doc)
    for (const la of lotesAplicados) {
      batch.update(doc(db, 'lotes', la.loteId), {
        totalGastos: increment(-la.monto),
      });
    }

    await batch.commit();
  }

  return { eliminarGastoFinca };
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useGastosFinca.ts
git commit -m "feat(gastos-finca): add useGastosFinca hook with RT listener, create, and delete"
```

---

## Task 3: Component — GastoFincaModal

**Files:**
- Create: `src/components/GastoFincaModal.tsx`
- Create: `src/components/GastoFincaModal.css`

- [ ] **Step 1: Create `src/components/GastoFincaModal.tsx`**

```tsx
import { useState, FormEvent } from 'react';
import { useAgregarGastoFinca } from '@/hooks/useGastosFinca';
import { formatColones } from '@/utils/calculadora';
import { Lote, TipoGasto } from '@/types';
import './GastoFincaModal.css';

interface Props {
  fincaId: string;
  lotes: Lote[];
  onClose: () => void;
}

const TIPOS: { value: TipoGasto; label: string }[] = [
  { value: 'alimento',    label: '🌾 Alimento' },
  { value: 'veterinario', label: '💉 Veterinario' },
  { value: 'mano_de_obra',label: '👷 Mano de obra' },
  { value: 'transporte',  label: '🚛 Transporte' },
  { value: 'otro',        label: '📋 Otro' },
];

export default function GastoFincaModal({ fincaId, lotes, onClose }: Props) {
  const { agregarGastoFinca } = useAgregarGastoFinca();

  const [concepto, setConcepto]   = useState('');
  const [tipo, setTipo]           = useState<TipoGasto>('otro');
  const [montoRaw, setMontoRaw]   = useState('');
  const [fecha, setFecha]         = useState(new Date().toISOString().split('T')[0]);
  const [quienPago, setQuienPago] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  // Default: lotes propios con activos > 0 → checked; lotes a medias → unchecked
  const [seleccionados, setSeleccionados] = useState<Set<string>>(
    () => new Set(
      lotes
        .filter((l) => l.tipoPropiedad === 'propio' && l.animalesActivos > 0)
        .map((l) => l.id)
    )
  );

  const monto = parseFloat(montoRaw) || 0;
  const lotesEnDistribucion = lotes.filter(
    (l) => seleccionados.has(l.id) && l.animalesActivos > 0
  );
  const totalActivos = lotesEnDistribucion.reduce((s, l) => s + l.animalesActivos, 0);

  function montoPara(lote: Lote): number | null {
    if (monto <= 0 || totalActivos === 0 || !seleccionados.has(lote.id)) return null;
    return Math.round(monto * lote.animalesActivos / totalActivos);
  }

  function toggleLote(loteId: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(loteId)) next.delete(loteId); else next.add(loteId);
      return next;
    });
  }

  const canSubmit = concepto.trim().length > 0 && monto > 0 && lotesEnDistribucion.length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      await agregarGastoFinca({
        fincaId,
        concepto: concepto.trim(),
        tipo,
        montoTotal: monto,
        fecha,
        quienPago: quienPago.trim() || undefined,
        lotesSeleccionados: lotesEnDistribucion.map((l) => ({
          loteId: l.id,
          nombreLote: l.nombreLote,
          animalesActivos: l.animalesActivos,
        })),
      });
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Error al registrar gasto');
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal gasto-finca-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💸 Nuevo gasto de finca</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">

          <div className="form-group">
            <label>Concepto *</label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej: Vacunación masiva"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoGasto)}>
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Monto total (₡) *</label>
              <input
                type="number"
                value={montoRaw}
                onChange={(e) => setMontoRaw(e.target.value)}
                placeholder="0"
                min="1"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Fecha *</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Quién pagó</label>
              <input
                type="text"
                value={quienPago}
                onChange={(e) => setQuienPago(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="lotes-selector-label">Aplicar a lotes</div>
          <div className="lotes-selector">
            {lotes.length === 0 ? (
              <p className="lotes-selector-empty">
                Esta finca no tiene lotes. Creá un lote primero.
              </p>
            ) : (
              lotes.map((lote) => {
                const disabled   = lote.animalesActivos === 0;
                const checked    = seleccionados.has(lote.id);
                const esMedias   = lote.tipoPropiedad === 'medias';
                const estimado   = montoPara(lote);
                return (
                  <label
                    key={lote.id}
                    className={[
                      'lote-selector-item',
                      checked  ? 'selected' : '',
                      disabled ? 'disabled' : '',
                      esMedias ? 'medias'   : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => { if (!disabled) toggleLote(lote.id); }}
                    />
                    <span className="lote-selector-nombre">
                      {esMedias && '🤝 '}
                      {lote.nombreLote}
                      {esMedias && (
                        <span className="lote-selector-medias-hint">
                          {' '}(a medias — seleccioná explícitamente)
                        </span>
                      )}
                    </span>
                    <span className="lote-selector-activos">
                      {disabled ? '0 act.' : `${lote.animalesActivos} act.`}
                    </span>
                    <span className="lote-selector-monto">
                      {disabled || estimado === null
                        ? '—'
                        : `≈ ${formatColones(estimado)}`}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          {lotesEnDistribucion.length > 0 && monto > 0 && (
            <div className="distribucion-resumen">
              Total: <strong>{formatColones(monto)}</strong>
              {' · '}{lotesEnDistribucion.length} lote{lotesEnDistribucion.length !== 1 ? 's' : ''}
              {' · '}{totalActivos} animales activos
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!canSubmit || loading}
            >
              {loading ? 'Registrando...' : 'Registrar gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/GastoFincaModal.css`**

```css
/* ─── GastoFincaModal ─────────────────────────────────────────────────────── */

.gasto-finca-modal {
  max-width: 560px;
  width: 100%;
}

.lotes-selector-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.4rem;
  margin-top: 0.25rem;
}

.lotes-selector {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 0.75rem;
  max-height: 220px;
  overflow-y: auto;
}

.lotes-selector-empty {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  padding: 0.5rem 0;
}

.lote-selector-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.6rem;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  font-size: 0.82rem;
}

.lote-selector-item.selected {
  border-color: var(--color-primary);
  background: var(--color-success-light);
}

.lote-selector-item.medias {
  border-color: var(--color-warning);
  background: var(--color-warning-light);
}

.lote-selector-item.medias.selected {
  border-color: var(--color-warning);
  background: #fef3c7;
}

.lote-selector-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lote-selector-item input[type="checkbox"] {
  accent-color: var(--color-primary);
  flex-shrink: 0;
}

.lote-selector-nombre {
  flex: 1;
  font-weight: 500;
}

.lote-selector-medias-hint {
  font-size: 0.72rem;
  color: var(--color-warning);
  font-weight: 400;
}

.lote-selector-activos {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.lote-selector-monto {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-danger);
  white-space: nowrap;
  min-width: 80px;
  text-align: right;
}

.distribucion-resumen {
  background: var(--color-success-light);
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  color: var(--color-success);
  margin-bottom: 0.75rem;
}

@media (max-width: 640px) {
  .gasto-finca-modal {
    max-width: 100%;
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/GastoFincaModal.tsx src/components/GastoFincaModal.css
git commit -m "feat(gastos-finca): add GastoFincaModal with lote selector and live distribution preview"
```

---

## Task 4: Component — GastosFincaTab

**Files:**
- Create: `src/components/GastosFincaTab.tsx`

- [ ] **Step 1: Create `src/components/GastosFincaTab.tsx`**

```tsx
import { formatColones, formatFecha } from '@/utils/calculadora';
import { GastoFinca } from '@/types';

interface Props {
  gastosFinca: GastoFinca[];
  loading: boolean;
  onNuevo: () => void;
  onEliminar: (gf: GastoFinca) => void;
  deletingId: string | null;
}

export default function GastosFincaTab({
  gastosFinca,
  loading,
  onNuevo,
  onEliminar,
  deletingId,
}: Props) {
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <span>Cargando gastos de finca...</span>
      </div>
    );
  }

  return (
    <div className="gastos-finca-tab">
      <div className="gastos-finca-tab-header">
        <button className="btn btn-primary btn-sm" onClick={onNuevo}>
          + Nuevo gasto
        </button>
      </div>

      {gastosFinca.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">💸</div>
          <h3>Sin gastos de finca registrados</h3>
          <p>Registrá gastos que aplican a múltiples lotes, como vacunaciones masivas o desparasitaciones.</p>
          <button className="btn btn-primary" onClick={onNuevo}>+ Registrar primer gasto</button>
        </div>
      ) : (
        <div className="gastos-finca-list">
          {gastosFinca.map((gf) => (
            <div key={gf.id} className="gasto-finca-card">
              <div className="gasto-finca-card-body">
                <div className="gasto-finca-card-top">
                  <strong className="gasto-finca-concepto">{gf.concepto}</strong>
                  <span className="badge badge-gray">{gf.tipo.replace('_', ' ')}</span>
                </div>
                <div className="gasto-finca-card-meta">
                  <span>{formatFecha(gf.fecha)}</span>
                  <span>·</span>
                  <span>
                    {gf.lotesAplicados.length} lote{gf.lotesAplicados.length !== 1 ? 's' : ''}
                  </span>
                  {gf.quienPago && (
                    <>
                      <span>·</span>
                      <span>{gf.quienPago}</span>
                    </>
                  )}
                </div>
                <div className="gasto-finca-lotes-chips">
                  {gf.lotesAplicados.map((la) => (
                    <span key={la.loteId} className="gasto-finca-lote-chip">
                      {la.nombreLote}: {formatColones(la.monto)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="gasto-finca-card-side">
                <strong className="gasto-finca-total">{formatColones(gf.montoTotal)}</strong>
                <button
                  className="btn btn-ghost btn-sm"
                  title="Eliminar gasto de finca"
                  onClick={() => onEliminar(gf)}
                  disabled={deletingId === gf.id}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/GastosFincaTab.tsx
git commit -m "feat(gastos-finca): add GastosFincaTab list component"
```

---

## Task 5: Dashboard — tabs, hooks, and modals

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/Dashboard.css`

### Dashboard.tsx

- [ ] **Step 1: Add imports**

Read `src/pages/Dashboard.tsx`. At the top, find the existing import block and add these lines after the existing imports and before `import './Dashboard.css'`:

```tsx
import { useGastosFinca, useEliminarGastoFinca } from '@/hooks/useGastosFinca';
import GastoFincaModal from '@/components/GastoFincaModal';
import GastosFincaTab from '@/components/GastosFincaTab';
```

Also update the existing types import line from:
```tsx
import { Lote } from '@/types';
```
to:
```tsx
import { Lote, GastoFinca } from '@/types';
```

- [ ] **Step 2: Add tab type, state, and hooks**

In the `Dashboard()` function body, find the existing state declarations (the block with `showCrear`, `editLote`, etc.) and add these declarations immediately after them:

```tsx
// Gastos de Finca
type DashboardTab = 'lotes' | 'gastosFinca';
const [dashboardTab, setDashboardTab] = useState<DashboardTab>('lotes');
const [showGastoFinca, setShowGastoFinca] = useState(false);
const [deleteGastoFinca, setDeleteGastoFinca] = useState<GastoFinca | null>(null);
const [deletingGastoFincaId, setDeletingGastoFincaId] = useState<string | null>(null);
const { gastosFinca, loading: gastosFincaLoading } = useGastosFinca(fincaActiva?.id ?? null);
const { eliminarGastoFinca } = useEliminarGastoFinca();
```

- [ ] **Step 3: Add delete handler**

After the existing `handleDeleteLote` function, add:

```tsx
async function handleEliminarGastoFinca() {
  if (!deleteGastoFinca) return;
  setDeletingGastoFincaId(deleteGastoFinca.id);
  try {
    await eliminarGastoFinca(deleteGastoFinca.id, deleteGastoFinca.lotesAplicados);
    setDeleteGastoFinca(null);
  } catch (err) {
    console.error('[handleEliminarGastoFinca]', err);
  } finally {
    setDeletingGastoFincaId(null);
  }
}
```

- [ ] **Step 4: Replace the section header + lotes section with tabs**

In the JSX `<main>` section, find the block that starts with the `<div className="flex mb-2"...>` containing `<h2 className="section-title">Mis lotes</h2>` and the `+ Nuevo lote` button, and everything below it up to (but NOT including) the closing `</>` of the `necesitaOnboarding` ternary.

Replace that entire block with:

```tsx
          {/* ── Tabs ── */}
          <div className="dashboard-tabs">
            <button
              className={`dashboard-tab${dashboardTab === 'lotes' ? ' active' : ''}`}
              onClick={() => setDashboardTab('lotes')}
            >
              🐄 Lotes ({lotes.length})
            </button>
            <button
              className={`dashboard-tab${dashboardTab === 'gastosFinca' ? ' active' : ''}`}
              onClick={() => setDashboardTab('gastosFinca')}
            >
              💸 Gastos de Finca ({gastosFinca.length})
            </button>
          </div>

          {/* ── Tab: Lotes ── */}
          {dashboardTab === 'lotes' && (
            <>
              <div className="flex mb-2" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="section-title">Mis lotes</h2>
                <button className="btn btn-primary btn-sm" onClick={() => setShowCrear(true)}>
                  + Nuevo lote
                </button>
              </div>

              {loading ? (
                <div className="loading-container">
                  <div className="loading-spinner" />
                  <span>Cargando...</span>
                </div>
              ) : lotes.length === 0 ? (
                <div className="empty-state">
                  <div className="emoji">🐄</div>
                  <h3>Aún no tenés lotes</h3>
                  <p>Creá tu primer lote para empezar a registrar tu ganado</p>
                  <button className="btn btn-primary" onClick={() => setShowCrear(true)}>Crear primer lote</button>
                </div>
              ) : (
                <div className="lotes-grid">
                  {lotes.map((lote) => (
                    <div
                      key={lote.id}
                      className="lote-card"
                      onClick={() => navigate(`/lote/${lote.id}`)}
                    >
                      <div className="lote-card-header">
                        <h3>{lote.nombreLote}</h3>
                        <div className="flex gap-1" style={{ alignItems: 'center' }}>
                          {lote.tipoPropiedad === 'medias' && lote.socio && (
                            <span className="badge badge-yellow">🤝 {lote.socio.nombre}</span>
                          )}
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Editar lote"
                            onClick={(e) => { e.stopPropagation(); setEditLote(lote); }}
                          >✏️</button>
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Eliminar lote"
                            style={{ color: 'var(--color-danger)' }}
                            onClick={(e) => { e.stopPropagation(); setDeleteLote(lote); }}
                          >🗑️</button>
                        </div>
                      </div>
                      <div className="lote-card-stats">
                        <div>
                          <div className="lote-stat-val">{lote.animalesActivos}</div>
                          <div className="lote-stat-lab">Activos</div>
                        </div>
                        <div>
                          <div className="lote-stat-val">{formatColones(lote.totalInvertido)}</div>
                          <div className="lote-stat-lab">Invertido</div>
                        </div>
                        <div>
                          <div className="lote-stat-val">{formatColones(lote.totalGastos)}</div>
                          <div className="lote-stat-lab">Gastos</div>
                        </div>
                      </div>
                      <div className="lote-card-footer">
                        <span className="lote-fecha">{formatFecha(lote.fechaCompra)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Tab: Gastos de Finca ── */}
          {dashboardTab === 'gastosFinca' && (
            <GastosFincaTab
              gastosFinca={gastosFinca}
              loading={gastosFincaLoading}
              onNuevo={() => setShowGastoFinca(true)}
              onEliminar={setDeleteGastoFinca}
              deletingId={deletingGastoFincaId}
            />
          )}
```

**Important:** The lote-card JSX above is a reconstruction. Before editing, read Dashboard.tsx carefully and preserve the exact existing lote-card content — only wrap it in the new `{dashboardTab === 'lotes' && (...)}` guard and add the tabs bar above. Do NOT change the lote card internal structure if it differs from the above.

- [ ] **Step 5: Add new modals to the modals section at the bottom of the JSX**

After the existing `{deleteLote && <ConfirmarBorradoModal .../>}`, add:

```tsx
      {showGastoFinca && fincaActiva && (
        <GastoFincaModal
          fincaId={fincaActiva.id}
          lotes={lotes}
          onClose={() => setShowGastoFinca(false)}
        />
      )}

      {deleteGastoFinca && (
        <ConfirmarBorradoModal
          titulo="Eliminar gasto de finca"
          mensaje={`Se eliminarán también los gastos distribuidos en ${deleteGastoFinca.lotesAplicados.length} lote${deleteGastoFinca.lotesAplicados.length !== 1 ? 's' : ''}.`}
          onConfirmar={handleEliminarGastoFinca}
          onCancelar={() => setDeleteGastoFinca(null)}
          loading={!!deletingGastoFincaId}
        />
      )}
```

### Dashboard.css

- [ ] **Step 6: Add tab styles and GastosFincaTab styles to `src/pages/Dashboard.css`**

Append to the end of the file:

```css
/* ─── Dashboard Tabs ──────────────────────────────────────────────────────── */

.dashboard-tabs {
  display: flex;
  gap: 0;
  border-bottom: 2px solid var(--color-border);
  margin-bottom: 1.25rem;
}

.dashboard-tab {
  padding: 0.55rem 1.1rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
}

.dashboard-tab:hover {
  color: var(--color-primary);
}

.dashboard-tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

/* ─── GastosFincaTab ──────────────────────────────────────────────────────── */

.gastos-finca-tab-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}

.gastos-finca-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.gasto-finca-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-left: 3px solid var(--color-primary-light);
  border-radius: var(--radius);
  padding: 0.9rem 1rem;
  box-shadow: var(--shadow);
}

.gasto-finca-card-body {
  flex: 1;
  min-width: 0;
}

.gasto-finca-card-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.gasto-finca-concepto {
  font-size: 0.95rem;
  color: var(--color-text);
}

.gasto-finca-card-meta {
  display: flex;
  gap: 0.4rem;
  font-size: 0.78rem;
  color: var(--color-text-muted);
  margin-bottom: 0.4rem;
  flex-wrap: wrap;
}

.gasto-finca-lotes-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.gasto-finca-lote-chip {
  font-size: 0.72rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 99px;
  padding: 0.15rem 0.55rem;
  color: var(--color-text-muted);
}

.gasto-finca-card-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
  flex-shrink: 0;
}

.gasto-finca-total {
  font-size: 1rem;
  color: var(--color-danger);
}

@media (max-width: 640px) {
  .gasto-finca-card {
    flex-direction: column;
    gap: 0.5rem;
  }
  .gasto-finca-card-side {
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
  }
}
```

- [ ] **Step 7: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Dashboard.tsx src/pages/Dashboard.css
git commit -m "feat(gastos-finca): add tabs and GastosFinca wiring to Dashboard"
```

---

## Task 6: LoteDetalle — 📌 chip and hide buttons

**Files:**
- Modify: `src/pages/LoteDetalle.tsx`
- Modify: `src/index.css`

### LoteDetalle.tsx

- [ ] **Step 1: Update the gastos table — concepto cell and action cell**

Read `src/pages/LoteDetalle.tsx`. In the gastos tab section (inside `{tab === 'gastos' && (...)}`) find the `<tbody>` row. Make two targeted changes:

**Change 1 — concepto `<td>` (wrap with flex and add chip):**

Find:
```tsx
<td>{g.concepto}</td>
```

Replace with:
```tsx
<td>
  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
    {g.concepto}
    {g.gastoFincaId && <span className="badge badge-finca">📌 Finca</span>}
  </span>
</td>
```

**Change 2 — action `<td>` (hide buttons when `gastoFincaId` exists):**

Find the `<td>` containing the `flex gap-1` div with ✏️ and 🗑️ buttons. It currently looks like:
```tsx
<td>
  <div className="flex gap-1">
    <button className="btn btn-ghost btn-sm" title="Editar gasto" onClick={() => setEditGasto(g)}>✏️</button>
    <button
      className="btn btn-ghost btn-sm"
      title="Eliminar gasto"
      ...
    >🗑️</button>
  </div>
</td>
```

Wrap those buttons in a conditional so they only render when there is no `gastoFincaId`:

```tsx
<td>
  {!g.gastoFincaId && (
    <div className="flex gap-1">
      <button className="btn btn-ghost btn-sm" title="Editar gasto" onClick={() => setEditGasto(g)}>✏️</button>
      <button
        className="btn btn-ghost btn-sm"
        title="Eliminar gasto"
        style={{ color: 'var(--color-danger)' }}
        disabled={deletingId === g.id}
        onClick={() => setDeleteGasto(g)}
      >🗑️</button>
    </div>
  )}
</td>
```

Keep the exact existing button content (text, onClick handlers, disabled logic) — only wrap in the `{!g.gastoFincaId && (...)}` guard.

### src/index.css

- [ ] **Step 2: Add `.badge-finca` to the badge section in `src/index.css`**

Read `src/index.css`. Find the existing `.badge` and `.badge-gray` (or similar) badge CSS rules. After the last `.badge-*` rule, add:

```css
.badge-finca {
  background: var(--color-success-light);
  color: var(--color-success);
}
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/LoteDetalle.tsx src/index.css
git commit -m "feat(gastos-finca): show chip and hide edit/delete buttons for finca gastos in LoteDetalle"
```

---

## Task 7: Firestore rules

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Add rule for gastosFinca collection**

Read `firestore.rules`. Find the block for `// Gastos: solo el dueño` and its `match /gastos/{gastoId}` rule. Immediately after the closing `}` of that gastos rule, add:

```
    // GastosFinca: solo el dueño
    match /gastosFinca/{gastoFincaId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
```

- [ ] **Step 2: Verify TypeScript compiles cleanly (sanity check)**

```bash
npx tsc --noEmit
```

Expected: zero errors (rules file has no TypeScript, this just confirms nothing else broke).

- [ ] **Step 3: Run dev build**

```bash
npm run build 2>&1 | tail -5
```

Expected: build output ending with something like `✓ built in Xs` and no errors.

- [ ] **Step 4: Commit**

```bash
git add firestore.rules
git commit -m "feat(gastos-finca): add Firestore security rule for gastosFinca collection"
```

---

## Task 8: Playwright E2E tests

**Files:**
- Create: `tests/responsive/gastos-finca.spec.ts`

Context: The test suite uses `TEST_EMAIL` / `TEST_PASSWORD` environment variables set via `.env.test` or the Playwright config. The seed data creates a finca with at least 2 lotes (Charolais Sur and Pardo Suizo Turrialba) with active animals. Playwright config is in `playwright.responsive.config.ts`.

- [ ] **Step 1: Write the failing test**

Create `tests/responsive/gastos-finca.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

const EMAIL    = process.env.TEST_EMAIL    ?? '';
const PASSWORD = process.env.TEST_PASSWORD ?? '';

test.describe('Gastos a nivel de finca', () => {
  test.skip(!EMAIL || !PASSWORD, 'TEST_EMAIL / TEST_PASSWORD not set');

  async function login(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.waitForSelector('input[type="email"]', { timeout: 15_000 });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    // Wait for dashboard
    await page.waitForURL(/\/$|\/dashboard/, { timeout: 20_000 });
    await page.waitForSelector('.dashboard-tabs, .lotes-grid, .empty-state', { timeout: 15_000 });
  }

  test('creates a finca gasto and distributes it across lotes', async ({ page }) => {
    await login(page);

    // Switch to Gastos de Finca tab
    await page.click('button.dashboard-tab:has-text("Gastos de Finca")');
    await expect(page.locator('.gastos-finca-tab')).toBeVisible();

    // Open modal
    await page.click('button:has-text("+ Nuevo gasto")');
    await expect(page.locator('.gasto-finca-modal')).toBeVisible();

    // Fill form
    await page.fill('input[placeholder="Ej: Vacunación masiva"]', 'Vacunación E2E test');
    await page.fill('input[type="number"]', '150000');
    // fecha has a default (today), leave it

    // At least one lote should already be checked (propio lotes default to checked)
    // Verify the distribution preview appears
    await expect(page.locator('.distribucion-resumen')).toBeVisible({ timeout: 3_000 });

    // Submit
    await page.click('button:has-text("Registrar gasto")');
    await expect(page.locator('.gasto-finca-modal')).not.toBeVisible({ timeout: 10_000 });

    // Verify it appears in the tab list
    await expect(page.locator('.gastos-finca-list')).toBeVisible();
    await expect(page.locator('.gasto-finca-card').filter({ hasText: 'Vacunación E2E test' })).toBeVisible();
  });

  test('distributed gasto shows chip in LoteDetalle', async ({ page }) => {
    await login(page);

    // First ensure a finca gasto exists (create one if needed)
    await page.click('button.dashboard-tab:has-text("Gastos de Finca")');
    const existing = page.locator('.gasto-finca-card').filter({ hasText: 'Vacunación E2E test' });
    const count = await existing.count();
    if (count === 0) {
      await page.click('button:has-text("+ Nuevo gasto")');
      await page.fill('input[placeholder="Ej: Vacunación masiva"]', 'Vacunación E2E test');
      await page.fill('input[type="number"]', '150000');
      await page.click('button:has-text("Registrar gasto")');
      await page.waitForSelector('.gasto-finca-card', { timeout: 10_000 });
    }

    // Navigate to the Lotes tab and open a lote that was selected
    await page.click('button.dashboard-tab:has-text("Lotes")');
    await page.locator('.lote-card').first().click();
    await page.waitForURL(/\/lote\//);

    // Switch to Gastos tab in LoteDetalle
    await page.click('button:has-text("💸 Gastos")');

    // Should see the 📌 Finca chip somewhere in the gastos list
    await expect(page.locator('.badge-finca')).toBeVisible({ timeout: 10_000 });

    // Edit and delete buttons should NOT be visible for finca gastos
    // (the row with the chip should not have ✏️ button)
    const fincaRow = page.locator('tr', { has: page.locator('.badge-finca') }).first();
    await expect(fincaRow.locator('button[title="Editar gasto"]')).not.toBeVisible();
    await expect(fincaRow.locator('button[title="Eliminar gasto"]')).not.toBeVisible();
  });

  test('deletes a finca gasto and decrements lote totalGastos', async ({ page }) => {
    await login(page);

    // Ensure a gasto exists
    await page.click('button.dashboard-tab:has-text("Gastos de Finca")');
    const cardSelector = '.gasto-finca-card:has-text("Vacunación E2E test")';
    const beforeCount = await page.locator(cardSelector).count();
    if (beforeCount === 0) {
      await page.click('button:has-text("+ Nuevo gasto")');
      await page.fill('input[placeholder="Ej: Vacunación masiva"]', 'Vacunación E2E test');
      await page.fill('input[type="number"]', '150000');
      await page.click('button:has-text("Registrar gasto")');
      await page.waitForSelector(cardSelector, { timeout: 10_000 });
    }

    // Delete
    await page.locator(cardSelector).locator('button[title="Eliminar gasto de finca"]').click();
    // Confirm modal should appear
    await expect(page.locator('.modal-backdrop')).toBeVisible();
    await expect(page.locator('.modal-backdrop')).toContainText('Se eliminarán también los gastos distribuidos');
    await page.locator('.modal-backdrop').locator('button:has-text("Eliminar"), button:has-text("Confirmar"), button:has-text("Sí")').first().click();

    // Card should disappear
    await expect(page.locator(cardSelector)).not.toBeVisible({ timeout: 10_000 });
  });
});
```

- [ ] **Step 2: Run tests to verify they can connect (even if they skip)**

```bash
npx playwright test tests/responsive/gastos-finca.spec.ts --reporter=list --config=playwright.responsive.config.ts 2>&1 | tail -20
```

Expected: Tests either PASS (if env vars set) or show as SKIPPED (if not set). No TypeScript errors.

- [ ] **Step 3: Run full build one final time**

```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds with zero errors.

- [ ] **Step 4: Commit**

```bash
git add tests/responsive/gastos-finca.spec.ts
git commit -m "test(gastos-finca): add Playwright E2E tests for create, chip display, and delete"
```

---

## Verification Checklist

After all tasks are complete, verify manually (or via Playwright with TEST_EMAIL/PASSWORD set):

- [ ] Dashboard shows "🐄 Lotes" and "💸 Gastos de Finca" tabs
- [ ] Clicking "+ Nuevo gasto" opens the modal with lote selector
- [ ] Lotes propios with animals are pre-checked; lotes a medias are unchecked by default
- [ ] Lotes with 0 animals are disabled in the selector
- [ ] Monto preview updates in real-time as you type the amount
- [ ] Distribution summary shows total, count of lotes, and total animals
- [ ] Submitting creates a card in the Gastos de Finca tab
- [ ] The distributed gasto appears in each lote's Gastos tab with 📌 Finca chip
- [ ] ✏️ and 🗑️ buttons are NOT visible on rows with the 📌 chip
- [ ] Deleting from Dashboard shows confirmation modal mentioning N lotes
- [ ] After deletion, the card disappears and lote totalGastos decrements correctly
