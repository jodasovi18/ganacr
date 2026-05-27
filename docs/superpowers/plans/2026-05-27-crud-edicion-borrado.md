# CRUD Edición y Borrado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar edición y borrado completo a todas las entidades (gastos, animales, lotes con cascade, ventas con reversión), reutilizando los modales existentes en modo edición.

**Architecture:** Los modales existentes reciben un prop `editData?` opcional que activa el modo edición (pre-llena el form, cambia título y botón, llama `update` en vez de `create`). Un nuevo `ConfirmarBorradoModal` genérico maneja todas las eliminaciones. Los hooks existentes se extienden con funciones `editar*`, `eliminar*` y `anular*` que usan `writeBatch` para atomicidad.

**Tech Stack:** React 18 + TypeScript, Firebase Firestore v9 (writeBatch, deleteField, getDocs), CSS vanilla.

---

## File Structure

```
src/
  components/
    ConfirmarBorradoModal.tsx       ← NUEVO
    AgregarGastoModal.tsx           ← modificar: + editData?: Gasto
    AgregarAnimalModal.tsx          ← modificar: + editData?: Animal
    CrearLoteModal.tsx              ← modificar: + editData?: Lote
  hooks/
    useGastos.ts                    ← modificar: + useActualizarGasto, upgrade useEliminarGasto a writeBatch
    useAnimales.ts                  ← modificar: + useEditarAnimal, + useEliminarAnimal
    useLotes.ts                     ← modificar: + useEliminarLoteConCascada
    useVentas.ts                    ← modificar: + useAnularVenta
  pages/
    LoteDetalle.tsx                 ← modificar: botones ✏️🗑️ en animales/gastos, "Anular" en ventas
    Dashboard.tsx                   ← modificar: botones ✏️🗑️ en lote-cards
```

---

## Task 1: ConfirmarBorradoModal

**Files:**
- Create: `src/components/ConfirmarBorradoModal.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
// src/components/ConfirmarBorradoModal.tsx
interface Props {
  titulo: string;
  descripcion?: string;
  labelConfirmar?: string;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmarBorradoModal({
  titulo,
  descripcion,
  labelConfirmar = 'Eliminar',
  loading,
  onConfirm,
  onClose,
}: Props) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h2>⚠️ {titulo}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {descripcion && (
          <p className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>{descripcion}</p>
        )}
        <div className="flex gap-1 mt-2">
          <button
            type="button"
            className="btn btn-secondary btn-full"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-full"
            style={{ background: 'var(--color-danger, #dc3545)', color: '#fff' }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Eliminando...' : labelConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```
Expected: sin errores TypeScript.

- [ ] **Step 3: Commit**

```bash
git add src/components/ConfirmarBorradoModal.tsx
git commit -m "feat: add ConfirmarBorradoModal generic confirmation dialog"
```

---

## Task 2: useActualizarGasto + upgrade useEliminarGasto a writeBatch

**Files:**
- Modify: `src/hooks/useGastos.ts`

- [ ] **Step 1: Agregar `writeBatch` a los imports y añadir las funciones**

Reemplazar el contenido completo de `src/hooks/useGastos.ts` con:

```typescript
import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  increment,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Gasto, TipoGasto } from '@/types';

export function useGastos(loteId: string | null) {
  const { user } = useAuth();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !loteId) { setLoading(false); return; }
    const q = query(
      collection(db, 'gastos'),
      where('userId', '==', user.uid),
      where('loteId', '==', loteId),
      orderBy('fecha', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setGastos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Gasto)));
      setLoading(false);
    });
    return unsub;
  }, [user, loteId]);

  return { gastos, loading };
}

interface AgregarGastoInput {
  loteId: string;
  concepto: string;
  tipo: TipoGasto;
  monto: number;
  fecha: string;
  quienPago?: string;
  notas?: string;
}

export function useAgregarGasto() {
  const { user } = useAuth();

  async function agregarGasto(input: AgregarGastoInput): Promise<string> {
    if (!user) throw new Error('No autenticado');
    const now = new Date().toISOString();
    const ref = await addDoc(collection(db, 'gastos'), {
      userId: user.uid,
      ...input,
      createdAt: now,
    });
    await updateDoc(doc(db, 'lotes', input.loteId), {
      totalGastos: increment(input.monto),
      updatedAt: now,
    });
    return ref.id;
  }

  return { agregarGasto };
}

interface ActualizarGastoInput {
  concepto: string;
  tipo: TipoGasto;
  monto: number;
  fecha: string;
  quienPago?: string;
  notas?: string;
}

export function useActualizarGasto() {
  async function actualizarGasto(
    gastoId: string,
    loteId: string,
    oldMonto: number,
    data: ActualizarGastoInput,
  ) {
    const now = new Date().toISOString();
    const batch = writeBatch(db);
    batch.update(doc(db, 'gastos', gastoId), { ...data });
    const diff = data.monto - oldMonto;
    if (diff !== 0) {
      batch.update(doc(db, 'lotes', loteId), {
        totalGastos: increment(diff),
        updatedAt: now,
      });
    }
    await batch.commit();
  }
  return { actualizarGasto };
}

export function useEliminarGasto() {
  async function eliminarGasto(gastoId: string, loteId: string, monto: number) {
    const now = new Date().toISOString();
    const batch = writeBatch(db);
    batch.delete(doc(db, 'gastos', gastoId));
    batch.update(doc(db, 'lotes', loteId), {
      totalGastos: increment(-monto),
      updatedAt: now,
    });
    await batch.commit();
  }
  return { eliminarGasto };
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```
Expected: sin errores TypeScript.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useGastos.ts
git commit -m "feat: add useActualizarGasto, upgrade useEliminarGasto to writeBatch"
```

---

## Task 3: useEditarAnimal + useEliminarAnimal

**Files:**
- Modify: `src/hooks/useAnimales.ts`

- [ ] **Step 1: Agregar imports y las dos funciones al final del archivo**

Reemplazar el contenido completo de `src/hooks/useAnimales.ts` con:

```typescript
import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  increment,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Animal } from '@/types';

export function useAnimales(loteId: string | null) {
  const { user } = useAuth();
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !loteId) { setLoading(false); return; }
    const q = query(
      collection(db, 'animales'),
      where('userId', '==', user.uid),
      where('loteId', '==', loteId),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setAnimales(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Animal)));
      setLoading(false);
    });
    return unsub;
  }, [user, loteId]);

  return { animales, loading };
}

interface AgregarAnimalInput {
  loteId: string;
  numeroArete: string;
  raza: string;
  numeroSubasta?: string;
  pesoInicial: number;
  precioCompra: number;
  fechaIngreso: string;
  notas?: string;
}

export function useAgregarAnimal() {
  const { user } = useAuth();

  async function agregarAnimal(input: AgregarAnimalInput): Promise<string> {
    if (!user) throw new Error('No autenticado');

    const dupeSnap = await getDocs(query(
      collection(db, 'animales'),
      where('userId', '==', user.uid),
      where('loteId', '==', input.loteId),
      where('numeroArete', '==', input.numeroArete),
    ));
    if (!dupeSnap.empty) {
      throw new Error(`El arete "${input.numeroArete}" ya existe en este lote`);
    }

    const now = new Date().toISOString();
    const ref = await addDoc(collection(db, 'animales'), {
      userId: user.uid,
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

    await updateDoc(doc(db, 'lotes', input.loteId), {
      totalAnimales: increment(1),
      animalesActivos: increment(1),
      totalInvertido: increment(input.precioCompra),
      updatedAt: now,
    });

    return ref.id;
  }

  return { agregarAnimal };
}

// Kept for internal use (peso/venta hooks use it via batch directly)
export function useActualizarAnimal() {
  async function actualizarAnimal(animalId: string, data: Partial<Animal>) {
    await updateDoc(doc(db, 'animales', animalId), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  }
  return { actualizarAnimal };
}

interface EditarAnimalInput {
  raza: string;
  numeroSubasta?: string;
  pesoInicial: number;
  precioCompra: number;
  fechaIngreso: string;
  notas?: string;
}

export function useEditarAnimal() {
  async function editarAnimal(
    animalId: string,
    loteId: string,
    oldPrecioCompra: number,
    data: EditarAnimalInput,
  ) {
    const now = new Date().toISOString();
    const batch = writeBatch(db);
    batch.update(doc(db, 'animales', animalId), { ...data, updatedAt: now });
    const priceDiff = data.precioCompra - oldPrecioCompra;
    if (priceDiff !== 0) {
      batch.update(doc(db, 'lotes', loteId), {
        totalInvertido: increment(priceDiff),
        updatedAt: now,
      });
    }
    await batch.commit();
  }
  return { editarAnimal };
}

export function useEliminarAnimal() {
  async function eliminarAnimal(animal: Animal) {
    const now = new Date().toISOString();
    // Delete associated pesos to avoid orphan documents
    const pesosSnap = await getDocs(
      query(collection(db, 'pesos'), where('animalId', '==', animal.id))
    );
    const batch = writeBatch(db);
    pesosSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'animales', animal.id));
    batch.update(doc(db, 'lotes', animal.loteId), {
      totalAnimales: increment(-1),
      animalesActivos: increment(-1),
      totalInvertido: increment(-animal.precioCompra),
      updatedAt: now,
    });
    await batch.commit();
  }
  return { eliminarAnimal };
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```
Expected: sin errores TypeScript.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAnimales.ts
git commit -m "feat: add useEditarAnimal (with lote price diff) and useEliminarAnimal (with pesos cascade)"
```

---

## Task 4: useEliminarLoteConCascada

**Files:**
- Modify: `src/hooks/useLotes.ts`

- [ ] **Step 1: Agregar imports y función al final del archivo**

Reemplazar el contenido completo de `src/hooks/useLotes.ts` con:

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
  DocumentReference,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Lote, TipoPropiedad, Socio } from '@/types';

// ─── Listar lotes del usuario ────────────────────────────────────────────────

export function useLotes() {
  const { user } = useAuth();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
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

// ─── Lote individual ─────────────────────────────────────────────────────────

export function useLote(loteId: string | null) {
  const [lote, setLote] = useState<Lote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loteId) { setLoading(false); return; }
    const unsub = onSnapshot(doc(db, 'lotes', loteId), (snap) => {
      setLote(snap.exists() ? ({ id: snap.id, ...snap.data() } as Lote) : null);
      setLoading(false);
    });
    return unsub;
  }, [loteId]);

  return { lote, loading };
}

// ─── Crear lote ───────────────────────────────────────────────────────────────

interface CrearLoteInput {
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

// ─── Actualizar lote ──────────────────────────────────────────────────────────

export function useActualizarLote() {
  async function actualizarLote(loteId: string, data: Partial<Lote>) {
    await updateDoc(doc(db, 'lotes', loteId), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  }
  async function eliminarLote(loteId: string) {
    await deleteDoc(doc(db, 'lotes', loteId));
  }
  return { actualizarLote, eliminarLote };
}

// ─── Eliminar lote con cascade ────────────────────────────────────────────────

export function useEliminarLoteConCascada() {
  async function eliminarLoteConCascada(loteId: string) {
    // 1. Get all animales for this lote
    const animalesSnap = await getDocs(
      query(collection(db, 'animales'), where('loteId', '==', loteId))
    );
    const animalIds = animalesSnap.docs.map((d) => d.id);

    // 2. Get pesos (chunked by 10 to respect Firestore 'in' limit)
    const pesoDocs: DocumentReference[] = [];
    for (let i = 0; i < animalIds.length; i += 10) {
      const chunk = animalIds.slice(i, i + 10);
      const snap = await getDocs(
        query(collection(db, 'pesos'), where('animalId', 'in', chunk))
      );
      snap.docs.forEach((d) => pesoDocs.push(d.ref));
    }

    // 3. Get gastos and ventas
    const [gastosSnap, ventasSnap] = await Promise.all([
      getDocs(query(collection(db, 'gastos'), where('loteId', '==', loteId))),
      getDocs(query(collection(db, 'ventas'), where('loteId', '==', loteId))),
    ]);

    // 4. Collect all refs to delete (lote last)
    const allRefs: DocumentReference[] = [
      ...animalesSnap.docs.map((d) => d.ref),
      ...pesoDocs,
      ...gastosSnap.docs.map((d) => d.ref),
      ...ventasSnap.docs.map((d) => d.ref),
      doc(db, 'lotes', loteId),
    ];

    // 5. Delete in batches of 500 (Firestore limit)
    for (let i = 0; i < allRefs.length; i += 500) {
      const batch = writeBatch(db);
      allRefs.slice(i, i + 500).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }
  }
  return { eliminarLoteConCascada };
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```
Expected: sin errores TypeScript.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useLotes.ts
git commit -m "feat: add useEliminarLoteConCascada with batched deletion of animales/pesos/gastos/ventas"
```

---

## Task 5: useAnularVenta

**Files:**
- Modify: `src/hooks/useVentas.ts`

- [ ] **Step 1: Agregar `getDoc` y `deleteField` a imports, añadir `useAnularVenta`**

Reemplazar el contenido completo de `src/hooks/useVentas.ts` con:

```typescript
import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  increment,
  writeBatch,
  deleteField,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Venta, ItemVenta, Lote, Gasto } from '@/types';
import { calcularVenta } from '@/utils/calculadora';

export function useVentas(loteId: string | null) {
  const { user } = useAuth();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !loteId) { setLoading(false); return; }
    const q = query(
      collection(db, 'ventas'),
      where('userId', '==', user.uid),
      where('loteId', '==', loteId),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Venta));
        data.sort((a, b) => (b.fecha > a.fecha ? 1 : -1));
        setVentas(data);
        setLoading(false);
      },
      (err) => {
        console.error('[useVentas] Error:', err.code, err.message);
        setLoading(false);
      },
    );
    return unsub;
  }, [user, loteId]);

  return { ventas, loading };
}

interface RegistrarVentaInput {
  lote: Lote;
  animalesVendidos: ItemVenta[];
  fecha: string;
  gastos: Gasto[];
  totalAnimalesEnLote: number;
  notas?: string;
}

export function useRegistrarVenta() {
  const { user } = useAuth();

  async function registrarVenta(input: RegistrarVentaInput): Promise<string> {
    if (!user) throw new Error('No autenticado');
    const now = new Date().toISOString();

    const resultado = calcularVenta(
      input.animalesVendidos,
      input.lote,
      input.gastos,
      input.totalAnimalesEnLote
    );

    const batch = writeBatch(db);

    const ventaRef = doc(collection(db, 'ventas'));
    batch.set(ventaRef, {
      userId: user.uid,
      loteId: input.lote.id,
      fecha: input.fecha,
      animales: input.animalesVendidos,
      cantidadAnimales: input.animalesVendidos.length,
      totalInversion: resultado.totalInversion,
      gastosProporcion: resultado.gastosProporcion,
      totalVenta: resultado.totalVenta,
      utilidadBruta: resultado.utilidadBruta,
      utilidadSocio: resultado.utilidadSocio ?? null,
      utilidadPropietario: resultado.utilidadPropietario ?? null,
      notas: input.notas ?? '',
      createdAt: now,
    });

    for (const item of input.animalesVendidos) {
      const animalRef = doc(db, 'animales', item.animalId);
      batch.update(animalRef, {
        estado: 'vendido',
        fechaSalida: input.fecha,
        pesoActual: item.pesoFinal,
        updatedAt: now,
      });
    }

    const loteRef = doc(db, 'lotes', input.lote.id);
    batch.update(loteRef, {
      animalesActivos: increment(-input.animalesVendidos.length),
      animalesVendidos: increment(input.animalesVendidos.length),
      totalVentas: increment(resultado.totalVenta),
      utilidadTotal: increment(resultado.utilidadBruta),
      updatedAt: now,
    });

    await batch.commit();
    return ventaRef.id;
  }

  return { registrarVenta };
}

export function useAnularVenta() {
  async function anularVenta(ventaId: string) {
    const ventaSnap = await getDoc(doc(db, 'ventas', ventaId));
    if (!ventaSnap.exists()) throw new Error('Venta no encontrada');
    const venta = { id: ventaSnap.id, ...ventaSnap.data() } as Venta;

    const now = new Date().toISOString();
    const batch = writeBatch(db);

    // Restore each animal to active
    for (const item of venta.animales) {
      batch.update(doc(db, 'animales', item.animalId), {
        estado: 'activo',
        fechaSalida: deleteField(),
        updatedAt: now,
      });
    }

    // Reverse lote counters
    batch.update(doc(db, 'lotes', venta.loteId), {
      animalesActivos: increment(venta.cantidadAnimales),
      animalesVendidos: increment(-venta.cantidadAnimales),
      totalVentas: increment(-venta.totalVenta),
      utilidadTotal: increment(-venta.utilidadBruta),
      updatedAt: now,
    });

    // Delete venta
    batch.delete(doc(db, 'ventas', ventaId));

    await batch.commit();
  }
  return { anularVenta };
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```
Expected: sin errores TypeScript.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useVentas.ts
git commit -m "feat: add useAnularVenta — restores animals to active and reverses lote counters atomically"
```

---

## Task 6: AgregarGastoModal — modo edición

**Files:**
- Modify: `src/components/AgregarGastoModal.tsx`

- [ ] **Step 1: Reemplazar el contenido del modal**

```tsx
import { useState, FormEvent } from 'react';
import { useAgregarGasto, useActualizarGasto } from '@/hooks/useGastos';
import { TipoGasto, Gasto } from '@/types';

interface Props {
  loteId: string;
  onClose: () => void;
  editData?: Gasto;
}

const TIPOS: { value: TipoGasto; label: string }[] = [
  { value: 'alimento', label: '🌾 Alimento' },
  { value: 'veterinario', label: '💉 Veterinario' },
  { value: 'mano_de_obra', label: '👷 Mano de obra' },
  { value: 'transporte', label: '🚛 Transporte' },
  { value: 'otro', label: '📋 Otro' },
];

export default function AgregarGastoModal({ loteId, onClose, editData }: Props) {
  const { agregarGasto } = useAgregarGasto();
  const { actualizarGasto } = useActualizarGasto();
  const isEdit = !!editData;

  const [concepto, setConcepto] = useState(editData?.concepto ?? '');
  const [tipo, setTipo] = useState<TipoGasto>(editData?.tipo ?? 'alimento');
  const [monto, setMonto] = useState(editData?.monto?.toString() ?? '');
  const [fecha, setFecha] = useState(editData?.fecha ?? new Date().toISOString().split('T')[0]);
  const [quienPago, setQuienPago] = useState(editData?.quienPago ?? '');
  const [notas, setNotas] = useState(editData?.notas ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!concepto.trim() || !monto) { setError('Concepto y monto son requeridos'); return; }
    setLoading(true);
    try {
      if (isEdit && editData) {
        await actualizarGasto(editData.id, loteId, editData.monto, {
          concepto, tipo, monto: Number(monto), fecha, quienPago, notas,
        });
      } else {
        await agregarGasto({ loteId, concepto, tipo, monto: Number(monto), fecha, quienPago, notas });
      }
      onClose();
    } catch (err) {
      setError('Error: ' + String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{isEdit ? '✏️ Editar Gasto' : '💸 Registrar Gasto'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Tipo de gasto</label>
            <select className="form-select" value={tipo} onChange={(e) => setTipo(e.target.value as TipoGasto)}>
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Concepto *</label>
            <input className="form-input" placeholder="Ej: Sales minerales, Ivermectina, etc." value={concepto} onChange={(e) => setConcepto(e.target.value)} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Monto (₡) *</label>
              <input className="form-input" type="number" min="1" step="any" placeholder="Ej: 25000" value={monto} onChange={(e) => setMonto(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha</label>
              <input className="form-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Quién pagó (si es a medias)</label>
            <input className="form-input" placeholder="Ej: Juan, Yo, Ambos..." value={quienPago} onChange={(e) => setQuienPago(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Notas</label>
            <textarea className="form-textarea" rows={2} placeholder="Detalle adicional..." value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
          {error && <div className="form-error mb-2">{error}</div>}
          <div className="flex gap-1 mt-2">
            <button type="button" className="btn btn-secondary btn-full" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar Gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```
Expected: sin errores TypeScript.

- [ ] **Step 3: Commit**

```bash
git add src/components/AgregarGastoModal.tsx
git commit -m "feat: AgregarGastoModal supports edit mode via editData prop"
```

---

## Task 7: AgregarAnimalModal — modo edición

**Files:**
- Modify: `src/components/AgregarAnimalModal.tsx`

- [ ] **Step 1: Reemplazar el contenido del modal**

```tsx
import { useState, FormEvent } from 'react';
import { useAgregarAnimal, useEditarAnimal } from '@/hooks/useAnimales';
import { Animal } from '@/types';

interface Props {
  loteId: string;
  onClose: () => void;
  editData?: Animal;
}

export default function AgregarAnimalModal({ loteId, onClose, editData }: Props) {
  const { agregarAnimal } = useAgregarAnimal();
  const { editarAnimal } = useEditarAnimal();
  const isEdit = !!editData;

  const [numeroArete, setNumeroArete] = useState(editData?.numeroArete ?? '');
  const [raza, setRaza] = useState(editData?.raza ?? '');
  const [numeroSubasta, setNumeroSubasta] = useState(editData?.numeroSubasta ?? '');
  const [pesoInicial, setPesoInicial] = useState(editData?.pesoInicial?.toString() ?? '');
  const [precioCompra, setPrecioCompra] = useState(editData?.precioCompra?.toString() ?? '');
  const [fechaIngreso, setFechaIngreso] = useState(
    editData?.fechaIngreso ?? new Date().toISOString().split('T')[0]
  );
  const [notas, setNotas] = useState(editData?.notas ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!numeroArete.trim() || !raza.trim() || !pesoInicial || !precioCompra) {
      setError('Todos los campos marcados son requeridos');
      return;
    }
    setLoading(true);
    try {
      if (isEdit && editData) {
        await editarAnimal(editData.id, loteId, editData.precioCompra, {
          raza: raza.trim(),
          numeroSubasta: numeroSubasta.trim(),
          pesoInicial: Number(pesoInicial),
          precioCompra: Number(precioCompra),
          fechaIngreso,
          notas,
        });
      } else {
        await agregarAnimal({
          loteId,
          numeroArete: numeroArete.trim().toUpperCase(),
          raza: raza.trim(),
          numeroSubasta: numeroSubasta.trim(),
          pesoInicial: Number(pesoInicial),
          precioCompra: Number(precioCompra),
          fechaIngreso,
          notas,
        });
      }
      onClose();
    } catch (err) {
      setError('Error: ' + String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{isEdit ? '✏️ Editar Animal' : '🐄 Agregar Animal'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Número de arete *</label>
              <input
                className="form-input"
                placeholder="Ej: CR-001234"
                value={numeroArete}
                onChange={(e) => setNumeroArete(e.target.value)}
                required
                disabled={isEdit}
                style={isEdit ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
              />
            </div>
            <div className="form-group">
              <label className="form-label">N° subasta</label>
              <input className="form-input" placeholder="Ej: 45" value={numeroSubasta} onChange={(e) => setNumeroSubasta(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Raza *</label>
            <select className="form-select" value={raza} onChange={(e) => setRaza(e.target.value)} required>
              <option value="">Seleccionar raza...</option>
              <option>Brahman</option>
              <option>Holstein</option>
              <option>Jersey</option>
              <option>Pardo Suizo</option>
              <option>Nelore</option>
              <option>Charolais</option>
              <option>Angus</option>
              <option>Simmental</option>
              <option>Criollo</option>
              <option>Mestizo</option>
              <option>Otra</option>
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Peso inicial (kg) *</label>
              <input className="form-input" type="number" min="1" step="0.5" placeholder="Ej: 320" value={pesoInicial} onChange={(e) => setPesoInicial(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Precio de compra (₡) *</label>
              <input className="form-input" type="number" min="1" step="any" placeholder="Ej: 450000" value={precioCompra} onChange={(e) => setPrecioCompra(e.target.value)} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Fecha de ingreso</label>
            <input className="form-input" type="date" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Notas</label>
            <textarea className="form-textarea" rows={2} placeholder="Observaciones del animal..." value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
          {error && <div className="form-error mb-2">{error}</div>}
          <div className="flex gap-1 mt-2">
            <button type="button" className="btn btn-secondary btn-full" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Agregar Animal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```
Expected: sin errores TypeScript.

- [ ] **Step 3: Commit**

```bash
git add src/components/AgregarAnimalModal.tsx
git commit -m "feat: AgregarAnimalModal supports edit mode (arete disabled, price diff updates lote)"
```

---

## Task 8: CrearLoteModal — modo edición

**Files:**
- Modify: `src/components/CrearLoteModal.tsx`

- [ ] **Step 1: Reemplazar el contenido del modal**

```tsx
import { useState, FormEvent } from 'react';
import { useCrearLote, useActualizarLote } from '@/hooks/useLotes';
import { Lote } from '@/types';

interface Props {
  onClose: () => void;
  editData?: Lote;
}

export default function CrearLoteModal({ onClose, editData }: Props) {
  const { crearLote } = useCrearLote();
  const { actualizarLote } = useActualizarLote();
  const isEdit = !!editData;

  const [nombre, setNombre] = useState(editData?.nombreLote ?? '');
  const [fechaCompra, setFechaCompra] = useState(
    editData?.fechaCompra ?? new Date().toISOString().split('T')[0]
  );
  const [tipo, setTipo] = useState<'propio' | 'medias'>(editData?.tipoPropiedad ?? 'propio');
  const [socioNombre, setSocioNombre] = useState(editData?.socio?.nombre ?? '');
  const [socioPorcentaje, setSocioPorcentaje] = useState(editData?.socio?.porcentaje ?? 50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!nombre.trim()) { setError('El nombre del lote es requerido'); return; }
    if (tipo === 'medias' && !socioNombre.trim()) { setError('El nombre del socio es requerido'); return; }
    setLoading(true);
    try {
      if (isEdit && editData) {
        await actualizarLote(editData.id, {
          nombreLote: nombre,
          tipoPropiedad: tipo,
          socio: tipo === 'medias' ? { nombre: socioNombre, porcentaje: socioPorcentaje } : null,
        });
      } else {
        await crearLote({
          nombreLote: nombre,
          fechaCompra,
          tipoPropiedad: tipo,
          socio: tipo === 'medias' ? { nombre: socioNombre, porcentaje: socioPorcentaje } : undefined,
        });
      }
      onClose();
    } catch (err) {
      setError('Error: ' + String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{isEdit ? '✏️ Editar Lote' : '🐄 Nuevo Lote'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre del lote *</label>
            <input className="form-input" placeholder="Ej: Lote Enero 2026" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>

          {!isEdit && (
            <div className="form-group">
              <label className="form-label">Fecha de compra</label>
              <input className="form-input" type="date" value={fechaCompra} onChange={(e) => setFechaCompra(e.target.value)} />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Tipo de propiedad</label>
            <select className="form-select" value={tipo} onChange={(e) => setTipo(e.target.value as 'propio' | 'medias')}>
              <option value="propio">100% Propio</option>
              <option value="medias">A medias con socio</option>
            </select>
          </div>

          {tipo === 'medias' && (
            <>
              <div className="form-group">
                <label className="form-label">Nombre del socio *</label>
                <input className="form-input" placeholder="Ej: Juan Pérez" value={socioNombre} onChange={(e) => setSocioNombre(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Porcentaje del socio: {socioPorcentaje}% / {100 - socioPorcentaje}% tuyo</label>
                <input type="range" min={10} max={90} step={5} value={socioPorcentaje} onChange={(e) => setSocioPorcentaje(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--color-primary)' }} />
              </div>
            </>
          )}

          {error && <div className="form-error mb-2">{error}</div>}

          <div className="flex gap-1 mt-2">
            <button type="button" className="btn btn-secondary btn-full" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear Lote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```
Expected: sin errores TypeScript.

- [ ] **Step 3: Commit**

```bash
git add src/components/CrearLoteModal.tsx
git commit -m "feat: CrearLoteModal supports edit mode (fecha hidden on edit, socio can be removed)"
```

---

## Task 9: LoteDetalle — botones de edición y borrado

**Files:**
- Modify: `src/pages/LoteDetalle.tsx`

- [ ] **Step 1: Reemplazar el contenido completo de LoteDetalle.tsx**

```tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLote } from '@/hooks/useLotes';
import { useAnimales, useEliminarAnimal } from '@/hooks/useAnimales';
import { useGastos, useEliminarGasto } from '@/hooks/useGastos';
import { useVentas, useAnularVenta } from '@/hooks/useVentas';
import { formatColones, formatKg, formatFecha } from '@/utils/calculadora';
import AgregarAnimalModal from '@/components/AgregarAnimalModal';
import AgregarGastoModal from '@/components/AgregarGastoModal';
import RegistrarPesoModal from '@/components/RegistrarPesoModal';
import VenderAnimalesModal from '@/components/VenderAnimalesModal';
import ConfirmarBorradoModal from '@/components/ConfirmarBorradoModal';
import { Animal, Gasto, Venta } from '@/types';
import './LoteDetalle.css';

type Tab = 'animales' | 'gastos' | 'ventas';

export default function LoteDetalle() {
  const { loteId } = useParams<{ loteId: string }>();
  const { lote, loading } = useLote(loteId ?? null);
  const { animales } = useAnimales(loteId ?? null);
  const { gastos } = useGastos(loteId ?? null);
  const { ventas } = useVentas(loteId ?? null);
  const navigate = useNavigate();

  const { eliminarAnimal } = useEliminarAnimal();
  const { eliminarGasto } = useEliminarGasto();
  const { anularVenta } = useAnularVenta();

  const [tab, setTab] = useState<Tab>('animales');

  // Create modals
  const [showAnimal, setShowAnimal] = useState(false);
  const [showGasto, setShowGasto] = useState(false);
  const [showPeso, setShowPeso] = useState(false);
  const [showVenta, setShowVenta] = useState(false);
  const [animalPeso, setAnimalPeso] = useState<Animal | null>(null);

  // Edit modals
  const [editAnimal, setEditAnimal] = useState<Animal | null>(null);
  const [editGasto, setEditGasto] = useState<Gasto | null>(null);

  // Delete confirms
  const [deleteAnimal, setDeleteAnimal] = useState<Animal | null>(null);
  const [deleteGasto, setDeleteGasto] = useState<Gasto | null>(null);
  const [deleteVenta, setDeleteVenta] = useState<Venta | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>;
  if (!lote) return <div className="container page-content"><p>Lote no encontrado.</p></div>;

  const animalesActivos = animales.filter((a) => a.estado === 'activo');

  async function handleDeleteAnimal() {
    if (!deleteAnimal) return;
    setDeletingId(deleteAnimal.id);
    try {
      await eliminarAnimal(deleteAnimal);
      setDeleteAnimal(null);
    } catch (err) {
      console.error('[handleDeleteAnimal]', err);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteGasto() {
    if (!deleteGasto) return;
    setDeletingId(deleteGasto.id);
    try {
      await eliminarGasto(deleteGasto.id, loteId!, deleteGasto.monto);
      setDeleteGasto(null);
    } catch (err) {
      console.error('[handleDeleteGasto]', err);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAnularVenta() {
    if (!deleteVenta) return;
    setDeletingId(deleteVenta.id);
    try {
      await anularVenta(deleteVenta.id);
      setDeleteVenta(null);
    } catch (err) {
      console.error('[handleAnularVenta]', err);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="lote-detalle-page">
      {/* Header */}
      <header className="detalle-header">
        <div className="container">
          <button className="btn btn-ghost btn-sm mb-2" onClick={() => navigate('/')}>
            ← Volver
          </button>
          <div className="flex-between flex-wrap gap-2">
            <div>
              <h1 className="detalle-titulo">{lote.nombreLote}</h1>
              {lote.tipoPropiedad === 'medias' && lote.socio && (
                <p className="detalle-socio">🤝 A medias con <strong>{lote.socio.nombre}</strong> ({lote.socio.porcentaje}% / {100 - lote.socio.porcentaje}%)</p>
              )}
              <p className="text-muted" style={{ fontSize: '0.82rem' }}>Compra: {formatFecha(lote.fechaCompra)}</p>
            </div>
            <div className="detalle-acciones">
              <button className="btn btn-primary btn-sm" onClick={() => setShowAnimal(true)}>+ Animal</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowGasto(true)}>+ Gasto</button>
              {animalesActivos.length > 0 && (
                <button className="btn btn-secondary btn-sm" onClick={() => setShowVenta(true)}>💰 Vender</button>
              )}
            </div>
          </div>

          <div className="stats-grid mt-2">
            <div className="stat-card"><div className="stat-value">{lote.animalesActivos}</div><div className="stat-label">Activos</div></div>
            <div className="stat-card"><div className="stat-value">{lote.animalesVendidos}</div><div className="stat-label">Vendidos</div></div>
            <div className="stat-card"><div className="stat-value">{formatColones(lote.totalInvertido)}</div><div className="stat-label">Invertido</div></div>
            <div className="stat-card"><div className="stat-value">{formatColones(lote.totalGastos)}</div><div className="stat-label">Gastos</div></div>
            <div className="stat-card">
              <div className={`stat-value ${lote.utilidadTotal >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatColones(lote.utilidadTotal)}
              </div>
              <div className="stat-label">Utilidad</div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="container">
        <div className="tabs mt-2">
          {(['animales', 'gastos', 'ventas'] as Tab[]).map((t) => (
            <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'animales' && `🐄 Animales (${animales.length})`}
              {t === 'gastos' && `💸 Gastos (${gastos.length})`}
              {t === 'ventas' && `💰 Ventas (${ventas.length})`}
            </button>
          ))}
        </div>

        <div className="tab-content page-content">
          {/* ── Tab Animales ── */}
          {tab === 'animales' && (
            animales.length === 0 ? (
              <div className="empty-state">
                <div className="emoji">🐄</div>
                <h3>Sin animales aún</h3>
                <p>Agregá el primer animal a este lote</p>
                <button className="btn btn-primary" onClick={() => setShowAnimal(true)}>+ Agregar animal</button>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Arete</th>
                      <th>Raza</th>
                      <th>Peso inicial</th>
                      <th>Peso actual</th>
                      <th>Ganancia</th>
                      <th>Precio compra</th>
                      <th>Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {animales.map((animal) => {
                      const ganancia = animal.pesoActual - animal.pesoInicial;
                      return (
                        <tr key={animal.id}>
                          <td><strong>{animal.numeroArete}</strong></td>
                          <td>{animal.raza}</td>
                          <td>{formatKg(animal.pesoInicial)}</td>
                          <td>{formatKg(animal.pesoActual)}</td>
                          <td className={ganancia >= 0 ? 'text-success' : 'text-danger'}>
                            {ganancia >= 0 ? '+' : ''}{formatKg(ganancia)}
                          </td>
                          <td>{formatColones(animal.precioCompra)}</td>
                          <td>
                            <span className={`badge ${animal.estado === 'activo' ? 'badge-green' : animal.estado === 'vendido' ? 'badge-yellow' : 'badge-red'}`}>
                              {animal.estado}
                            </span>
                          </td>
                          <td>
                            <div className="flex gap-1">
                              {animal.estado === 'activo' && (
                                <>
                                  <button className="btn btn-ghost btn-sm" title="Registrar peso" onClick={() => { setAnimalPeso(animal); setShowPeso(true); }}>
                                    ⚖️
                                  </button>
                                  <button className="btn btn-ghost btn-sm" title="Editar animal" onClick={() => setEditAnimal(animal)}>
                                    ✏️
                                  </button>
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    title="Eliminar animal"
                                    style={{ color: 'var(--color-danger, #dc3545)' }}
                                    onClick={() => setDeleteAnimal(animal)}
                                  >
                                    🗑️
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── Tab Gastos ── */}
          {tab === 'gastos' && (
            gastos.length === 0 ? (
              <div className="empty-state">
                <div className="emoji">💸</div>
                <h3>Sin gastos registrados</h3>
                <p>Registrá los gastos de alimento, veterinario, etc.</p>
                <button className="btn btn-primary" onClick={() => setShowGasto(true)}>+ Agregar gasto</button>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Fecha</th><th>Concepto</th><th>Tipo</th><th>Quién pagó</th><th>Monto</th><th></th></tr>
                  </thead>
                  <tbody>
                    {gastos.map((g) => (
                      <tr key={g.id}>
                        <td>{formatFecha(g.fecha)}</td>
                        <td>{g.concepto}</td>
                        <td><span className="badge badge-gray">{g.tipo.replace('_', ' ')}</span></td>
                        <td>{g.quienPago || '—'}</td>
                        <td><strong>{formatColones(g.monto)}</strong></td>
                        <td>
                          <div className="flex gap-1">
                            <button className="btn btn-ghost btn-sm" title="Editar gasto" onClick={() => setEditGasto(g)}>✏️</button>
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Eliminar gasto"
                              style={{ color: 'var(--color-danger, #dc3545)' }}
                              onClick={() => setDeleteGasto(g)}
                            >🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={4} className="text-right"><strong>TOTAL</strong></td>
                      <td><strong className="text-danger">{formatColones(gastos.reduce((s, g) => s + g.monto, 0))}</strong></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── Tab Ventas ── */}
          {tab === 'ventas' && (
            ventas.length === 0 ? (
              <div className="empty-state">
                <div className="emoji">💰</div>
                <h3>Sin ventas registradas</h3>
                <p>Cuando vendás animales, el registro aparecerá aquí</p>
              </div>
            ) : (
              <div className="ventas-list">
                {ventas.map((v) => (
                  <div key={v.id} className="venta-card card mb-2">
                    <div className="flex-between mb-1">
                      <span><strong>{v.cantidadAnimales} animal{v.cantidadAnimales !== 1 ? 'es' : ''}</strong> — {formatFecha(v.fecha)}</span>
                      <div className="flex gap-1" style={{ alignItems: 'center' }}>
                        <span className={`badge ${v.utilidadBruta >= 0 ? 'badge-green' : 'badge-red'}`}>
                          {v.utilidadBruta >= 0 ? '+' : ''}{formatColones(v.utilidadBruta)}
                        </span>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--color-danger, #dc3545)', fontSize: '0.78rem' }}
                          onClick={() => setDeleteVenta(v)}
                        >
                          Anular
                        </button>
                      </div>
                    </div>
                    <div className="venta-detalle">
                      <div><span>Inversión</span><span>{formatColones(v.totalInversion)}</span></div>
                      <div><span>Gastos prop.</span><span>{formatColones(v.gastosProporcion)}</span></div>
                      <div><span>Venta total</span><span>{formatColones(v.totalVenta)}</span></div>
                      {v.utilidadSocio !== null && v.utilidadSocio !== undefined && lote.socio && (
                        <>
                          <div><span>Utilidad {lote.socio.nombre}</span><span className="text-success">{formatColones(v.utilidadSocio)}</span></div>
                          <div><span>Tu utilidad</span><span className="text-success">{formatColones(v.utilidadPropietario ?? 0)}</span></div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Modales de creación ── */}
      {showAnimal && loteId && <AgregarAnimalModal loteId={loteId} onClose={() => setShowAnimal(false)} />}
      {showGasto && loteId && <AgregarGastoModal loteId={loteId} onClose={() => setShowGasto(false)} />}
      {showPeso && animalPeso && loteId && (
        <RegistrarPesoModal animal={animalPeso} loteId={loteId} onClose={() => { setShowPeso(false); setAnimalPeso(null); }} />
      )}
      {showVenta && lote && (
        <VenderAnimalesModal lote={lote} animalesActivos={animalesActivos} gastos={gastos} onClose={() => setShowVenta(false)} />
      )}

      {/* ── Modales de edición ── */}
      {editAnimal && loteId && (
        <AgregarAnimalModal loteId={loteId} editData={editAnimal} onClose={() => setEditAnimal(null)} />
      )}
      {editGasto && loteId && (
        <AgregarGastoModal loteId={loteId} editData={editGasto} onClose={() => setEditGasto(null)} />
      )}

      {/* ── Modales de confirmación de borrado ── */}
      {deleteAnimal && (
        <ConfirmarBorradoModal
          titulo={`¿Eliminar animal ${deleteAnimal.numeroArete}?`}
          descripcion="Se eliminarán también todos sus pesajes registrados."
          loading={deletingId === deleteAnimal.id}
          onConfirm={handleDeleteAnimal}
          onClose={() => setDeleteAnimal(null)}
        />
      )}
      {deleteGasto && (
        <ConfirmarBorradoModal
          titulo="¿Eliminar este gasto?"
          descripcion={`${deleteGasto.concepto} — ${formatColones(deleteGasto.monto)}`}
          loading={deletingId === deleteGasto.id}
          onConfirm={handleDeleteGasto}
          onClose={() => setDeleteGasto(null)}
        />
      )}
      {deleteVenta && (
        <ConfirmarBorradoModal
          titulo="¿Anular esta venta?"
          descripcion="Los animales volverán a estado activo y los contadores del lote serán revertidos. Esta acción no se puede deshacer."
          labelConfirmar="Anular venta"
          loading={deletingId === deleteVenta.id}
          onConfirm={handleAnularVenta}
          onClose={() => setDeleteVenta(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```
Expected: sin errores TypeScript.

- [ ] **Step 3: Commit**

```bash
git add src/pages/LoteDetalle.tsx
git commit -m "feat: LoteDetalle — edit/delete buttons for animales, gastos; anular for ventas"
```

---

## Task 10: Dashboard — botones editar/borrar en lotes

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Reemplazar el contenido completo de Dashboard.tsx**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLotes, useEliminarLoteConCascada } from '@/hooks/useLotes';
import { formatColones, formatFecha } from '@/utils/calculadora';
import CrearLoteModal from '@/components/CrearLoteModal';
import ConfirmarBorradoModal from '@/components/ConfirmarBorradoModal';
import { Lote } from '@/types';
import './Dashboard.css';

export default function Dashboard() {
  const { userData, logout } = useAuth();
  const { lotes, loading } = useLotes();
  const navigate = useNavigate();
  const { eliminarLoteConCascada } = useEliminarLoteConCascada();

  const [showCrear, setShowCrear] = useState(false);
  const [editLote, setEditLote] = useState<Lote | null>(null);
  const [deleteLote, setDeleteLote] = useState<Lote | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      {/* Navbar */}
      <header className="navbar">
        <div className="container flex-between">
          <div className="navbar-brand">
            <span>🐄</span>
            <span className="navbar-title">GanaCR</span>
            {userData?.nombreFinca && (
              <span className="navbar-finca">{userData.nombreFinca}</span>
            )}
          </div>
          <div className="navbar-right">
            <span className="navbar-user">{userData?.nombre}</span>
            <button className="btn btn-ghost btn-sm" onClick={logout}>Salir</button>
          </div>
        </div>
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
          <button className="btn btn-primary" onClick={() => setShowCrear(true)}>
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
      {showCrear && <CrearLoteModal onClose={() => setShowCrear(false)} />}
      {editLote && <CrearLoteModal editData={editLote} onClose={() => setEditLote(null)} />}
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

- [ ] **Step 2: Verificar build**

```bash
npm run build
```
Expected: sin errores TypeScript.

- [ ] **Step 3: Commit y push**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: Dashboard — edit/delete buttons on lote-cards with cascade confirmation"
git push origin feature/crud-edicion-borrado
```

---

## Verificación final

- [ ] `npm run build` pasa limpio
- [ ] Flujos de creación existentes intactos (crear lote, agregar animal, agregar gasto, vender)
- [ ] Editar gasto: modal pre-llenado, "Guardar cambios", totalGastos del lote se actualiza
- [ ] Eliminar gasto: confirmación, totalGastos del lote decrece
- [ ] Editar animal: arete deshabilitado, cambio de precio actualiza totalInvertido del lote
- [ ] Eliminar animal: confirmación, sus pesos son borrados, contadores del lote decrementan
- [ ] Editar lote: nombre y socio actualizables desde Dashboard
- [ ] Eliminar lote: confirmación con advertencia, animales/pesos/gastos/ventas eliminados en cascade
- [ ] Anular venta: animales vuelven a "activo", contadores del lote revertidos, venta eliminada
- [ ] Botones de lote-card no navegan al lote (stopPropagation correcto)
