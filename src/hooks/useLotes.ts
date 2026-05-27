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
  doc,
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

// ─── Actualizar / Eliminar lote ───────────────────────────────────────────────

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
