import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDocs,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { GastoFinca, LoteAplicado, TipoGasto } from '@/types';

// ─── Helper: distribución proporcional ───────────────────────────────────────

function distribuir(
  montoTotal: number,
  lotes: Array<{ animalesActivos: number }>
): number[] {
  if (lotes.length === 0) return [];
  const totalActivos = lotes.reduce((s, l) => s + l.animalesActivos, 0);
  if (totalActivos === 0) {
    const equal = Math.round(montoTotal / lotes.length);
    return lotes.map((_, i) =>
      i === lotes.length - 1
        ? montoTotal - equal * (lotes.length - 1)
        : equal
    );
  }
  return lotes.map((l, i) => {
    if (i === lotes.length - 1) {
      // Last lote absorbs rounding remainder
      const sumaAntes = lotes
        .slice(0, -1)
        .reduce((s, l2) => s + Math.round(montoTotal * l2.animalesActivos / totalActivos), 0);
      return montoTotal - sumaAntes;
    }
    return Math.round(montoTotal * l.animalesActivos / totalActivos);
  });
}

// ─── Listener en tiempo real ─────────────────────────────────────────────────

export function useGastosFinca(fincaId: string | null) {
  const { user } = useAuth();
  const [gastosFinca, setGastosFinca] = useState<GastoFinca[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !fincaId) { setLoading(false); return; }
    const q = query(
      collection(db, 'gastosFinca'),
      where('userId', '==', user.uid),
      where('fincaId', '==', fincaId),
      orderBy('fecha', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setGastosFinca(snap.docs.map((d) => ({ id: d.id, ...d.data() } as GastoFinca)));
        setLoading(false);
      },
      (_err) => { setLoading(false); }
    );
    return unsub;
  }, [user, fincaId]);

  return { gastosFinca, loading };
}

// ─── Crear gasto de finca ────────────────────────────────────────────────────

interface LoteParaDistribuir {
  loteId: string;
  nombreLote: string;
  animalesActivos: number;
}

interface AgregarGastoFincaInput {
  fincaId: string;
  concepto: string;
  tipo: TipoGasto;
  montoTotal: number;
  fecha: string;
  quienPago?: string;
  notas?: string;
  lotesSeleccionados: LoteParaDistribuir[];
}

export function useAgregarGastoFinca() {
  const { user } = useAuth();

  async function agregarGastoFinca(input: AgregarGastoFincaInput): Promise<void> {
    if (!user) throw new Error('No autenticado');

    const { fincaId, concepto, tipo, montoTotal, fecha, quienPago, notas, lotesSeleccionados } = input;
    const now = new Date().toISOString();

    const montosDistribuidos = distribuir(montoTotal, lotesSeleccionados);

    const lotesAplicados: LoteAplicado[] = lotesSeleccionados.map((l, i) => ({
      loteId: l.loteId,
      nombreLote: l.nombreLote,
      animalesActivos: l.animalesActivos,
      monto: montosDistribuidos[i],
    }));

    // Pre-generate parent ref so children can reference its ID
    const padreRef = doc(collection(db, 'gastosFinca'));

    const batch = writeBatch(db);

    // 1× padre
    batch.set(padreRef, {
      userId: user.uid,
      fincaId,
      concepto,
      tipo,
      montoTotal,
      fecha,
      ...(quienPago?.trim() ? { quienPago: quienPago.trim() } : {}),
      ...(notas?.trim() ? { notas: notas.trim() } : {}),
      lotesAplicados,
      createdAt: now,
    });

    // N× hijo + N× increment lote.totalGastos
    for (let i = 0; i < lotesSeleccionados.length; i++) {
      const lote = lotesSeleccionados[i];
      const monto = montosDistribuidos[i];

      const hijoRef = doc(collection(db, 'gastos'));
      batch.set(hijoRef, {
        userId: user.uid,
        fincaId,
        loteId: lote.loteId,
        concepto,
        tipo,
        monto,
        fecha,
        ...(quienPago?.trim() ? { quienPago: quienPago.trim() } : {}),
        ...(notas?.trim() ? { notas: notas.trim() } : {}),
        gastoFincaId: padreRef.id,
        createdAt: now,
      });

      batch.update(doc(db, 'lotes', lote.loteId), {
        totalGastos: increment(monto),
      });
    }

    await batch.commit();
  }

  return { agregarGastoFinca };
}

// ─── Eliminar gasto de finca ─────────────────────────────────────────────────

export function useEliminarGastoFinca() {
  const { user } = useAuth();

  async function eliminarGastoFinca(
    gastoFincaId: string,
    lotesAplicados: LoteAplicado[]
  ): Promise<void> {
    if (!user) throw new Error('No autenticado');

    // Query child gastos
    const q = query(
      collection(db, 'gastos'),
      where('gastoFincaId', '==', gastoFincaId)
    );
    const snap = await getDocs(q);

    const batch = writeBatch(db);

    // 1× delete padre
    batch.delete(doc(db, 'gastosFinca', gastoFincaId));

    // N× delete hijos
    snap.docs.forEach((d) => batch.delete(d.ref));

    // N× decrement lote.totalGastos using lotesAplicados passed by caller (RT listener snapshot)
    for (const la of lotesAplicados) {
      batch.update(doc(db, 'lotes', la.loteId), {
        totalGastos: increment(-la.monto),
      });
    }

    await batch.commit();
  }

  return { eliminarGastoFinca };
}
