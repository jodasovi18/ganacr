import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Escucha en tiempo real los animales ACTIVOS de la finca y deriva cuántos no tienen
 * areteSenasa, en total y por lote. Query con 3 igualdades (sin orderBy) → no requiere
 * índice compuesto. El cache offline sirve estas lecturas localmente.
 */
export function useAnimalesSinArete(fincaId: string | null) {
  const { user } = useAuth();
  const [total, setTotal] = useState(0);
  const [porLote, setPorLote] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !fincaId) { setTotal(0); setPorLote({}); setLoading(false); return; }
    const q = query(
      collection(db, 'animales'),
      where('userId', '==', user.uid),
      where('fincaId', '==', fincaId),
      where('estado', '==', 'activo'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const map: Record<string, number> = {};
      let t = 0;
      snap.docs.forEach((d) => {
        const data = d.data();
        if (!data.areteSenasa) {
          t++;
          map[data.loteId] = (map[data.loteId] || 0) + 1;
        }
      });
      setTotal(t);
      setPorLote(map);
      setLoading(false);
    }, (err) => {
      console.error('[useAnimalesSinArete] onSnapshot error:', err);
      setLoading(false);
    });
    return unsub;
  }, [user, fincaId]);

  return { total, porLote, loading };
}
