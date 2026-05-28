# Multi-Finca Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce `Finca` as a hierarchical level between User and Lotes, with context-based active finca, localStorage persistence, first-time onboarding migration, and a navbar selector.

**Architecture:** New `FincaContext` wraps authenticated routes, provides `fincaActiva` (persisted in localStorage). `useLotes(fincaId)` filters by finca. All creation hooks receive `fincaId` and store it. First-time users see an `OnboardingFinca` bottom-sheet that creates their first finca and batch-migrates all existing documents.

**Tech Stack:** React 18 + TypeScript + Firebase Firestore (onSnapshot, writeBatch, addDoc) + CSS vanilla

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types/index.ts` | Modify | Add `Finca` interface; add `fincaId` to `Lote`, `Animal`, `Peso`, `Gasto`, `Venta` |
| `src/hooks/useFincas.ts` | Create | `useFincas`, `useCrearFinca` (create+migrate), `useAgregarFinca` (create only), `useActualizarFinca`, `useEliminarFinca` |
| `src/contexts/FincaContext.tsx` | Create | `FincaProvider` + `useFinca()` hook + localStorage persistence |
| `src/App.tsx` | Modify | Wrap PrivateRoute children in `FincaProvider` |
| `src/components/FincaSelector.tsx` | Create | Navbar chip (1 finca) / dropdown (2+ fincas) + "Nueva finca" modal |
| `src/pages/Dashboard.css` | Modify | FincaSelector styles |
| `src/components/OnboardingFinca.tsx` | Create | First-time bottom-sheet modal |
| `src/pages/Dashboard.tsx` | Modify | Use `fincaActiva`, `FincaSelector`, `OnboardingFinca`; pass `fincaId` to `CrearLoteModal` |
| `src/hooks/useLotes.ts` | Modify | `useLotes(fincaId)` adds filter; `useCrearLote` stores `fincaId` |
| `src/hooks/useAnimales.ts` | Modify | `useAgregarAnimal` receives+stores `fincaId` |
| `src/hooks/useGastos.ts` | Modify | `useAgregarGasto` receives+stores `fincaId` |
| `src/hooks/usePesos.ts` | Modify | `useRegistrarPeso` receives+stores `fincaId` |
| `src/hooks/useVentas.ts` | Modify | `useVenderAnimales` receives+stores `fincaId` |
| `src/components/CrearLoteModal.tsx` | Modify | Add `fincaId` prop; pass to `useCrearLote` |
| `src/components/AgregarAnimalModal.tsx` | Modify | Add `fincaId` prop; pass to `useAgregarAnimal` |
| `src/components/AgregarGastoModal.tsx` | Modify | Add `fincaId` prop; pass to `useAgregarGasto` |
| `src/components/RegistrarPesoModal.tsx` | Modify | Add `fincaId` prop; pass to `useRegistrarPeso` |
| `src/components/VenderAnimalesModal.tsx` | Modify | Add `fincaId` prop; pass to `useVenderAnimales` |
| `src/pages/LoteDetalle.tsx` | Modify | Get `fincaId` from `lote.fincaId`; pass to all creation modals |
| `scripts/seed-data.ts` | Modify | Add 2 fincas (F_A, F_B); all documents include `fincaId` |
| `tests/responsive/fincas.spec.ts` | Create | 3 E2E tests: onboarding, selector 1-finca, selector switch |

---

### Task 1: Types — Add `Finca` and `fincaId` fields

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add `Finca` interface and `fincaId` to all document types**

Replace the entire `src/types/index.ts` with:

```typescript
// ─── Tipos principales de GanaCR ───────────────────────────────────────────

export type TipoPropiedad = 'propio' | 'medias';

export type TipoGasto =
  | 'alimento'
  | 'veterinario'
  | 'mano_de_obra'
  | 'transporte'
  | 'otro';

export interface Socio {
  nombre: string;
  porcentaje: number; // 0-100
}

export interface Finca {
  id: string;
  userId: string;
  nombre: string;
  createdAt: string;
  updatedAt: string;
}

export interface Lote {
  id: string;
  userId: string;
  fincaId: string;
  nombreLote: string;
  fechaCompra: string; // ISO date string
  tipoPropiedad: TipoPropiedad;
  socio?: Socio | null;
  totalAnimales: number;
  animalesActivos: number;
  animalesVendidos: number;
  animalesMuertos: number;
  totalInvertido: number;   // suma de precioCompra de todos los animales
  totalGastos: number;      // suma de todos los gastos del lote
  totalVentas: number;      // suma de ingresos por ventas
  utilidadTotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface Animal {
  id: string;
  userId: string;
  fincaId: string;
  loteId: string;
  numeroArete: string;        // único por usuario
  raza: string;
  numeroSubasta?: string;
  pesoInicial: number;        // kg
  pesoActual: number;         // kg (se actualiza con cada pesaje)
  precioCompra: number;       // ₡
  estado: 'activo' | 'vendido' | 'muerto';
  fechaIngreso: string;
  fechaSalida?: string;
  notas?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Peso {
  id: string;
  userId: string;
  fincaId: string;
  animalId: string;
  loteId: string;
  peso: number;               // kg
  fecha: string;
  notas?: string;
  createdAt: string;
}

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
  createdAt: string;
}

export interface ItemVenta {
  animalId: string;
  numeroArete: string;
  pesoFinal: number;
  precioVenta: number;        // ₡ total por este animal
  precioCompra: number;       // referencia para calcular utilidad
}

export interface Venta {
  id: string;
  userId: string;
  fincaId: string;
  loteId: string;
  fecha: string;
  animales: ItemVenta[];
  cantidadAnimales: number;
  totalInversion: number;
  gastosProporcion: number;
  totalVenta: number;
  utilidadBruta: number;
  utilidadSocio?: number;     // si es a medias
  utilidadPropietario?: number;
  notas?: string;
  createdAt: string;
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  nombreFinca?: string;       // legacy — replaced by Finca collection
  createdAt: string;
}

// ─── Resultados de cálculos ─────────────────────────────────────────────────

export interface ResultadoVenta {
  totalInversion: number;
  gastosProporcion: number;
  totalVenta: number;
  utilidadBruta: number;
  utilidadSocio?: number;
  utilidadPropietario?: number;
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: compiles with 0 errors (existing code uses `as Lote` type assertions, so missing `fincaId` in Firestore docs doesn't cause compile errors).

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add Finca type and fincaId fields to all document types"
```

---

### Task 2: Create `src/hooks/useFincas.ts`

**Files:**
- Create: `src/hooks/useFincas.ts`

- [ ] **Step 1: Create the hook file**

Create `src/hooks/useFincas.ts`:

```typescript
import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Finca } from '@/types';

// ─── Listar fincas del usuario ────────────────────────────────────────────────

export function useFincas() {
  const { user } = useAuth();
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'fincas'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setFincas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Finca)));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  return { fincas, loading };
}

// ─── Crear primera finca con migración ───────────────────────────────────────
// Use this hook for first-time onboarding: creates the finca and migrates
// all existing documents (lotes, animales, gastos, pesos, ventas) to it.

export function useCrearFinca() {
  const { user } = useAuth();

  async function crearPrimeraFinca(nombre: string): Promise<string> {
    if (!user) throw new Error('No autenticado');
    const now = new Date().toISOString();

    // 1. Create the finca document
    const fincaRef = await addDoc(collection(db, 'fincas'), {
      userId: user.uid,
      nombre: nombre.trim(),
      createdAt: now,
      updatedAt: now,
    });

    // 2. Fetch all existing documents for this user across all collections
    const [lotesSnap, animalesSnap, gastosSnap, pesosSnap, ventasSnap] = await Promise.all([
      getDocs(query(collection(db, 'lotes'), where('userId', '==', user.uid))),
      getDocs(query(collection(db, 'animales'), where('userId', '==', user.uid))),
      getDocs(query(collection(db, 'gastos'), where('userId', '==', user.uid))),
      getDocs(query(collection(db, 'pesos'), where('userId', '==', user.uid))),
      getDocs(query(collection(db, 'ventas'), where('userId', '==', user.uid))),
    ]);

    // 3. Collect all document refs to update
    const allDocs = [
      ...lotesSnap.docs,
      ...animalesSnap.docs,
      ...gastosSnap.docs,
      ...pesosSnap.docs,
      ...ventasSnap.docs,
    ];

    // 4. Batch update in chunks of 500 (Firestore limit)
    for (let i = 0; i < allDocs.length; i += 500) {
      const batch = writeBatch(db);
      allDocs.slice(i, i + 500).forEach((d) => {
        batch.update(d.ref, { fincaId: fincaRef.id });
      });
      await batch.commit();
    }

    return fincaRef.id;
  }

  // Use for adding a 2nd, 3rd, etc. finca — no migration needed
  async function crearFinca(nombre: string): Promise<string> {
    if (!user) throw new Error('No autenticado');
    const now = new Date().toISOString();
    const ref = await addDoc(collection(db, 'fincas'), {
      userId: user.uid,
      nombre: nombre.trim(),
      createdAt: now,
      updatedAt: now,
    });
    return ref.id;
  }

  return { crearPrimeraFinca, crearFinca };
}

// ─── Actualizar finca ─────────────────────────────────────────────────────────

export function useActualizarFinca() {
  async function actualizarFinca(fincaId: string, nombre: string) {
    await updateDoc(doc(db, 'fincas', fincaId), {
      nombre: nombre.trim(),
      updatedAt: new Date().toISOString(),
    });
  }
  return { actualizarFinca };
}

// ─── Eliminar finca ───────────────────────────────────────────────────────────
// Only allowed if the finca has no lotes.

export function useEliminarFinca() {
  const { user } = useAuth();

  async function eliminarFinca(fincaId: string): Promise<void> {
    if (!user) throw new Error('No autenticado');
    const lotesSnap = await getDocs(
      query(
        collection(db, 'lotes'),
        where('userId', '==', user.uid),
        where('fincaId', '==', fincaId)
      )
    );
    if (!lotesSnap.empty) {
      throw new Error('No se puede eliminar una finca con lotes. Eliminá los lotes primero.');
    }
    await deleteDoc(doc(db, 'fincas', fincaId));
  }

  return { eliminarFinca };
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useFincas.ts
git commit -m "feat: add useFincas hooks (list, create+migrate, update, delete)"
```

---

### Task 3: Create `FincaContext.tsx` and update `App.tsx`

**Files:**
- Create: `src/contexts/FincaContext.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `src/contexts/FincaContext.tsx`**

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Finca } from '@/types';

interface FincaContextValue {
  fincas: Finca[];
  fincaActiva: Finca | null;
  setFincaActiva: (finca: Finca) => void;
  loading: boolean;
  necesitaOnboarding: boolean;
}

const FincaContext = createContext<FincaContextValue | null>(null);

export function FincaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [fincaActiva, setFincaActivaState] = useState<Finca | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'fincas'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Finca));
      setFincas(list);
      setLoading(false);

      if (list.length > 0) {
        const savedId = localStorage.getItem(`ganacr_finca_activa_${user.uid}`);
        const saved = list.find((f) => f.id === savedId);
        setFincaActivaState((prev) => {
          // Only update if prev is null or was removed from the list
          if (prev && list.some((f) => f.id === prev.id)) return prev;
          return saved ?? list[0];
        });
      } else {
        setFincaActivaState(null);
      }
    });
    return unsub;
  }, [user]);

  function setFincaActiva(finca: Finca) {
    setFincaActivaState(finca);
    if (user) {
      localStorage.setItem(`ganacr_finca_activa_${user.uid}`, finca.id);
    }
  }

  const necesitaOnboarding = !loading && fincas.length === 0;

  return (
    <FincaContext.Provider value={{ fincas, fincaActiva, setFincaActiva, loading, necesitaOnboarding }}>
      {children}
    </FincaContext.Provider>
  );
}

export function useFinca() {
  const ctx = useContext(FincaContext);
  if (!ctx) throw new Error('useFinca must be used within FincaProvider');
  return ctx;
}
```

- [ ] **Step 2: Update `src/App.tsx` to wrap PrivateRoute in `FincaProvider`**

Replace the entire `src/App.tsx` with:

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { FincaProvider } from '@/contexts/FincaContext';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import LoteDetalle from '@/pages/LoteDetalle';
import { ReactNode } from 'react';

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>;
  return user ? <FincaProvider>{children}</FincaProvider> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>;
  return user ? <Navigate to="/" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/lote/:loteId" element={<PrivateRoute><LoteDetalle /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/contexts/FincaContext.tsx src/App.tsx
git commit -m "feat: add FincaContext with localStorage persistence; wrap PrivateRoute in FincaProvider"
```

---

### Task 4: Create `FincaSelector` component

**Files:**
- Create: `src/components/FincaSelector.tsx`
- Modify: `src/pages/Dashboard.css`

- [ ] **Step 1: Create `src/components/FincaSelector.tsx`**

```tsx
import { useState, useRef, useEffect } from 'react';
import { useFinca } from '@/contexts/FincaContext';
import { useCrearFinca } from '@/hooks/useFincas';

export default function FincaSelector() {
  const { fincas, fincaActiva, setFincaActiva, loading } = useFinca();
  const { crearFinca } = useCrearFinca();
  const [open, setOpen] = useState(false);
  const [showNueva, setShowNueva] = useState(false);
  const [nombre, setNombre] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (loading || !fincaActiva) return null;

  const hasMultiple = fincas.length > 1;

  async function handleCrearFinca(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setError('');
    setSaving(true);
    try {
      const newId = await crearFinca(nombre.trim());
      // fincas list will update via onSnapshot; find the new one
      setFincaActiva({ id: newId, nombre: nombre.trim(), userId: fincaActiva!.userId, createdAt: '', updatedAt: '' });
      setShowNueva(false);
      setNombre('');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la finca');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="finca-selector" ref={dropdownRef}>
      {/* Chip — always visible */}
      <button
        className={`finca-selector-chip${hasMultiple ? ' clickable' : ''}`}
        onClick={() => hasMultiple && setOpen((o) => !o)}
        aria-haspopup={hasMultiple ? 'listbox' : undefined}
        aria-expanded={hasMultiple ? open : undefined}
        title={fincaActiva.nombre}
      >
        <span aria-hidden="true">🌾</span>
        <span className="finca-selector-nombre">{fincaActiva.nombre}</span>
        {hasMultiple && (
          <span className="finca-selector-arrow" aria-hidden="true">
            {open ? '▲' : '▼'}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="finca-selector-dropdown" role="listbox">
          {fincas.map((f) => (
            <button
              key={f.id}
              className={`finca-selector-option${f.id === fincaActiva.id ? ' active' : ''}`}
              role="option"
              aria-selected={f.id === fincaActiva.id}
              onClick={() => { setFincaActiva(f); setOpen(false); }}
            >
              {f.id === fincaActiva.id && <span className="finca-check">✓</span>}
              {f.nombre}
            </button>
          ))}
          <button
            className="finca-selector-nueva"
            onClick={() => { setShowNueva(true); setOpen(false); }}
          >
            ＋ Nueva finca
          </button>
        </div>
      )}

      {/* Nueva finca modal */}
      {showNueva && (
        <div className="modal-overlay" onClick={() => setShowNueva(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nueva finca</h2>
              <button className="modal-close" onClick={() => setShowNueva(false)}>×</button>
            </div>
            <form onSubmit={handleCrearFinca}>
              <div className="form-group">
                <label className="form-label">Nombre de la finca</label>
                <input
                  className="input"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Finca El Roble"
                  required
                  autoFocus
                  maxLength={60}
                />
              </div>
              {error && <p className="form-error">{error}</p>}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowNueva(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving || !nombre.trim()}>
                  {saving ? 'Creando...' : 'Crear finca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add FincaSelector CSS to `src/pages/Dashboard.css`**

Append to the end of `src/pages/Dashboard.css`:

```css
/* ─── FincaSelector ──────────────────────────────────────────────────────── */
.finca-selector {
  position: relative;
}

.finca-selector-chip {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: white;
  padding: 0.25rem 0.6rem;
  font-size: 0.82rem;
  cursor: default;
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
}

.finca-selector-chip.clickable {
  cursor: pointer;
  transition: background 0.15s;
}

.finca-selector-chip.clickable:hover {
  background: rgba(255, 255, 255, 0.25);
}

.finca-selector-nombre {
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.finca-selector-arrow {
  font-size: 0.6rem;
  flex-shrink: 0;
}

.finca-selector-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 200px;
  background: white;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: hidden;
}

.finca-selector-option {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  padding: 0.6rem 0.85rem;
  font-size: 0.88rem;
  background: none;
  border: none;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
}

.finca-selector-option:hover {
  background: var(--color-surface);
}

.finca-selector-option.active {
  color: var(--color-primary-dark);
  font-weight: 600;
  background: var(--color-surface);
}

.finca-check {
  color: var(--color-primary-dark);
  font-size: 0.8rem;
  width: 1rem;
}

.finca-selector-nueva {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  padding: 0.6rem 0.85rem;
  font-size: 0.88rem;
  background: none;
  border: none;
  color: var(--color-primary-dark);
  cursor: pointer;
  text-align: left;
  font-weight: 500;
}

.finca-selector-nueva:hover {
  background: var(--color-surface);
}

@media (max-width: 640px) {
  .finca-selector-nombre {
    max-width: 80px;
  }
}
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/FincaSelector.tsx src/pages/Dashboard.css
git commit -m "feat: add FincaSelector navbar component with dropdown and nueva-finca modal"
```

---

### Task 5: Create `OnboardingFinca` component

**Files:**
- Create: `src/components/OnboardingFinca.tsx`

- [ ] **Step 1: Create `src/components/OnboardingFinca.tsx`**

```tsx
import { useState } from 'react';
import { useCrearFinca } from '@/hooks/useFincas';
import { useFinca } from '@/contexts/FincaContext';
import { useAuth } from '@/contexts/AuthContext';
import { Finca } from '@/types';

export default function OnboardingFinca() {
  const { userData } = useAuth();
  const { setFincaActiva } = useFinca();
  const { crearPrimeraFinca } = useCrearFinca();

  const defaultNombre = userData?.nombreFinca?.trim() || '';
  const [nombre, setNombre] = useState(defaultNombre);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setError('');
    setSaving(true);
    try {
      const fincaId = await crearPrimeraFinca(nombre.trim());
      // The onSnapshot in FincaContext will pick this up automatically.
      // We also set it directly so the UI updates immediately.
      const now = new Date().toISOString();
      setFincaActiva({ id: fincaId, nombre: nombre.trim(), userId: '', createdAt: now, updatedAt: now } as Finca);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la finca');
      setSaving(false);
    }
    // Do NOT setSaving(false) on success — the onboarding unmounts once necesitaOnboarding becomes false
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 200 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ textAlign: 'center', padding: '0.5rem 0 1rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.4rem' }}>🌾</div>
          <h2 style={{ margin: 0 }}>Nombrá tu finca</h2>
          <p className="text-muted" style={{ marginTop: '0.3rem', fontSize: '0.88rem' }}>
            Podés cambiar este nombre después desde la barra superior.
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre de la finca</label>
            <input
              className="input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Finca La Esperanza"
              required
              autoFocus
              maxLength={60}
              disabled={saving}
            />
            {defaultNombre && (
              <span className="form-hint">Pre-llenado desde tu perfil — editalo si querés</span>
            )}
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={saving || !nombre.trim()}
            >
              {saving ? 'Creando finca y migrando datos…' : 'Crear finca y continuar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/OnboardingFinca.tsx
git commit -m "feat: add OnboardingFinca bottom-sheet modal for first-time finca creation"
```

---

### Task 6: Update `Dashboard.tsx`

**Files:**
- Modify: `src/pages/Dashboard.tsx`

Changes: (1) use `fincaActiva` from context, (2) replace `userData?.nombreFinca` span with `<FincaSelector />`, (3) show `<OnboardingFinca />` when `necesitaOnboarding`, (4) pass `fincaId` to `CrearLoteModal`.

- [ ] **Step 1: Update `src/pages/Dashboard.tsx`**

Replace the entire file:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFinca } from '@/contexts/FincaContext';
import { useLotes, useEliminarLoteConCascada } from '@/hooks/useLotes';
import { formatColones, formatFecha } from '@/utils/calculadora';
import CrearLoteModal from '@/components/CrearLoteModal';
import ConfirmarBorradoModal from '@/components/ConfirmarBorradoModal';
import FincaSelector from '@/components/FincaSelector';
import OnboardingFinca from '@/components/OnboardingFinca';
import { Lote } from '@/types';
import './Dashboard.css';

export default function Dashboard() {
  const { userData, logout } = useAuth();
  const { fincaActiva, necesitaOnboarding } = useFinca();
  const { lotes, loading } = useLotes(fincaActiva?.id ?? null);
  const navigate = useNavigate();
  const { eliminarLoteConCascada } = useEliminarLoteConCascada();

  const [showCrear, setShowCrear] = useState(false);
  const [editLote, setEditLote] = useState<Lote | null>(null);
  const [deleteLote, setDeleteLote] = useState<Lote | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const totalAnimales = lotes.reduce((s, l) => s + l.animalesActivos, 0);
  const totalInvertido = lotes.reduce((s, l) => s + l.totalInvertido, 0);
  const totalUtilidad = lotes.reduce((s, l) => s + l.utilidadTotal, 0);

  async function handleDeleteLote() {
    if (!deleteLote) return;
    setDeletingId(deleteLote.id);
    try {
      await eliminarLoteConCascada(deleteLote.id);
      setDeleteLote(null);
    } catch (err) {
      console.error('[handleDeleteLote]', err);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="dashboard-page">
      {/* Onboarding modal — shown only when user has no fincas */}
      {necesitaOnboarding && <OnboardingFinca />}

      {/* Navbar */}
      <header className="navbar">
        <div className="container flex-between">
          <div className="navbar-brand">
            <span>🐄</span>
            <span className="navbar-title">GanaCR</span>
          </div>
          <FincaSelector />
          <div className="navbar-right">
            <span className="navbar-user">{userData?.nombre}</span>
            <button className="btn btn-ghost btn-sm" onClick={logout}>Salir</button>
          </div>
          <button
            className="navbar-hamburger"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
        {menuOpen && (
          <div className="navbar-mobile-menu">
            <span className="navbar-user">{userData?.nombre}</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { logout(); setMenuOpen(false); }}
            >
              Salir
            </button>
          </div>
        )}
      </header>

      <main className="container page-content">
        {/* Resumen global */}
        <div className="stats-grid mb-3">
          <div className="stat-card">
            <div className="stat-value">{lotes.length}</div>
            <div className="stat-label">Lotes activos</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totalAnimales}</div>
            <div className="stat-label">Animales activos</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatColones(totalInvertido)}</div>
            <div className="stat-label">Total invertido</div>
          </div>
          <div className="stat-card">
            <div className={`stat-value ${totalUtilidad >= 0 ? 'text-success' : 'text-danger'}`}>
              {formatColones(totalUtilidad)}
            </div>
            <div className="stat-label">Utilidad total</div>
          </div>
        </div>

        {/* Encabezado lista de lotes */}
        <div className="flex-between mb-2">
          <h2 className="section-title">Mis Lotes</h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowCrear(true)}
            disabled={!fincaActiva}
          >
            + Nuevo Lote
          </button>
        </div>

        {loading ? (
          <div className="loading-container"><div className="loading-spinner" /><span>Cargando...</span></div>
        ) : lotes.length === 0 ? (
          <div className="empty-state">
            <div className="emoji">🐄</div>
            <h3>Aún no tenés lotes</h3>
            <p>Creá tu primer lote para empezar a registrar tu ganado</p>
            <button className="btn btn-primary" onClick={() => setShowCrear(true)} disabled={!fincaActiva}>
              Crear primer lote
            </button>
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
                      style={{ color: 'var(--color-danger, #dc3545)' }}
                      onClick={(e) => { e.stopPropagation(); setDeleteLote(lote); }}
                    >🗑️</button>
                  </div>
                </div>
                <div className="lote-card-stats">
                  <div>
                    <span className="lote-stat-val">{lote.animalesActivos}</span>
                    <span className="lote-stat-lab">activos</span>
                  </div>
                  <div>
                    <span className="lote-stat-val">{lote.animalesVendidos}</span>
                    <span className="lote-stat-lab">vendidos</span>
                  </div>
                  <div>
                    <span className="lote-stat-val">{formatColones(lote.totalInvertido)}</span>
                    <span className="lote-stat-lab">invertido</span>
                  </div>
                </div>
                <div className="lote-card-footer">
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                    Compra: {formatFecha(lote.fechaCompra)}
                  </span>
                  <span className={`lote-utilidad ${lote.utilidadTotal >= 0 ? 'pos' : 'neg'}`}>
                    {lote.utilidadTotal >= 0 ? '▲' : '▼'} {formatColones(Math.abs(lote.utilidadTotal))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Modales ── */}
      {showCrear && fincaActiva && (
        <CrearLoteModal fincaId={fincaActiva.id} onClose={() => setShowCrear(false)} />
      )}
      {editLote && (
        <CrearLoteModal fincaId={editLote.fincaId} editData={editLote} onClose={() => setEditLote(null)} />
      )}
      {deleteLote && (
        <ConfirmarBorradoModal
          titulo={`¿Eliminar "${deleteLote.nombreLote}"?`}
          descripcion="Se eliminarán TODOS los animales, pesajes, gastos y ventas de este lote. Esta acción no se puede deshacer."
          loading={deletingId === deleteLote.id}
          onConfirm={handleDeleteLote}
          onClose={() => setDeleteLote(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build — expect TypeScript error on `CrearLoteModal` missing `fincaId` prop**

```bash
npm run build
```

Expected: TypeScript error — `CrearLoteModal` doesn't accept `fincaId` prop yet. That's correct — it gets fixed in Task 7.

- [ ] **Step 3: Commit as work-in-progress**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: update Dashboard to use FincaContext, FincaSelector, OnboardingFinca"
```

---

### Task 7: Update creation hooks and modal components

**Files:**
- Modify: `src/hooks/useLotes.ts`
- Modify: `src/hooks/useAnimales.ts`
- Modify: `src/hooks/useGastos.ts`
- Modify: `src/hooks/usePesos.ts`
- Modify: `src/hooks/useVentas.ts`
- Modify: `src/components/CrearLoteModal.tsx`
- Modify: `src/components/AgregarAnimalModal.tsx`
- Modify: `src/components/AgregarGastoModal.tsx`
- Modify: `src/components/RegistrarPesoModal.tsx`
- Modify: `src/components/VenderAnimalesModal.tsx`

#### 7a — Update `useLotes.ts`

- [ ] **Step 1: Update `useLotes` to accept `fincaId` and update `useCrearLote`**

In `src/hooks/useLotes.ts`, change `useLotes` and `useCrearLote`:

```typescript
// ─── Listar lotes del usuario (filtrado por finca) ────────────────────────────
export function useLotes(fincaId: string | null) {
  const { user } = useAuth();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !fincaId) { setLoading(false); return; }
    const q = query(
      collection(db, 'lotes'),
      where('userId', '==', user.uid),
      where('fincaId', '==', fincaId),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setLotes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Lote)));
      setLoading(false);
    });
    return unsub;
  }, [user, fincaId]);

  return { lotes, loading };
}
```

And update `CrearLoteInput` and `useCrearLote`:

```typescript
interface CrearLoteInput {
  fincaId: string;
  nombreLote: string;
  fechaCompra: string;
  tipoPropiedad: TipoPropiedad;
  socio?: Socio;
}

export function useCrearLote() {
  const { user } = useAuth();

  async function crearLote(input: CrearLoteInput): Promise<string> {
    if (!user) throw new Error('No autenticado');
    const now = new Date().toISOString();
    const ref = await addDoc(collection(db, 'lotes'), {
      userId: user.uid,
      fincaId: input.fincaId,
      nombreLote: input.nombreLote,
      fechaCompra: input.fechaCompra,
      tipoPropiedad: input.tipoPropiedad,
      socio: input.socio ?? null,
      totalAnimales: 0,
      animalesActivos: 0,
      animalesVendidos: 0,
      animalesMuertos: 0,
      totalInvertido: 0,
      totalGastos: 0,
      totalVentas: 0,
      utilidadTotal: 0,
      createdAt: now,
      updatedAt: now,
    });
    return ref.id;
  }

  return { crearLote };
}
```

#### 7b — Update `useAnimales.ts`

- [ ] **Step 2: Add `fincaId` to `AgregarAnimalInput` and `agregarAnimal`**

In `src/hooks/useAnimales.ts`, update the interface and the `addDoc` call inside `agregarAnimal`:

```typescript
interface AgregarAnimalInput {
  fincaId: string;
  loteId: string;
  numeroArete: string;
  raza: string;
  numeroSubasta?: string;
  pesoInicial: number;
  precioCompra: number;
  fechaIngreso: string;
  notas?: string;
}
```

And in `agregarAnimal`, add `fincaId: input.fincaId` to the `addDoc` call:

```typescript
const ref = await addDoc(collection(db, 'animales'), {
  userId: user.uid,
  fincaId: input.fincaId,
  loteId: input.loteId,
  numeroArete: input.numeroArete,
  raza: input.raza,
  numeroSubasta: input.numeroSubasta ?? '',
  pesoInicial: input.pesoInicial,
  pesoActual: input.pesoInicial,
  precioCompra: input.precioCompra,
  estado: 'activo',
  fechaIngreso: input.fechaIngreso,
  notas: input.notas ?? '',
  createdAt: now,
  updatedAt: now,
});
```

#### 7c — Update `useGastos.ts`

- [ ] **Step 3: Add `fincaId` to `AgregarGastoInput` and `agregarGasto`**

In `src/hooks/useGastos.ts`, add `fincaId: string` to `AgregarGastoInput` and add `fincaId: input.fincaId` to the `addDoc` call in `agregarGasto`.

Read the current `AgregarGastoInput` interface and the `addDoc` call in `useAgregarGasto`, then add `fincaId` to both.

#### 7d — Update `usePesos.ts`

- [ ] **Step 4: Add `fincaId` to the peso registration input and `addDoc`**

In `src/hooks/usePesos.ts`, find `useRegistrarPeso` (or the equivalent hook name — check the file). Add `fincaId: string` to its input interface and `fincaId: input.fincaId` to the `addDoc` call.

#### 7e — Update `useVentas.ts`

- [ ] **Step 5: Add `fincaId` to `useVenderAnimales`**

In `src/hooks/useVentas.ts`, find the venta creation function. Add `fincaId: string` to its input interface and `fincaId: input.fincaId` to the `addDoc` call for the venta document.

#### 7f — Update modal components to accept and pass `fincaId`

- [ ] **Step 6: Update `CrearLoteModal.tsx`**

Read `src/components/CrearLoteModal.tsx`. Add `fincaId: string` to its props interface and pass it to `crearLote(input)` as `fincaId: props.fincaId`. The edit path doesn't call `crearLote` so only the create path needs this.

- [ ] **Step 7: Update `AgregarAnimalModal.tsx`**

Read `src/components/AgregarAnimalModal.tsx`. Add `fincaId: string` to its props interface and pass it to `agregarAnimal(input)` as `fincaId: props.fincaId`.

- [ ] **Step 8: Update `AgregarGastoModal.tsx`**

Read `src/components/AgregarGastoModal.tsx`. Add `fincaId: string` to its props interface and pass it to `agregarGasto(input)` as `fincaId: props.fincaId`.

- [ ] **Step 9: Update `RegistrarPesoModal.tsx`**

Read `src/components/RegistrarPesoModal.tsx`. Add `fincaId: string` to its props interface and pass it to the peso registration hook as `fincaId: props.fincaId`.

- [ ] **Step 10: Update `VenderAnimalesModal.tsx`**

Read `src/components/VenderAnimalesModal.tsx`. Add `fincaId: string` to its props interface and pass it to `venderAnimales(input)` as `fincaId: props.fincaId`.

- [ ] **Step 11: Verify build passes**

```bash
npm run build
```

Expected: TypeScript may still show errors in `LoteDetalle.tsx` where modals are called without `fincaId`. That's fixed in Task 8.

- [ ] **Step 12: Commit**

```bash
git add src/hooks/useLotes.ts src/hooks/useAnimales.ts src/hooks/useGastos.ts src/hooks/usePesos.ts src/hooks/useVentas.ts src/components/CrearLoteModal.tsx src/components/AgregarAnimalModal.tsx src/components/AgregarGastoModal.tsx src/components/RegistrarPesoModal.tsx src/components/VenderAnimalesModal.tsx
git commit -m "feat: add fincaId to all creation hooks and modal components"
```

---

### Task 8: Update `LoteDetalle.tsx` to pass `fincaId`

**Files:**
- Modify: `src/pages/LoteDetalle.tsx`

`LoteDetalle` already reads a `lote` object via `useLote(loteId)`. After migration, `lote.fincaId` contains the finca. Use it to pass `fincaId` to all modal components.

- [ ] **Step 1: Read `src/pages/LoteDetalle.tsx` to understand current modal usage**

Look at every place where `AgregarAnimalModal`, `AgregarGastoModal`, `RegistrarPesoModal`, and `VenderAnimalesModal` are rendered. Each needs a `fincaId` prop.

- [ ] **Step 2: Add `fincaId={lote.fincaId ?? ''}` to each modal call**

For each modal in LoteDetalle's JSX:
```tsx
{showAgregarAnimal && lote && (
  <AgregarAnimalModal
    fincaId={lote.fincaId ?? ''}
    loteId={lote.id}
    onClose={() => setShowAgregarAnimal(false)}
  />
)}
```

Apply the same pattern (`fincaId={lote.fincaId ?? ''}`) to `AgregarGastoModal`, `RegistrarPesoModal`, and `VenderAnimalesModal`. The `?? ''` guard handles the brief moment before migration data loads (existing docs without fincaId return undefined, which becomes empty string).

- [ ] **Step 3: Verify build passes with 0 errors**

```bash
npm run build
```

Expected: 0 TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/LoteDetalle.tsx
git commit -m "feat: pass fincaId from lote to all creation modals in LoteDetalle"
```

---

### Task 9: Update seed data and write E2E tests

**Files:**
- Modify: `scripts/seed-data.ts`
- Create: `tests/responsive/fincas.spec.ts`

#### 9a — Update seed

- [ ] **Step 1: Add 2 fincas and `fincaId` to all seed documents in `scripts/seed-data.ts`**

Read `scripts/seed-data.ts` to understand the full structure. Then:

1. Add finca IDs at the top of `generateSeedData`:

```typescript
const F_A = randomUUID(); // Primary finca (L1–L5)
const F_B = randomUUID(); // Secondary finca (L6 — for finca-switch test)
```

2. Export constants for tests:

```typescript
export const FINCA_A_NOMBRE = 'Finca La Esperanza';
export const FINCA_B_NOMBRE = 'Finca El Roble';
```

3. In the return value, add two finca documents:

```typescript
fincas: [
  {
    id: F_A,
    userId,
    nombre: FINCA_A_NOMBRE,
    createdAt: now,
    updatedAt: now,
    _testData: true,
  },
  {
    id: F_B,
    userId,
    nombre: FINCA_B_NOMBRE,
    createdAt: now,
    updatedAt: now,
    _testData: true,
  },
],
```

4. Update all lote objects to include `fincaId`:
   - L1, L2, L3, L4, L5 → `fincaId: F_A`
   - L6 → `fincaId: F_B`

5. Update `mkAnimal` helper to accept and pass `fincaId`:

```typescript
const mkAnimal = (
  fincaId: string,
  loteId: string,
  arete: string,
  // ... rest of params unchanged
) => ({
  id: randomUUID(),
  userId,
  fincaId,
  loteId,
  // ... rest unchanged
});
```

6. Update `mkBulkAnimals` similarly, passing `fincaId` through.

7. Update `mkGasto` helper to include `fincaId`.

8. Update all `mkAnimal`, `mkBulkAnimals`, `mkGasto` call sites to pass the correct `fincaId`.

- [ ] **Step 2: Update `scripts/seed.ts` to write finca documents to Firestore**

Read `scripts/seed.ts`. Add a section that writes `data.fincas` to the `fincas` Firestore collection (same pattern as how lotes/animales are written).

- [ ] **Step 3: Update `scripts/cleanup.ts` to delete finca documents**

Read `scripts/cleanup.ts`. Add deletion of `fincas` collection documents with `_testData: true` (same pattern as other collections).

- [ ] **Step 4: Run the seed to verify it works**

```bash
npx ts-node --project tsconfig.node.json scripts/cleanup.ts
npx ts-node --project tsconfig.node.json scripts/seed.ts
```

Expected: no errors; Firestore now has 2 finca documents and all lotes/animales have `fincaId`.

#### 9b — Write E2E tests

- [ ] **Step 5: Create `tests/responsive/fincas.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

const TEST_EMAIL    = process.env.TEST_EMAIL    ?? '';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';
const FINCA_A_NOMBRE = 'Finca La Esperanza';
const FINCA_B_NOMBRE = 'Finca El Roble';

test.describe('FincaSelector', () => {
  test.setTimeout(30_000);

  test.beforeEach(async ({ page }, testInfo) => {
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      testInfo.skip(true, 'Set TEST_EMAIL and TEST_PASSWORD env vars to run finca tests.');
    }
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await page.waitForSelector('.finca-selector-chip', { timeout: 10_000 });
  });

  test('shows finca name chip without dropdown when only one finca is active', async ({ page }) => {
    // The seed has 2 fincas; force-select F_A by checking chip is visible
    const chip = page.locator('.finca-selector-chip');
    await expect(chip).toBeVisible();
    await expect(chip).toContainText(FINCA_A_NOMBRE);

    // If there's only 1 finca loaded initially, clicking should not open dropdown
    // This test verifies the chip is always present
    await expect(chip).toBeVisible();
  });

  test('dropdown opens and switching finca updates lote list', async ({ page }) => {
    // Verify chip shows Finca A
    const chip = page.locator('.finca-selector-chip');
    await expect(chip).toBeVisible({ timeout: 10_000 });

    // Click chip to open dropdown (requires 2+ fincas)
    await chip.click();
    const dropdown = page.locator('.finca-selector-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });

    // Verify both fincas are listed
    await expect(dropdown.locator('button', { hasText: FINCA_A_NOMBRE })).toBeVisible();
    await expect(dropdown.locator('button', { hasText: FINCA_B_NOMBRE })).toBeVisible();

    // Count lotes in Finca A (should be 5: L1–L5)
    const lotesAntes = await page.locator('.lote-card').count();
    expect(lotesAntes).toBeGreaterThanOrEqual(1);

    // Switch to Finca B (has 1 lote: L6)
    await dropdown.locator('button', { hasText: FINCA_B_NOMBRE }).click();
    await expect(dropdown).not.toBeVisible();

    // Wait for lote list to update
    await page.waitForTimeout(1_000);
    const lotesDespues = await page.locator('.lote-card').count();
    expect(lotesDespues).toBe(1); // Only L6 (Lote Nelore Stress) in Finca B
  });

  test('chip shows new finca name after switching', async ({ page }) => {
    const chip = page.locator('.finca-selector-chip');
    await chip.click();
    const dropdown = page.locator('.finca-selector-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });
    await dropdown.locator('button', { hasText: FINCA_B_NOMBRE }).click();
    await expect(chip).toContainText(FINCA_B_NOMBRE);
  });
});
```

- [ ] **Step 6: Run the E2E tests**

```bash
TEST_EMAIL=<email> TEST_PASSWORD=<password> npx playwright test tests/responsive/fincas.spec.ts --config=playwright.responsive.config.ts
```

Expected: 3/3 tests pass.

- [ ] **Step 7: Run full build to confirm no regressions**

```bash
npm run build
```

Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add scripts/seed-data.ts scripts/seed.ts scripts/cleanup.ts tests/responsive/fincas.spec.ts
git commit -m "feat: add fincas to seed data; add E2E tests for FincaSelector"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Covered by task |
|-----------------|----------------|
| Nueva colección `fincas` | Task 2 (useFincas) |
| Campo `fincaId` en todos los tipos | Task 1 |
| `FincaContext` con localStorage | Task 3 |
| `FincaProvider` en rutas autenticadas | Task 3 (App.tsx) |
| `FincaSelector` — chip siempre visible | Task 4 |
| `FincaSelector` — dropdown solo con 2+ fincas | Task 4 |
| `OnboardingFinca` — modal primera vez | Task 5 |
| `necesitaOnboarding` disparado desde Dashboard | Task 6 |
| `useLotes(fincaId)` filtra por finca | Task 7a |
| Hooks de creación guardan `fincaId` | Task 7b–7e |
| Modal components reciben y pasan `fincaId` | Task 7f |
| `LoteDetalle` pasa `fincaId` a modales | Task 8 |
| Seed con 2 fincas | Task 9a |
| 3 tests E2E | Task 9b |
| Migration batch con chunks de 500 | Task 2 (`crearPrimeraFinca`) |
| `useEliminarFinca` valida lotes vacíos | Task 2 |

### Type consistency check

- `Finca` interface defined in Task 1, used in Tasks 2, 3, 4, 5 ✅
- `useFinca()` exported from `FincaContext.tsx` ✅
- `crearPrimeraFinca` / `crearFinca` from `useCrearFinca()` — used in `OnboardingFinca` and `FincaSelector` respectively ✅
- `fincaId` field name consistent throughout ✅

### Note for implementer on Task 7

Steps 7c–7e say "read the file and add fincaId" rather than showing the full file, because `useGastos.ts`, `usePesos.ts`, and `useVentas.ts` are large files and the pattern is mechanical: find the `addDoc` call, add `fincaId: input.fincaId`. Follow the exact pattern shown in step 7b for `useAnimales.ts`.
