import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Finca } from '@/types';

interface FincaContextValue {
  fincas: Finca[];
  fincaActiva: Finca | null;
  setFincaActiva: (finca: Finca) => void;
  loading: boolean;
  necesitaOnboarding: boolean;
}

const FincaContext = createContext<FincaContextValue | null>(null);

export function FincaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [fincaActiva, setFincaActivaState] = useState<Finca | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'fincas'),
      where('userId', '==', user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Finca))
        .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
      setFincas(list);
      setLoading(false);

      if (list.length > 0) {
        const savedId = localStorage.getItem(`ganacr_finca_activa_${user.uid}`);
        const saved = list.find((f) => f.id === savedId);
        setFincaActivaState((prev) => {
          // Only update if prev is null or was removed from the list
          if (prev && list.some((f) => f.id === prev.id)) return prev;
          return saved ?? list[0];
        });
      } else {
        setFincaActivaState(null);
      }
    }, (err) => {
      // Snapshot error (e.g. permission-denied before rules propagate)
      console.error('[FincaContext] onSnapshot error:', err.code, err.message);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  function setFincaActiva(finca: Finca) {
    setFincaActivaState(finca);
    if (user) {
      localStorage.setItem(`ganacr_finca_activa_${user.uid}`, finca.id);
    }
  }

  const necesitaOnboarding = !loading && fincas.length === 0;

  return (
    <FincaContext.Provider value={{ fincas, fincaActiva, setFincaActiva, loading, necesitaOnboarding }}>
      {children}
    </FincaContext.Provider>
  );
}

export function useFinca() {
  const ctx = useContext(FincaContext);
  if (!ctx) throw new Error('useFinca must be used within FincaProvider');
  return ctx;
}
