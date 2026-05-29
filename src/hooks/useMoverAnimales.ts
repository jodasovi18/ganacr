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

/**
 * Hook para mover animales activos entre lotes (misma finca o fincas distintas).
 * Escribe en dos fases: Fase 1 actualiza animales y contadores de lotes (atómica
 * por chunk); Fase 2 migra el historial de pesos al lote destino.
 * Si la Fase 2 falla, la Fase 1 ya es irrevocable — el animal estará en el nuevo
 * lote y la operación puede reintentarse desde allí.
 */
export function useMoverAnimales() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function moverAnimales(input: MoverAnimalesInput): Promise<void> {
    if (!user) throw new Error('No autenticado');
    const { animales, loteSrc, loteDst, precioKg } = input;

    setLoading(true);
    setError(null);
    try {
      // Validation (moved inside try so errors populate hook.error)
      if (animales.length === 0) throw new Error('No hay animales seleccionados');
      if (precioKg <= 0) throw new Error('El precio por kg debe ser mayor que cero');

      const isCrossFinca = loteSrc.fincaId !== loteDst.fincaId;
      const now = new Date().toISOString();
      let totalPrecioViejoSrc = 0;
      let totalPrecioNuevoDst = 0;

      // Nota: Firestore limita 500 ops/batch → los animales se escriben en chunks de 498.
      // Si el proceso falla a mitad, la Fase 1 no es atómica. En la práctica, las
      // operaciones ganaderas mueven < 100 animales, por lo que esto ocurre en un solo
      // batch y la atomicidad se preserva.
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
        // Write in batches of 498
        for (let j = 0; j < relevantDocs.length; j += 498) {
          const wb = writeBatch(db);
          relevantDocs.slice(j, j + 498).forEach((d) =>
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
