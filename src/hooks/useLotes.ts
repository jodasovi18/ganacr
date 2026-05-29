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
  const { user } = useAuth();

  async function eliminarLoteConCascada(loteId: string) {
    if (!user) throw new Error('No autenticado');

    // 1. Get all animales for this lote
    const animalesSnap = await getDocs(
      query(
        collection(db, 'animales'),
        where('userId', '==', user.uid),
        where('loteId', '==', loteId)
      )
    );
    const animalIds = animalesSnap.docs.map((d) => d.id);

    // 2. Get pesos (chunked by 10, parallelised)
    const chunks: string[][] = [];
    for (let i = 0; i < animalIds.length; i += 10) {
      chunks.push(animalIds.slice(i, i + 10));
    }
    const pesoSnaps = await Promise.all(
      chunks.map((chunk) =>
        getDocs(query(collection(db, 'pesos'), where('userId', '==', user.uid), where('animalId', 'in', chunk)))
      )
    );
    const pesoDocs: DocumentReference[] = pesoSnaps.flatMap((s) => s.docs.map((d) => d.ref));

    // 3. Get gastos and ventas
    const [gastosSnap, ventasSnap] = await Promise.all([
      getDocs(query(collection(db, 'gastos'), where('userId', '==', user.uid), where('loteId', '==', loteId))),
      getDocs(query(collection(db, 'ventas'), where('userId', '==', user.uid), where('loteId', '==', loteId))),
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
