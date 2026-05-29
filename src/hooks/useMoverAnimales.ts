import { useState } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function moverAnimales(input: MoverAnimalesInput): Promise<void> {
    if (!user) throw new Error('No autenticado');
    const { animales, loteSrc, loteDst, precioKg } = input;

    // Input validation
    if (animales.length === 0) throw new Error('No hay animales seleccionados');
    if (precioKg <= 0) throw new Error('El precio por kg debe ser mayor que cero');

    setLoading(true);
    setError(null);
    try {
      const isCrossFinca = loteSrc.fincaId !== loteDst.fincaId;
      const now = new Date().toISOString();
      let totalPrecioViejoSrc = 0;
      let totalPrecioNuevoDst = 0;

      // ── Fase 1: animales — chunked en lotes de 498 (límite Firestore: 500 ops/batch) ──
      for (let i = 0; i < animales.length; i += 498) {
        const animalChunk = animales.slice(i, i + 498);
        const animalBatch = writeBatch(db);
        for (const animal of animalChunk) {
          if (animal.pesoActual <= 0)
            throw new Error(`El animal ${animal.numeroArete} no tiene peso registrado`);
          const precioTraspaso = Math.round(precioKg * animal.pesoActual);
          totalPrecioViejoSrc += animal.precioCompra;
          totalPrecioNuevoDst += precioTraspaso;
          animalBatch.update(doc(db, 'animales', animal.id), {
            loteId: loteDst.id,
            fincaId: loteDst.fincaId,
            precioCompra: precioTraspaso,
            updatedAt: now,
          });
        }
        await animalBatch.commit();
      }

      // ── Contadores de lotes — batch separado, después de sumar totales ──
      const lotesBatch = writeBatch(db);
      lotesBatch.update(doc(db, 'lotes', loteSrc.id), {
        animalesActivos: increment(-animales.length),
        totalAnimales: increment(-animales.length),
        totalInvertido: increment(-totalPrecioViejoSrc),
        updatedAt: now,
      });
      lotesBatch.update(doc(db, 'lotes', loteDst.id), {
        animalesActivos: increment(animales.length),
        totalAnimales: increment(animales.length),
        totalInvertido: increment(totalPrecioNuevoDst),
        updatedAt: now,
      });
      await lotesBatch.commit();

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
        // Filter client-side to avoid composite index requirement
        const relevantDocs = snap.docs.filter((d) => d.data().loteId === loteSrc.id);
        // Write in batches of 500 (Firestore limit)
        for (let j = 0; j < relevantDocs.length; j += 500) {
          const wb = writeBatch(db);
          relevantDocs.slice(j, j + 500).forEach((d) =>
            wb.update(d.ref, {
              loteId: loteDst.id,
              updatedAt: now,
              ...(isCrossFinca && { fincaId: loteDst.fincaId, importado: true }),
            })
          );
          await wb.commit();
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al mover animales';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { moverAnimales, loading, error };
}
