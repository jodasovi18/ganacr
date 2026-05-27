import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  writeBatch,
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
    const batch = writeBatch(db);

    // Nuevo documento de peso
    const pesoRef = doc(collection(db, 'pesos'));
    batch.set(pesoRef, {
      userId: user.uid,
      ...input,
      createdAt: now,
    });

    // Actualizar pesoActual en el animal (una sola operación batch)
    batch.update(doc(db, 'animales', input.animalId), {
      pesoActual: input.peso,
      updatedAt: now,
    });

    await batch.commit();
    return pesoRef.id;
  }

  return { registrarPeso };
}
