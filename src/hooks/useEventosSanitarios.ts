import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { EventoSanitario, TipoEventoSanitario } from '@/types';

// ─── Listener en tiempo real ─────────────────────────────────────────────────

export function useEventosSanitarios(loteId: string | null) {
  const { user } = useAuth();
  const [eventos, setEventos] = useState<EventoSanitario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !loteId) { setLoading(false); return; }
    const q = query(
      collection(db, 'eventosSanitarios'),
      where('userId', '==', user.uid),
      where('loteId', '==', loteId)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setEventos(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as EventoSanitario))
            .sort((a, b) => (b.fecha < a.fecha ? -1 : 1))
        );
        setLoading(false);
      },
      (err) => { console.error('[useEventosSanitarios]', err); setLoading(false); }
    );
    return unsub;
  }, [user, loteId]);

  return { eventos, loading };
}

// ─── Crear evento sanitario ──────────────────────────────────────────────────

interface AgregarEventoInput {
  loteId: string;
  fincaId: string;
  animalId?: string;
  tipo: TipoEventoSanitario;
  nombreProducto: string;
  fecha: string;
  costo: number;
  dosis?: string;
  quienAplico?: string;
  proximaDosis?: string;
  notas?: string;
}

export function useAgregarEventoSanitario() {
  const { user } = useAuth();

  async function agregarEvento(input: AgregarEventoInput): Promise<void> {
    if (!user) throw new Error('No autenticado');
    const now = new Date().toISOString();
    const {
      loteId, fincaId, animalId, tipo, nombreProducto,
      fecha, costo, dosis, quienAplico, proximaDosis, notas,
    } = input;

    const eventoRef = doc(collection(db, 'eventosSanitarios'));
    const gastoRef  = doc(collection(db, 'gastos'));
    const batch = writeBatch(db);

    batch.set(eventoRef, {
      userId: user.uid,
      fincaId,
      loteId,
      ...(animalId ? { animalId } : {}),
      tipo,
      nombreProducto,
      fecha,
      costo,
      ...(dosis?.trim()        ? { dosis: dosis.trim() }               : {}),
      ...(quienAplico?.trim()  ? { quienAplico: quienAplico.trim() }   : {}),
      ...(proximaDosis?.trim() ? { proximaDosis: proximaDosis.trim() }  : {}),
      ...(notas?.trim()        ? { notas: notas.trim() }               : {}),
      gastoId: gastoRef.id,
      createdAt: now,
    });

    batch.set(gastoRef, {
      userId: user.uid,
      fincaId,
      loteId,
      concepto: nombreProducto,
      tipo: 'veterinario',
      monto: costo,
      fecha,
      ...(quienAplico?.trim() ? { quienPago: quienAplico.trim() } : {}),
      eventoSanitarioId: eventoRef.id,
      createdAt: now,
    });

    batch.update(doc(db, 'lotes', loteId), {
      totalGastos: increment(costo),
      updatedAt: now,
    });

    await batch.commit();
  }

  return { agregarEvento };
}

// ─── Eliminar evento sanitario ───────────────────────────────────────────────

export function useEliminarEventoSanitario() {
  const { user } = useAuth();

  async function eliminarEvento(evento: EventoSanitario): Promise<void> {
    if (!user) throw new Error('No autenticado');
    const now = new Date().toISOString();
    const batch = writeBatch(db);

    batch.delete(doc(db, 'eventosSanitarios', evento.id));
    batch.delete(doc(db, 'gastos', evento.gastoId));
    batch.update(doc(db, 'lotes', evento.loteId), {
      totalGastos: increment(-evento.costo),
      updatedAt: now,
    });

    await batch.commit();
  }

  return { eliminarEvento };
}
