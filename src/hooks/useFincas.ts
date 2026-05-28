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
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Finca } from '@/types';

// ─── Listar fincas del usuario ────────────────────────────────────────────────

export function useFincas() {
  const { user } = useAuth();
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'fincas'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setFincas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Finca)));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  return { fincas, loading };
}

// ─── Crear primera finca con migración ───────────────────────────────────────
// Use this hook for first-time onboarding: creates the finca and migrates
// all existing documents (lotes, animales, gastos, pesos, ventas) to it.

export function useCrearFinca() {
  const { user } = useAuth();

  async function crearPrimeraFinca(nombre: string): Promise<string> {
    if (!user) throw new Error('No autenticado');
    const now = new Date().toISOString();

    // 1. Create the finca document
    const fincaRef = await addDoc(collection(db, 'fincas'), {
      userId: user.uid,
      nombre: nombre.trim(),
      createdAt: now,
      updatedAt: now,
    });

    // 2. Fetch all existing documents for this user across all collections
    const [lotesSnap, animalesSnap, gastosSnap, pesosSnap, ventasSnap] = await Promise.all([
      getDocs(query(collection(db, 'lotes'), where('userId', '==', user.uid))),
      getDocs(query(collection(db, 'animales'), where('userId', '==', user.uid))),
      getDocs(query(collection(db, 'gastos'), where('userId', '==', user.uid))),
      getDocs(query(collection(db, 'pesos'), where('userId', '==', user.uid))),
      getDocs(query(collection(db, 'ventas'), where('userId', '==', user.uid))),
    ]);

    // 3. Collect all document refs to update
    const allDocs = [
      ...lotesSnap.docs,
      ...animalesSnap.docs,
      ...gastosSnap.docs,
      ...pesosSnap.docs,
      ...ventasSnap.docs,
    ];

    // 4. Batch update in chunks of 500 (Firestore limit)
    for (let i = 0; i < allDocs.length; i += 500) {
      const batch = writeBatch(db);
      allDocs.slice(i, i + 500).forEach((d) => {
        batch.update(d.ref, { fincaId: fincaRef.id });
      });
      await batch.commit();
    }

    return fincaRef.id;
  }

  // Use for adding a 2nd, 3rd, etc. finca — no migration needed
  async function crearFinca(nombre: string): Promise<string> {
    if (!user) throw new Error('No autenticado');
    const now = new Date().toISOString();
    const ref = await addDoc(collection(db, 'fincas'), {
      userId: user.uid,
      nombre: nombre.trim(),
      createdAt: now,
      updatedAt: now,
    });
    return ref.id;
  }

  return { crearPrimeraFinca, crearFinca };
}

// ─── Actualizar finca ─────────────────────────────────────────────────────────

export function useActualizarFinca() {
  async function actualizarFinca(fincaId: string, nombre: string) {
    await updateDoc(doc(db, 'fincas', fincaId), {
      nombre: nombre.trim(),
      updatedAt: new Date().toISOString(),
    });
  }
  return { actualizarFinca };
}

// ─── Eliminar finca ───────────────────────────────────────────────────────────
// Only allowed if the finca has no lotes.

export function useEliminarFinca() {
  const { user } = useAuth();

  async function eliminarFinca(fincaId: string): Promise<void> {
    if (!user) throw new Error('No autenticado');
    const lotesSnap = await getDocs(
      query(
        collection(db, 'lotes'),
        where('userId', '==', user.uid),
        where('fincaId', '==', fincaId)
      )
    );
    if (!lotesSnap.empty) {
      throw new Error('No se puede eliminar una finca con lotes. Eliminá los lotes primero.');
    }
    await deleteDoc(doc(db, 'fincas', fincaId));
  }

  return { eliminarFinca };
}
