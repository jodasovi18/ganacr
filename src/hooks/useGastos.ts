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
  fincaId: string;
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
  const { user } = useAuth();
  async function actualizarGasto(
    gastoId: string,
    loteId: string,
    oldMonto: number,
    data: ActualizarGastoInput,
  ) {
    if (!user) throw new Error('No autenticado');
    const now = new Date().toISOString();
    const batch = writeBatch(db);
    batch.update(doc(db, 'gastos', gastoId), { ...data, updatedAt: now });
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
  const { user } = useAuth();
  async function eliminarGasto(gastoId: string, loteId: string, monto: number) {
    if (!user) throw new Error('No autenticado');
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
