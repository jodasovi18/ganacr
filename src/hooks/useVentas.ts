import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  increment,
  writeBatch,
  deleteField,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Venta, ItemVenta, Lote, Gasto } from '@/types';
import { calcularVenta } from '@/utils/calculadora';

export function useVentas(loteId: string | null) {
  const { user } = useAuth();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !loteId) { setLoading(false); return; }
    const q = query(
      collection(db, 'ventas'),
      where('userId', '==', user.uid),
      where('loteId', '==', loteId),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Venta));
        data.sort((a, b) => (b.fecha > a.fecha ? 1 : -1));
        setVentas(data);
        setLoading(false);
      },
      (err) => {
        console.error('[useVentas] Error:', err.code, err.message);
        setLoading(false);
      },
    );
    return unsub;
  }, [user, loteId]);

  return { ventas, loading };
}

interface RegistrarVentaInput {
  fincaId: string;
  lote: Lote;
  animalesVendidos: ItemVenta[];
  fecha: string;
  gastos: Gasto[];
  totalAnimalesEnLote: number;
  notas?: string;
}

export function useRegistrarVenta() {
  const { user } = useAuth();

  async function registrarVenta(input: RegistrarVentaInput): Promise<string> {
    if (!user) throw new Error('No autenticado');
    const now = new Date().toISOString();

    const resultado = calcularVenta(
      input.animalesVendidos,
      input.lote,
      input.gastos,
      input.totalAnimalesEnLote
    );

    const batch = writeBatch(db);

    const ventaRef = doc(collection(db, 'ventas'));
    batch.set(ventaRef, {
      userId: user.uid,
      fincaId: input.fincaId,
      loteId: input.lote.id,
      fecha: input.fecha,
      animales: input.animalesVendidos,
      cantidadAnimales: input.animalesVendidos.length,
      totalInversion: resultado.totalInversion,
      gastosProporcion: resultado.gastosProporcion,
      totalVenta: resultado.totalVenta,
      utilidadBruta: resultado.utilidadBruta,
      utilidadSocio: resultado.utilidadSocio ?? null,
      utilidadPropietario: resultado.utilidadPropietario ?? null,
      notas: input.notas ?? '',
      createdAt: now,
    });

    for (const item of input.animalesVendidos) {
      const animalRef = doc(db, 'animales', item.animalId);
      batch.update(animalRef, {
        estado: 'vendido',
        fechaSalida: input.fecha,
        pesoActual: item.pesoFinal,
        updatedAt: now,
      });
    }

    const loteRef = doc(db, 'lotes', input.lote.id);
    batch.update(loteRef, {
      animalesActivos: increment(-input.animalesVendidos.length),
      animalesVendidos: increment(input.animalesVendidos.length),
      totalVentas: increment(resultado.totalVenta),
      utilidadTotal: increment(resultado.utilidadBruta),
      updatedAt: now,
    });

    await batch.commit();
    return ventaRef.id;
  }

  return { registrarVenta };
}

export function useAnularVenta() {
  const { user } = useAuth();

  async function anularVenta(ventaId: string) {
    if (!user) throw new Error('No autenticado');

    const ventaSnap = await getDoc(doc(db, 'ventas', ventaId));
    if (!ventaSnap.exists()) throw new Error('Venta no encontrada');
    const venta = { id: ventaSnap.id, ...ventaSnap.data() } as Venta;
    if (venta.userId !== user.uid) throw new Error('No autorizado');

    const now = new Date().toISOString();
    const batch = writeBatch(db);

    // Restore each animal to active
    for (const item of venta.animales) {
      batch.update(doc(db, 'animales', item.animalId), {
        estado: 'activo',
        fechaSalida: deleteField(),
        updatedAt: now,
      });
    }

    // Reverse lote counters
    batch.update(doc(db, 'lotes', venta.loteId), {
      animalesActivos: increment(venta.cantidadAnimales),
      animalesVendidos: increment(-venta.cantidadAnimales),
      totalVentas: increment(-venta.totalVenta),
      utilidadTotal: increment(-venta.utilidadBruta),
      updatedAt: now,
    });

    // Delete venta
    batch.delete(doc(db, 'ventas', ventaId));

    await batch.commit();
  }
  return { anularVenta };
}
