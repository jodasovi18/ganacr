import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Lote, Animal, Venta } from '@/types';
import { calcularFinanzasLote, precioRefPorDefecto, FinanzasLote } from '@/utils/finanzas';

/** Calcula finanzas de todos los lotes de la finca (comparativa). */
export function useFinanzasFinca(fincaId: string | null, lotes: Lote[]) {
  const { user } = useAuth();
  const [filas, setFilas] = useState<FinanzasLote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !fincaId || lotes.length === 0) { setFilas([]); setLoading(false); return; }
    let cancel = false;
    setLoading(true);
    (async () => {
      const [animalesSnap, ventasSnap] = await Promise.all([
        getDocs(query(collection(db, 'animales'), where('userId', '==', user.uid), where('fincaId', '==', fincaId))),
        getDocs(query(collection(db, 'ventas'), where('userId', '==', user.uid), where('fincaId', '==', fincaId))),
      ]);
      const animales = animalesSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Animal));
      const ventas = ventasSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Venta));
      const filasCalc = lotes.map((lote) => {
        const aLote = animales.filter((a) => a.loteId === lote.id);
        const vLote = ventas.filter((v) => v.loteId === lote.id);
        const ref = lote.precioReferenciaKg ?? precioRefPorDefecto(vLote);
        return calcularFinanzasLote(lote, aLote, vLote, ref);
      });
      if (!cancel) { setFilas(filasCalc); setLoading(false); }
    })().catch((e) => { console.error('[useFinanzasFinca]', e); if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [user, fincaId, lotes]);

  return { filas, loading };
}
