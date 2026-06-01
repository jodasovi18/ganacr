import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  increment,
  writeBatch,
  deleteField,
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
      where('loteId', '==', loteId)
    );
    const unsub = onSnapshot(q, (snap) => {
      setAnimales(
        snap.docs
          .map((d) => ({ ...d.data(), id: d.id } as Animal))
          .sort((a, b) => (b.createdAt < a.createdAt ? -1 : 1))
      );
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
  origen?: 'comprado' | 'nacido_finca' | 'sin_registro';
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
      origen: input.origen ?? 'comprado',
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
  origen?: 'comprado' | 'nacido_finca' | 'sin_registro';
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

// ─── Registrar muerte de un animal ───────────────────────────────────────────

interface RegistrarMuerteInput {
  fecha: string;            // ISO date de la muerte
  precioKg: number;         // ₡/kg estimado de mercado, > 0
  causa?: string;
  documentoVeterinario?: string;
}

export function useRegistrarMuerte() {
  const { user } = useAuth();

  // Devuelve el valorPerdida calculado (para mostrarlo en un toast si se desea).
  async function registrarMuerte(animal: Animal, input: RegistrarMuerteInput): Promise<number> {
    if (!user) throw new Error('No autenticado');
    if (animal.estado !== 'activo') throw new Error('Solo se puede registrar la muerte de un animal activo');
    if (input.precioKg <= 0) throw new Error('El precio por kg debe ser mayor que cero');
    if (animal.pesoActual <= 0) throw new Error('El animal no tiene peso registrado');

    const valorPerdida = Math.round(animal.pesoActual * input.precioKg);
    const now = new Date().toISOString();
    const batch = writeBatch(db);

    batch.update(doc(db, 'animales', animal.id), {
      estado: 'muerto',
      fechaSalida: input.fecha,
      causaMuerte: input.causa?.trim() || '',
      documentoVeterinario: input.documentoVeterinario?.trim() || '',
      valorPerdida,
      updatedAt: now,
    });

    batch.update(doc(db, 'lotes', animal.loteId), {
      animalesActivos: increment(-1),
      animalesMuertos: increment(1),
      utilidadTotal: increment(-valorPerdida), // la pérdida reduce la utilidad del lote
      updatedAt: now,
    });

    await batch.commit();
    return valorPerdida;
  }

  return { registrarMuerte };
}

// ─── Anular (revertir) la muerte de un animal ────────────────────────────────

export function useAnularMuerte() {
  const { user } = useAuth();

  async function anularMuerte(animal: Animal): Promise<void> {
    if (!user) throw new Error('No autenticado');
    if (animal.estado !== 'muerto') throw new Error('El animal no está registrado como muerto');

    const valorPerdida = animal.valorPerdida ?? 0;
    const now = new Date().toISOString();
    const batch = writeBatch(db);

    batch.update(doc(db, 'animales', animal.id), {
      estado: 'activo',
      fechaSalida: deleteField(),
      causaMuerte: deleteField(),
      documentoVeterinario: deleteField(),
      valorPerdida: deleteField(),
      updatedAt: now,
    });

    batch.update(doc(db, 'lotes', animal.loteId), {
      animalesActivos: increment(1),
      animalesMuertos: increment(-1),
      utilidadTotal: increment(valorPerdida), // restaura la utilidad
      updatedAt: now,
    });

    await batch.commit();
  }

  return { anularMuerte };
}
