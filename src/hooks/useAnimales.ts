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
    }, (error) => {
      console.error('[useAnimales] onSnapshot error:', error);
      setLoading(false);
    });
    return unsub;
  }, [user, loteId]);

  return { animales, loading };
}

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
  const { user } = useAuth();

  async function editarAnimal(
    animalId: string,
    loteId: string,
    oldPrecioCompra: number,
    data: EditarAnimalInput,
  ) {
    if (!user) throw new Error('No autenticado');
    const now = new Date().toISOString();
    const batch = writeBatch(db);
    batch.update(doc(db, 'animales', animalId), { ...data, pesoActual: data.pesoInicial, updatedAt: now });
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
  const { user } = useAuth();

  async function eliminarAnimal(animal: Animal) {
    if (!user) throw new Error('No autenticado');
    const now = new Date().toISOString();
    // Delete associated pesos to avoid orphan documents
    const pesosSnap = await getDocs(
      query(collection(db, 'pesos'), where('userId', '==', user.uid), where('animalId', '==', animal.id))
    );
    const batch = writeBatch(db);
    pesosSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'animales', animal.id));
    batch.update(doc(db, 'lotes', animal.loteId), {
      totalAnimales: increment(-1),
      ...(animal.estado === 'activo' && { animalesActivos: increment(-1) }),
      ...(animal.estado === 'vendido' && { animalesVendidos: increment(-1) }),
      totalInvertido: increment(-animal.precioCompra),
      updatedAt: now,
    });
    await batch.commit();
  }
  return { eliminarAnimal };
}
