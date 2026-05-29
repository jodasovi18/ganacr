import {
  collection,
  query,
  where,
  getDocs,
  doc,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Animal, Lote } from '@/types';

export interface MoverAnimalesInput {
  animales: Animal[];   // 1 o más, todos activos
  loteSrc: Lote;        // lote origen
  loteDst: Lote;        // lote destino (distinto de loteSrc)
  precioKg: number;     // ₡/kg > 0
}

export function useMoverAnimales() {
  const { user } = useAuth();

  async function moverAnimales(input: MoverAnimalesInput): Promise<void> {
    if (!user) throw new Error('No autenticado');
    const { animales, loteSrc, loteDst, precioKg } = input;
    const isCrossFinca = loteSrc.fincaId !== loteDst.fincaId;
    const now = new Date().toISOString();

    // ── Fase 1: animales + contadores de lotes (atómico) ──────────────────
    const batch = writeBatch(db);
    let totalPrecioViejoSrc = 0;
    let totalPrecioNuevoDst = 0;

    for (const animal of animales) {
      const precioTraspaso = Math.round(precioKg * animal.pesoActual);
      totalPrecioViejoSrc += animal.precioCompra;
      totalPrecioNuevoDst += precioTraspaso;
      batch.update(doc(db, 'animales', animal.id), {
        loteId: loteDst.id,
        fincaId: loteDst.fincaId,
        precioCompra: precioTraspaso,
        updatedAt: now,
      });
    }

    batch.update(doc(db, 'lotes', loteSrc.id), {
      animalesActivos: increment(-animales.length),
      totalAnimales: increment(-animales.length),
      totalInvertido: increment(-totalPrecioViejoSrc),
      updatedAt: now,
    });
    batch.update(doc(db, 'lotes', loteDst.id), {
      animalesActivos: increment(animales.length),
      totalAnimales: increment(animales.length),
      totalInvertido: increment(totalPrecioNuevoDst),
      updatedAt: now,
    });

    await batch.commit();

    // ── Fase 2: migrar pesos.loteId (+ fincaId si cross-finca) ───────────
    const animalIds = animales.map((a) => a.id);
    // Firestore 'in' limit = 30 → chunk the queries
    for (let i = 0; i < animalIds.length; i += 30) {
      const chunk = animalIds.slice(i, i + 30);
      const snap = await getDocs(
        query(
          collection(db, 'pesos'),
          where('userId', '==', user.uid),
          where('animalId', 'in', chunk),
        )
      );
      // Write in batches of 500 (Firestore limit)
      for (let j = 0; j < snap.docs.length; j += 500) {
        const wb = writeBatch(db);
        snap.docs.slice(j, j + 500).forEach((d) =>
          wb.update(d.ref, {
            loteId: loteDst.id,
            ...(isCrossFinca && { fincaId: loteDst.fincaId, importado: true }),
          })
        );
        await wb.commit();
      }
    }
  }

  return { moverAnimales };
}
