import { Animal, Gasto, Lote, ResultadoVenta, ItemVenta } from '@/types';

// ─── Formateo ───────────────────────────────────────────────────────────────

export function formatColones(monto: number): string {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto);
}

export function formatKg(peso: number): string {
  return `${peso.toLocaleString('es-CR')} kg`;
}

export function formatFecha(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('es-CR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ─── Cálculos de venta ──────────────────────────────────────────────────────

/**
 * Calcula utilidad de una venta considerando inversión, gastos proporcionales
 * y división por socio si el lote es "a medias".
 */
export function calcularVenta(
  animalesVendidos: ItemVenta[],
  lote: Lote,
  todosLosGastos: Gasto[],
  totalAnimalesEnLote: number
): ResultadoVenta {
  // 1. Inversión de los animales vendidos
  const totalInversion = animalesVendidos.reduce(
    (sum, a) => sum + a.precioCompra,
    0
  );

  // 2. Gastos proporcionales (por cantidad de animales vendidos)
  const gastosTotal = todosLosGastos.reduce((sum, g) => sum + g.monto, 0);
  const cantidadVendidos = animalesVendidos.length;
  const gastosProporcion =
    totalAnimalesEnLote > 0
      ? (gastosTotal / totalAnimalesEnLote) * cantidadVendidos
      : 0;

  // 3. Total venta
  const totalVenta = animalesVendidos.reduce(
    (sum, a) => sum + a.precioVenta,
    0
  );

  // 4. Utilidad bruta
  const utilidadBruta = totalVenta - totalInversion - gastosProporcion;

  // 5. División si es a medias
  let utilidadSocio: number | undefined;
  let utilidadPropietario: number | undefined;

  if (lote.tipoPropiedad === 'medias' && lote.socio) {
    utilidadSocio = utilidadBruta * (lote.socio.porcentaje / 100);
    utilidadPropietario = utilidadBruta * ((100 - lote.socio.porcentaje) / 100);
  }

  return {
    totalInversion,
    gastosProporcion,
    totalVenta,
    utilidadBruta,
    utilidadSocio,
    utilidadPropietario,
  };
}

// ─── Estadísticas de lote ───────────────────────────────────────────────────

export function calcularGananciaPeso(animal: Animal): number {
  return animal.pesoActual - animal.pesoInicial;
}

export function calcularPrecioKg(animal: Animal): number {
  if (animal.pesoInicial === 0) return 0;
  return animal.precioCompra / animal.pesoInicial;
}

export function sumarGastosPorTipo(gastos: Gasto[]) {
  return gastos.reduce(
    (acc, g) => {
      acc[g.tipo] = (acc[g.tipo] || 0) + g.monto;
      return acc;
    },
    {} as Record<string, number>
  );
}
