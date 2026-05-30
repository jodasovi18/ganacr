import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Peso } from '@/types';

/**
 * Fetches all pesos for every animal in a lote, ordered by fecha desc.
 * Used by PesosTab for the semáforo list and LoteAvgChart.
 *
 * NOTE: This query uses (loteId + fecha) which requires a composite index.
 * If you see a Firestore "requires an index" error in the console, click the
 * provided link to create the index automatically in Firebase Console.
 */
export function usePesosLote(loteId: string | null) {
  const { user } = useAuth();
  const [pesos, setPesos] = useState<Peso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !loteId) { setLoading(false); return; }
    const q = query(
      collection(db, 'pesos'),
      where('userId', '==', user.uid),
      where('loteId', '==', loteId)
    );
    const unsub = onSnapshot(q, (snap) => {
      setPesos(
        snap.docs
          .map((d) => ({ ...d.data(), id: d.id } as Peso))
          .sort((a, b) => (b.fecha < a.fecha ? -1 : 1))
      );
      setLoading(false);
    }, (err) => {
      console.error('[usePesosLote] onSnapshot error:', err.code, err.message);
      setLoading(false);
    });
    return unsub;
  }, [user, loteId]);

  return { pesos, loading };
}
