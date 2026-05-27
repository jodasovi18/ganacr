import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Peso } from '@/types';

export function usePesos(animalId: string | null) {
  const { user } = useAuth();
  const [pesos, setPesos] = useState<Peso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !animalId) { setLoading(false); return; }
    const q = query(
      collection(db, 'pesos'),
      where('animalId', '==', animalId),
      orderBy('fecha', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setPesos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Peso)));
      setLoading(false);
    });
    return unsub;
  }, [user, animalId]);

  return { pesos, loading };
}

interface RegistrarPesoInput {
  animalId: string;
  loteId: string;
  peso: number;
  fecha: string;
  notas?: string;
}

export function useRegistrarPeso() {
  const { user } = useAuth();

  async function registrarPeso(input: RegistrarPesoInput): Promise<string> {
    if (!user) throw new Error('No autenticado');
    const now = new Date().toISOString();
    const ref = await addDoc(collection(db, 'pesos'), {
      userId: user.uid,
      ...input,
      createdAt: now,
    });
    // Actualizar pesoActual en el animal
    await updateDoc(doc(db, 'animales', input.animalId), {
      pesoActual: input.peso,
      updatedAt: now,
    });
    return ref.id;
  }

  return { registrarPeso };
}
