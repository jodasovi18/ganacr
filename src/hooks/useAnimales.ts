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

    // Validar arete duplicado en el mismo lote
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

    // Actualizar contadores del lote
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

export function useActualizarAnimal() {
  async function actualizarAnimal(animalId: string, data: Partial<Animal>) {
    await updateDoc(doc(db, 'animales', animalId), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  }
  return { actualizarAnimal };
}
