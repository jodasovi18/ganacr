import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  increment,
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
    // Actualizar totalGastos en el lote
    await updateDoc(doc(db, 'lotes', input.loteId), {
      totalGastos: increment(input.monto),
      updatedAt: now,
    });
    return ref.id;
  }

  return { agregarGasto };
}

export function useEliminarGasto() {
  async function eliminarGasto(gastoId: string, loteId: string, monto: number) {
    await deleteDoc(doc(db, 'gastos', gastoId));
    await updateDoc(doc(db, 'lotes', loteId), {
      totalGastos: increment(-monto),
      updatedAt: new Date().toISOString(),
    });
  }
  return { eliminarGasto };
}
